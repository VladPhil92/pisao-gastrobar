import { prisma } from "@/lib/prisma";
import { buildPisaoInstructions, routePisaoAgent } from "@/lib/ai/pisao-agents";
import {
  analyzeHospitalityConversation,
  evolveHospitalityProfile,
  hospitalityContextForModel,
  sanitizeHospitalityProfile,
} from "@/lib/ai/hospitality-brain";
import {
  loadPersistentCommerceState,
  loadPersistentHospitalityProfile,
  mergeHospitalityProfiles,
  persistConciergeState,
} from "@/lib/ai/persistent-memory";
import {
  analyzeCommerceRequest,
  buildConversationalProposal,
  deterministicCommerceReply,
  proposalContextForModel,
  type CommerceProduct,
  type ConversationalProposal,
} from "@/lib/ai/conversational-commerce";
import {
  analyzeReservationConversation,
  reservationContextForModel,
  reservationFallbackText,
  type ReservationDraft,
} from "@/lib/reservas/conversation";
import {
  checkReservationAvailability,
  type ReservationAvailability,
} from "@/lib/reservas/availability";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
import { siteConfig } from "@/lib/site-config";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { MAX_AUTOMATIC_RESERVATION_PEOPLE } from "@/lib/reservas/policy";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";
import {
  actionContextForModel,
  buildConciergeAction,
} from "@/lib/ai/action-runtime";
import {
  applyCommerceTool,
  commerceToolContextForModel,
  hydrateCommerceProposal,
  isCommercePlanningTurn,
  serializeCommerceProposal,
} from "@/lib/ai/tool-orchestrator";
import {
  buildNativeToolDefinitions,
  executeNativeToolCall,
  extractNativeToolCalls,
  isExplicitTableMutationIntent,
  type NativeToolOutput,
} from "@/lib/ai/native-tools";
import {
  prepareTransactionCommand,
  type PreparedTransactionCommand,
} from "@/lib/ai/transaction-command-bus";
import { captureServerError } from "@/lib/observability/sentry-transport";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { getActiveRevenuePlaybook } from "@/lib/revenue/revenue-action-engine";
import { getConciergeExperimentContext } from "@/lib/revenue/revenue-experiment-engine";
import { getAdaptiveRevenueContext } from "@/lib/revenue/revenue-policy-engine";
import { buildContextualCommerceGuidance } from "@/lib/revenue/contextual-commerce-core";
import { getContextualProductLearning } from "@/lib/revenue/contextual-learning";
import { lookupOrderStatusForCustomer } from "@/lib/orders/customer-status";
import { getAuthenticatedConciergeLifecycleContext } from "@/lib/crm/concierge-context";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenAIOutputItem = {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  [key: string]: unknown;
};

type OpenAIResponse = {
  output?: OpenAIOutputItem[];
  error?: { message?: string };
};

type MenuCatalog = {
  products: CommerceProduct[];
  costByProductId: Record<string, number | null>;
  context: string;
  source: "database" | "fallback";
};

function extractOutputText(payload: OpenAIResponse) {
  for (const item of payload.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) return part.text.trim();
    }
  }
  return "";
}

async function requestOpenAI(params: {
  apiKey: string;
  clientRequestId: string;
  model: string;
  instructions: string;
  input: unknown[];
  tools: Array<Record<string, unknown>>;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Request-Id": params.clientRequestId,
    },
    body: JSON.stringify({
      model: params.model,
      store: false,
      max_output_tokens: 500,
      instructions: params.instructions,
      input: params.input,
      tools: params.tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as OpenAIResponse;
  return { response, payload };
}

function sanitizeMessages(value: unknown): ClientMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ClientMessage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<ClientMessage>;
      return (
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string" &&
        candidate.content.trim().length > 0
      );
    })
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1600),
    }));
}

function menuContextFromProducts(products: CommerceProduct[]) {
  const byCategory = new Map<string, CommerceProduct[]>();

  for (const product of products.filter(
    (item) => item.disponible && item.inventarioBajo !== true,
  )) {
    const category = product.categoriaSlug ?? "otros";
    const entries = byCategory.get(category) ?? [];
    entries.push(product);
    byCategory.set(category, entries);
  }

  return [...byCategory.entries()]
    .map(([category, entries]) => {
      const lines = entries
        .map(
          (product) =>
            `- ${product.nombre}: $${Number(product.precio).toLocaleString("es-CO")} COP. ${product.descripcion ?? ""}`.trim(),
        )
        .join("\n");
      return `${category}\n${lines}`;
    })
    .join("\n\n")
    .slice(0, 14000);
}

async function getMenuCatalog(): Promise<MenuCatalog> {
  try {
    const categories = await prisma.categoria.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        productos: {
          orderBy: [{ destacado: "desc" }, { orden: "asc" }, { nombre: "asc" }],
        },
      },
    });

    const products: CommerceProduct[] = categories.flatMap((category) =>
      category.productos.map((product) => ({
        id: product.id,
        nombre: product.nombre,
        slug: product.slug,
        descripcion: product.descripcion,
        precio: Number(product.precio),
        imagenUrl: product.imagenUrl,
        disponible: product.disponible,
        inventarioBajo:
          product.inventarioBajo || product.inventarioBajoReceta,
        categoriaSlug: category.slug,
      })),
    );

    const costByProductId: Record<string, number | null> = Object.fromEntries(
      categories.flatMap((category) =>
        category.productos.map((product) => [
          product.id,
          product.costoUnitario === null ? null : Number(product.costoUnitario),
        ]),
      ),
    );

    if (!products.length) throw new Error("Catálogo vacío");

    return {
      products,
      costByProductId,
      context: menuContextFromProducts(products),
      source: "database",
    };
  } catch (error) {
    console.error("[PISAO AI] Catálogo dinámico degradado; usando carta verificada", error);
    const products: CommerceProduct[] = productosPlaceholder.map((product) => ({
      ...product,
    }));

    return {
      products,
      costByProductId: {},
      context: menuContextFromProducts(products),
      source: "fallback",
    };
  }
}

async function prepareClientCommands(params: {
  sessionKey: unknown;
  proposal: ConversationalProposal | null;
  reservation: {
    draft: ReservationDraft;
    canSubmit: boolean;
  } | null;
}) {
  const commands: PreparedTransactionCommand[] = [];

  if (params.proposal) {
    const command = await prepareTransactionCommand({
      sessionKey: params.sessionKey,
      type: "cart.commit",
      payload: {
        proposalId: params.proposal.id,
        items: params.proposal.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      },
    });

    if (command) {
      commands.push(command);
      void emitKevGovernanceEvent("pisao.concierge.command_prepared", {
        source: "concierge_api",
        command: command.type,
        contains_pii: false,
      });
    }
  }

  const draft = params.reservation?.draft;
  if (
    params.reservation?.canSubmit &&
    draft?.nombre &&
    draft.telefono &&
    draft.fecha &&
    draft.hora &&
    draft.personas
  ) {
    const command = await prepareTransactionCommand({
      sessionKey: params.sessionKey,
      type: "reservation.commit",
      payload: {
        nombre: draft.nombre,
        telefono: draft.telefono,
        email: draft.email ?? "",
        fecha: draft.fecha,
        hora: draft.hora,
        personas: draft.personas,
        notas: draft.notas,
      },
      containsPii: true,
    });

    if (command) {
      commands.push(command);
      void emitKevGovernanceEvent("pisao.concierge.command_prepared", {
        source: "concierge_api",
        command: command.type,
        contains_pii: true,
      });
    }
  }

  return commands;
}

function availabilityContext(
  availability: ReservationAvailability | null,
  error: string | null,
) {
  if (error) return `Disponibilidad: no verificable. Motivo: ${error}`;
  if (!availability) {
    return "Disponibilidad: pendiente de contar con fecha, hora y personas.";
  }

  return availability.available
    ? `Disponibilidad: hay capacidad para ${availability.personas} personas a las ${availability.hora}. La combinación óptima prevista es ${availability.recommendedTables.join(" + ") || "una mesa disponible"}; se requieren ${availability.tablesNeeded} mesa(s), quedan ${availability.tablesRemaining} mesa(s) reservables libres y ${availability.remaining} cupos de comensales en la ventana.`
    : `Disponibilidad: no hay una combinación válida de mesas reservables para ${availability.personas} personas a las ${availability.hora}. Se requieren ${availability.tablesNeeded} mesa(s) y quedan ${availability.tablesRemaining}. Alternativas: ${availability.alternatives.join(", ") || "sin alternativas calculadas"}.`;
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const startedAt = Date.now();
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `concierge:${identity}`,
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return Response.json(
      { error: "Has enviado demasiados mensajes. Intenta nuevamente en unos minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = (await request.json()) as {
      messages?: unknown;
      guestProfile?: unknown;
      guestKey?: unknown;
      sessionKey?: unknown;
      behaviorSessionId?: unknown;
    };
    const messages = sanitizeMessages(body.messages);
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json({ error: "Mensaje inválido." }, { status: 400 });
    }

    const userTranscript = messages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n");

    // Se enruta con todo el contexto del usuario, no solo con el último turno.
    const agent = routePisaoAgent(userTranscript);
    const clientHospitalityProfile = sanitizeHospitalityProfile(
      body.guestProfile,
    );
    const persistentHospitalityProfile =
      await loadPersistentHospitalityProfile(body.guestKey);
    const incomingHospitalityProfile = mergeHospitalityProfiles(
      persistentHospitalityProfile,
      clientHospitalityProfile,
    );
    const hospitalityAnalysis = analyzeHospitalityConversation(
      messages,
      incomingHospitalityProfile,
    );
    const hospitalityProfile = evolveHospitalityProfile(
      incomingHospitalityProfile,
      hospitalityAnalysis,
    );
    const reservationDraft = analyzeReservationConversation(messages);

    let reservationAvailability: ReservationAvailability | null = null;
    let reservationAvailabilityError: string | null = null;
    const oversizedGroup =
      (reservationDraft?.personas ?? 0) > MAX_AUTOMATIC_RESERVATION_PEOPLE;

    if (
      reservationDraft?.fecha &&
      reservationDraft.hora &&
      reservationDraft.personas &&
      !oversizedGroup
    ) {
      try {
        reservationAvailability = await checkReservationAvailability({
          fecha: reservationDraft.fecha,
          hora: reservationDraft.hora,
          personas: reservationDraft.personas,
        });
      } catch (error) {
        reservationAvailabilityError =
          error instanceof Error
            ? error.message
            : "No fue posible consultar disponibilidad.";
      }
    }

    const catalog = await getMenuCatalog();
    const commerceAnalysis = analyzeCommerceRequest(userTranscript);
    const persistentCommerceState = await loadPersistentCommerceState(
      body.sessionKey,
    );
    const restoredProposal = hydrateCommerceProposal(
      persistentCommerceState,
      catalog.products,
    );
    const commerceTool = applyCommerceTool({
      latestUserMessage: latestUserMessage.content,
      activeProposal: restoredProposal,
      products: catalog.products,
    });

    let activeProposal = commerceTool.proposal;
    let proposalForDisplay = commerceTool.handled
      ? commerceTool.proposal
      : null;

    if (
      !commerceTool.handled &&
      !reservationDraft &&
      isCommercePlanningTurn(latestUserMessage.content)
    ) {
      const freshProposal = buildConversationalProposal(
        catalog.products,
        commerceAnalysis,
      );
      if (freshProposal) {
        activeProposal = freshProposal;
        proposalForDisplay = freshProposal;
      }
    }

    if (commerceTool.handled && commerceTool.tool) {
      void emitKevGovernanceEvent("pisao.concierge.tool_executed", {
        source: "concierge_api",
        tool: commerceTool.tool,
        agent: agent.id,
        active_items: activeProposal?.items.length ?? 0,
      });
    }

    let fallbackText =
      commerceTool.summary ??
      reservationFallbackText(reservationDraft) ??
      deterministicCommerceReply(commerceAnalysis, activeProposal);

    if (!commerceTool.handled) {
      if (oversizedGroup && reservationDraft?.personas) {
        fallbackText =
          `Para ${reservationDraft.personas} personas necesitamos una distribución especial. La reserva automática une como máximo 3 mesas y admite hasta ${MAX_AUTOMATIC_RESERVATION_PEOPLE} personas en una sola mesa grupal. Podemos coordinar el grupo por WhatsApp.`;
      } else if (reservationAvailabilityError && reservationDraft?.ready) {
        fallbackText =
          "Ya tengo tus datos, pero no puedo verificar el cupo del restaurante en este momento. No registraré una reserva a ciegas; puedes intentar nuevamente o continuar por WhatsApp.";
      } else if (
        reservationAvailability &&
        !reservationAvailability.available &&
        reservationDraft
      ) {
        const alternatives = reservationAvailability.alternatives.length
          ? ` Puedo revisar estas horas cercanas: ${reservationAvailability.alternatives.join(", ")}.`
          : "";
        fallbackText = `La franja de ${reservationDraft.hora} no tiene capacidad suficiente para ${reservationDraft.personas} personas.${alternatives}`;
      } else if (
        reservationAvailability?.available &&
        reservationDraft?.ready
      ) {
        fallbackText =
          "Hay capacidad para la franja solicitada y ya tengo los datos mínimos. Revisa la tarjeta debajo y pulsa “Confirmar reserva”. El calendario volverá a validar la ventana completa de ocupación y, si sigue disponible, la reserva quedará confirmada al instante.";
      }
    }

    const hoursContext = [
      `${siteConfig.location.label}. ${siteConfig.location.address}`,
      ...siteConfig.hours.map(({ dia, horario }) => `${dia}: ${horario}`),
      `WhatsApp: ${siteConfig.contact.phone}`,
    ].join("\n");

    const reservationPayload = reservationDraft
      ? {
          draft: reservationDraft,
          availability: reservationAvailability,
          availabilityError: reservationAvailabilityError,
          canSubmit:
            !oversizedGroup &&
            reservationDraft.ready &&
            reservationAvailability?.available === true,
        }
      : null;

    const action = buildConciergeAction({
      latestUserMessage: latestUserMessage.content,
      proposal: activeProposal,
      reservation: reservationPayload,
      requiresHumanValidation: commerceAnalysis.requiresHumanValidation,
      oversizedGroup,
      availabilityError: reservationAvailabilityError,
    });

    if (action) {
      void emitKevGovernanceEvent("pisao.concierge.action_planned", {
        source: "concierge_api",
        action: action.type,
        execution: action.execution,
        agent: agent.id,
      });

      if (action.type === "cart.add_proposal") {
        fallbackText =
          "La propuesta está lista. Pulsa “Confirmar en Mesa Visual” para autorizar que la agreguemos y puedas revisarla antes del checkout.";
      } else if (action.type === "reservation.confirm") {
        fallbackText =
          "La reserva está lista y el cupo fue validado. Pulsa “Confirmar reserva” para autorizar el registro definitivo; el backend volverá a comprobar la capacidad antes de guardarla.";
      } else if (action.type === "human.handoff") {
        fallbackText =
          "Claro. Esta solicitud necesita atención del equipo; te dejo el acceso directo para continuar con una persona.";
      }
    }

    let responseProposal =
      proposalForDisplay ??
      (action?.type === "cart.add_proposal" ? activeProposal : null);

    const aiModel = process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna";
    const reservationIntent = Boolean(reservationDraft);
    const availabilityState = reservationAvailabilityError
      ? "error"
      : reservationAvailability
        ? reservationAvailability.available
          ? "available"
          : "unavailable"
        : "unknown";
    const hospitalityGovernance = {
      guest_state: hospitalityAnalysis.guestState,
      visit_stage: hospitalityAnalysis.visitStage,
      conversation_style: hospitalityAnalysis.conversationStyle,
      hospitality_intent: hospitalityAnalysis.intent,
      response_mode: hospitalityAnalysis.responseMode,
      remembered_food_signals: hospitalityProfile.preferredFoodSignals.length,
      remembered_drink_signals: hospitalityProfile.preferredDrinkSignals.length,
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      void emitKevGovernanceEvent("pisao.concierge.fallback", {
        source: "concierge_api",
        mode: "fallback",
        model: aiModel,
        reservation_intent: reservationIntent,
        availability: availabilityState,
        message_count: messages.length,
        outcome: "openai_unconfigured",
        ...hospitalityGovernance,
      });

      await persistConciergeState({
        guestKey: body.guestKey,
        sessionKey: body.sessionKey,
        profile: hospitalityProfile,
        analysis: hospitalityAnalysis,
        agent: agent.id,
        model: aiModel,
        outcome: "openai_unconfigured",
        fallback: true,
        latencyMs: Date.now() - startedAt,
        reservationIntent,
        proposalCreated: Boolean(activeProposal),
        messageCount: messages.length,
        commerceState: activeProposal
          ? serializeCommerceProposal(activeProposal)
          : undefined,
        lastTool: commerceTool.tool,
      });

      const commands = await prepareClientCommands({
        sessionKey: body.sessionKey,
        proposal: responseProposal,
        reservation: reservationPayload,
      });

      return Response.json({
        text: fallbackText,
        proposal: responseProposal,
        reservation: reservationPayload,
        action,
        commands,
        fallback: true,
        agent: agent.id,
        agentLabel: agent.label,
        menuSource: catalog.source,
        hospitality: {
          analysis: hospitalityAnalysis,
          profile: hospitalityProfile,
        },
      });
    }

    const experimentContext = await getConciergeExperimentContext({
      behaviorSessionId: body.behaviorSessionId,
      latestUserMessage: latestUserMessage.content,
    });

    const [
      revenuePlaybook,
      adaptiveRevenueContext,
      lifecycleContext,
      contextualLearningSignals,
    ] = await Promise.all([
      getActiveRevenuePlaybook(),
      getAdaptiveRevenueContext({
        behaviorSessionId: body.behaviorSessionId,
        latestUserMessage: latestUserMessage.content,
        suppress: experimentContext.experiment?.eligible === true,
      }),
      getAuthenticatedConciergeLifecycleContext(),
      getContextualProductLearning(catalog.products.map((product) => product.slug)),
    ]);

    if (experimentContext.experiment) {
      void emitKevGovernanceEvent("pisao.revenue.experiment_assigned", {
        source: "concierge_api",
        experiment_ref: experimentContext.experiment.key,
        arm: experimentContext.experiment.arm,
        eligible: experimentContext.experiment.eligible,
        exposed: experimentContext.experiment.exposed,
        next_best_action:
          experimentContext.experiment.nextBestAction?.type ?? "NONE",
      });
    }

    if (adaptiveRevenueContext.policy) {
      void emitKevGovernanceEvent("pisao.revenue.policy_assigned", {
        source: "concierge_api",
        policy_ref: adaptiveRevenueContext.policy.key,
        arm: adaptiveRevenueContext.policy.arm,
        served: adaptiveRevenueContext.policy.served,
      });
    }

    void emitKevGovernanceEvent("pisao.concierge.lifecycle_context", {
      source: "concierge_api",
      version: lifecycleContext.version,
      mode: lifecycleContext.mode,
      contains_pii: false,
      outbound_authorized: false,
    });

    const contextualCommerce = buildContextualCommerceGuidance({
      latestUserMessage: latestUserMessage.content,
      lifecycleMode: lifecycleContext.mode,
      favorites: lifecycleContext.signals.favorites,
      products: catalog.products.map((product) => ({
        id: product.id,
        name: product.nombre,
        slug: product.slug,
        description: product.descripcion ?? undefined,
        category: product.categoriaSlug,
        price: Number(product.precio),
        cost: catalog.costByProductId[product.id] ?? null,
        available: product.disponible,
        lowInventory: product.inventarioBajo,
      })),
      activeProposalProductIds:
        activeProposal?.items.map((item) => item.product.id) ?? [],
      activeProposalCategories:
        activeProposal?.items
          .map((item) => item.product.categoriaSlug)
          .filter((value): value is string => Boolean(value)) ?? [],
      reservationIntent,
      requiresHumanValidation: commerceAnalysis.requiresHumanValidation,
      vegetarian: commerceAnalysis.vegetarian,
      noSpicy: commerceAnalysis.noSpicy,
      drinkPreference: commerceAnalysis.drinkPreference,
      maxSuggestedUnitPrice:
        commerceAnalysis.budgetPerPerson ??
        (commerceAnalysis.budgetTotal
          ? commerceAnalysis.diners
            ? Math.floor(
                commerceAnalysis.budgetTotal / commerceAnalysis.diners,
              )
            : commerceAnalysis.budgetTotal
          : undefined),
      experimentEligible: experimentContext.experiment?.eligible === true,
      adaptivePolicyRelevant: Boolean(adaptiveRevenueContext.policy),
      learningSignals: contextualLearningSignals.map((signal) => ({
        productSlug: signal.productSlug,
        exposures: signal.exposures,
        accepted: signal.accepted,
        addRatePct: signal.addRatePct,
        matchedPaidOrders: signal.matchedPaidOrders,
        paidMatchRatePct: signal.paidMatchRatePct,
      })),
    });

    void emitKevGovernanceEvent("pisao.concierge.next_best_action", {
      source: "concierge_api",
      version: contextualCommerce.version,
      status: contextualCommerce.status,
      action: contextualCommerce.action?.type ?? "NONE",
      product_slug: contextualCommerce.action?.productSlug ?? null,
      suppression_reason: contextualCommerce.suppressionReason,
      contains_pii: false,
      mutates_cart: false,
      autonomous_discount: false,
      closed_loop_applied: contextualCommerce.action?.learning.applied ?? false,
      closed_loop_adjustment:
        contextualCommerce.action?.learning.adjustment ?? 0,
      closed_loop_exposures:
        contextualCommerce.action?.learning.exposures ?? 0,
    });

    const recommendedProduct = contextualCommerce.action
      ? catalog.products.find(
          (product) => product.id === contextualCommerce.action?.productId,
        )
      : null;
    const contextualRecommendation =
      contextualCommerce.status === "READY" && recommendedProduct
        ? {
            id: crypto.randomUUID(),
            version: contextualCommerce.version,
            product: {
              productoId: recommendedProduct.id,
              nombre: recommendedProduct.nombre,
              slug: recommendedProduct.slug,
              precio: Number(recommendedProduct.precio),
              imagenUrl: recommendedProduct.imagenUrl ?? null,
              categoriaSlug: recommendedProduct.categoriaSlug ?? null,
            },
          }
        : null;

    const clientRequestId = crypto.randomUUID();
    const nativeTools = buildNativeToolDefinitions({
      allowTableMutation:
        Boolean(activeProposal) &&
        !commerceTool.handled &&
        isExplicitTableMutationIntent(latestUserMessage.content),
    });
    const openAIInstructions = `${buildPisaoInstructions({
      agent,
      menuContext: catalog.context,
      hoursContext,
    })}

COMERCIO CONVERSACIONAL
${proposalContextForModel(activeProposal)}

${commerceToolContextForModel(commerceTool)}

RESERVAS TRANSACCIONALES
${reservationContextForModel(reservationDraft)}
${availabilityContext(reservationAvailability, reservationAvailabilityError)}

HOSPITALITY INTELLIGENCE
${hospitalityContextForModel(hospitalityAnalysis, hospitalityProfile)}

AUTHENTICATED CUSTOMER PERSONALIZATION
${lifecycleContext.context}
- Este contexto solo puede mejorar relevancia dentro de la sesión iniciada por el cliente.
- No puede sobreescribir disponibilidad, precios, restricciones, decisiones de experimento ni reglas comerciales aprobadas.

CONTEXTUAL COMMERCE V20
${contextualCommerce.context}
- Esta capa selecciona como máximo una sugerencia opcional y nunca ejecuta una mutación.
- READY autoriza únicamente mencionar la opción elegida si encaja de forma natural con la respuesta.
- NO_ACTION significa que V18 no añade ninguna recomendación; otras reglas comerciales aprobadas siguen su propia gobernanza.
- SUPPRESSED significa que V18 debe permanecer silenciosa para no interferir con reserva, seguridad o una capa controlada de revenue.

REVENUE PLAYBOOK APROBADO
${revenuePlaybook}
- Estas reglas provienen de acciones comerciales aprobadas por administración y de evidencia transaccional observada.
- Úsalas solo cuando sean relevantes para la intención del visitante.
- No fuerces cross-sell, no inventes promociones y no presentes la correlación histórica como causalidad.

EXPERIMENTACIÓN Y NEXT BEST ACTION
${experimentContext.instructions}
- La asignación CONTROL/TREATMENT la resuelve el servidor y debe respetarse exactamente.
- No reveles al visitante que está en un experimento ni menciones grupos de prueba.
- Una NEXT BEST ACTION es una sugerencia contextual, no una autorización para modificar precio, descuento, inventario o política.

ADAPTIVE REVENUE OPTIMIZATION
${adaptiveRevenueContext.instructions}
- SERVE/HOLDOUT lo decide exclusivamente el servidor y debe respetarse.
- El holdout de seguridad no debe recibir la combinación adaptativa.
- Si una prueba V3 elegible está activa, esa prueba tiene precedencia y la política adaptativa se suprime para evitar contaminación.
- Nunca conviertas una política adaptativa en descuento, cambio de precio, disponibilidad, urgencia o afirmación causal.

${actionContextForModel(action)}

NATIVE TOOL CALLING
- Usa search_menu para confirmar productos concretos cuando la solicitud lo requiera.
- Usa get_active_table cuando necesites consultar la mesa activa antes de responder.
- Usa check_reservation_availability para consultar cupo real; nunca la confundas con crear una reserva.
- Usa get_order_status cuando el cliente pregunte por un pedido y haya proporcionado número de pedido y teléfono. Si falta alguno, pídeselo; no inventes ni reveles pedidos.
- modify_active_table solo estará disponible cuando el último mensaje contenga una orden explícita de edición.
- Una herramienta puede devolver error o denegar una mutación. Respeta siempre ese resultado.
- No afirmes que una acción de carrito, reserva o pago fue ejecutada si no existe confirmación de la aplicación.

REGLAS ADICIONALES
- Si hay intención de reserva, prioriza completar la reserva antes de vender comida.
- Nunca afirmes que una reserva fue registrada antes de que el usuario pulse el botón de confirmación y el backend responda exitosamente.
- Cuando el backend responda exitosamente, la reserva queda CONFIRMADA automáticamente; no digas que requiere revisión humana.
- Si la disponibilidad no pudo verificarse, dilo claramente y no prometas cupo.
- La reserva automática admite como máximo ${MAX_AUTOMATIC_RESERVATION_PEOPLE} personas porque solo pueden unirse hasta 3 mesas. Para grupos mayores, indica que requieren coordinación especial por WhatsApp.
- Si faltan datos, haz solo la pregunta mínima necesaria.
- Para alergias, intolerancias o veganismo, deriva a validación humana.`;

    const baseInput = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    let responseInput: unknown[] = [...baseInput];
    let finalPayload: OpenAIResponse | null = null;
    let nativeToolFailure = false;
    let lastToolName: string | null = commerceTool.tool;
    let nativeToolCount = 0;

    for (let round = 0; round < 3; round += 1) {
      const { response: upstream, payload } = await requestOpenAI({
        apiKey,
        clientRequestId,
        model: aiModel,
        instructions: openAIInstructions,
        input: responseInput,
        tools: nativeTools,
      });

      if (!upstream.ok) {
        void captureServerError(
          new Error(payload.error?.message || `OpenAI HTTP ${upstream.status}`),
          {
            surface: "concierge_api",
            provider: "openai",
            status: upstream.status,
            round,
          },
        );
        nativeToolFailure = true;

        void emitKevGovernanceEvent("pisao.concierge.provider_error", {
          source: "concierge_api",
          mode: "openai",
          model: aiModel,
          reservation_intent: reservationIntent,
          availability: availabilityState,
          message_count: messages.length,
          outcome: round === 0 ? "fallback_served" : "tool_loop_failed",
          error_code: String(upstream.status),
          ...hospitalityGovernance,
        });
        break;
      }

      finalPayload = payload;
      const calls = extractNativeToolCalls(payload);
      if (!calls.length) break;
      if (round === 2) {
        nativeToolFailure = true;
        console.warn("[PISAO AI] Native tool loop reached safety cap", {
          clientRequestId,
          calls: calls.length,
        });
        break;
      }

      const outputs: NativeToolOutput[] = [];
      for (const call of calls) {
        const execution = await executeNativeToolCall({
          call,
          products: catalog.products,
          activeProposal,
          latestUserMessage: latestUserMessage.content,
          checkAvailability: checkReservationAvailability,
          lookupOrderStatus: lookupOrderStatusForCustomer,
        });

        nativeToolCount += 1;
        lastToolName = execution.toolName;

        if (execution.commerceProposal !== undefined) {
          activeProposal = execution.commerceProposal;
        }
        if (execution.commerceMutated) {
          proposalForDisplay = activeProposal;
          responseProposal = activeProposal;
          if (execution.summary) fallbackText = execution.summary;
        }

        void emitKevGovernanceEvent("pisao.concierge.tool_executed", {
          source: "concierge_api",
          tool: execution.toolName,
          native: true,
          round,
          agent: agent.id,
          active_items: activeProposal?.items.length ?? 0,
        });

        outputs.push(execution.output);
      }

      responseInput = [
        ...responseInput,
        ...(payload.output ?? []),
        ...outputs,
      ];
    }

    const modelText = finalPayload ? extractOutputText(finalPayload) : "";
    const text = modelText || fallbackText;

    void emitKevGovernanceEvent(
      modelText ? "pisao.concierge.completed" : "pisao.concierge.fallback",
      {
        source: "concierge_api",
        mode: modelText ? "openai" : "fallback",
        model: aiModel,
        reservation_intent: reservationIntent,
        availability: availabilityState,
        message_count: messages.length,
        outcome: nativeToolFailure
          ? "tool_loop_failed"
          : modelText
            ? "model_response"
            : "empty_model_response",
        native_tool_count: nativeToolCount,
        ...hospitalityGovernance,
      },
    );

    await persistConciergeState({
      guestKey: body.guestKey,
      sessionKey: body.sessionKey,
      profile: hospitalityProfile,
      analysis: hospitalityAnalysis,
      agent: agent.id,
      model: aiModel,
      outcome: nativeToolFailure
        ? "tool_loop_failed"
        : modelText
          ? "model_response"
          : "empty_model_response",
      fallback: !modelText,
      latencyMs: Date.now() - startedAt,
      reservationIntent,
      proposalCreated: Boolean(activeProposal),
      messageCount: messages.length,
      commerceState: activeProposal
        ? serializeCommerceProposal(activeProposal)
        : undefined,
      lastTool: lastToolName,
    });

    const commands = await prepareClientCommands({
      sessionKey: body.sessionKey,
      proposal: responseProposal,
      reservation: reservationPayload,
    });

    return Response.json({
      text,
      proposal: responseProposal,
      reservation: reservationPayload,
      action,
      contextualRecommendation,
      commands,
      fallback: !modelText,
      agent: agent.id,
      agentLabel: agent.label,
      menuSource: catalog.source,
      hospitality: {
        analysis: hospitalityAnalysis,
        profile: hospitalityProfile,
      },
    });
  } catch (error) {
    void captureServerError(error, {
      surface: "concierge_api",
      code: "REQUEST_FAILED",
    });

    void emitKevGovernanceEvent("pisao.concierge.provider_error", {
      source: "concierge_api",
      mode: process.env.OPENAI_API_KEY ? "openai" : "fallback",
      model: process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna",
      reservation_intent: false,
      availability: "unknown",
      message_count: 0,
      outcome: "request_failed",
      error_code: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "Ocurrió un error inesperado. Puedes continuar por WhatsApp." },
      { status: 500 },
    );
  }
}
