import { prisma } from "@/lib/prisma";
import { buildPisaoInstructions, routePisaoAgent } from "@/lib/ai/pisao-agents";
import {
  analyzeCommerceRequest,
  buildConversationalProposal,
  deterministicCommerceReply,
  proposalContextForModel,
  type CommerceProduct,
} from "@/lib/ai/conversational-commerce";
import {
  analyzeReservationConversation,
  reservationContextForModel,
  reservationFallbackText,
} from "@/lib/reservas/conversation";
import {
  checkReservationAvailability,
  type ReservationAvailability,
} from "@/lib/reservas/availability";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
import { siteConfig } from "@/lib/site-config";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

type MenuCatalog = {
  products: CommerceProduct[];
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

  for (const product of products.filter((item) => item.disponible)) {
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
        categoriaSlug: category.slug,
      })),
    );

    if (!products.length) throw new Error("Catálogo vacío");

    return {
      products,
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
      context: menuContextFromProducts(products),
      source: "fallback",
    };
  }
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
    const body = (await request.json()) as { messages?: unknown };
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
    const reservationDraft = analyzeReservationConversation(messages);

    let reservationAvailability: ReservationAvailability | null = null;
    let reservationAvailabilityError: string | null = null;

    if (
      reservationDraft?.fecha &&
      reservationDraft.hora &&
      reservationDraft.personas
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
    const proposal =
      !reservationDraft &&
      (agent.id === "ventas" ||
        (agent.id === "anfitrion" && commerceAnalysis.foodIntent))
        ? buildConversationalProposal(catalog.products, commerceAnalysis)
        : null;

    let fallbackText =
      reservationFallbackText(reservationDraft) ??
      deterministicCommerceReply(commerceAnalysis, proposal);

    if (reservationAvailabilityError && reservationDraft?.ready) {
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
            reservationDraft.ready &&
            reservationAvailability?.available === true,
        }
      : null;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({
        text: fallbackText,
        proposal,
        reservation: reservationPayload,
        fallback: true,
        agent: agent.id,
        agentLabel: agent.label,
        menuSource: catalog.source,
      });
    }

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna",
        store: false,
        max_output_tokens: 500,
        instructions: `${buildPisaoInstructions({
          agent,
          menuContext: catalog.context,
          hoursContext,
        })}

COMERCIO CONVERSACIONAL
${proposalContextForModel(proposal)}

RESERVAS TRANSACCIONALES
${reservationContextForModel(reservationDraft)}
${availabilityContext(reservationAvailability, reservationAvailabilityError)}

REGLAS ADICIONALES
- Si hay intención de reserva, prioriza completar la reserva antes de vender comida.
- Nunca afirmes que una reserva fue registrada antes de que el usuario pulse el botón de confirmación y el backend responda exitosamente.
- Cuando el backend responda exitosamente, la reserva queda CONFIRMADA automáticamente; no digas que requiere revisión humana.
- Si la disponibilidad no pudo verificarse, dilo claramente y no prometas cupo.
- Si faltan datos, haz solo la pregunta mínima necesaria.
- Para alergias, intolerancias o veganismo, deriva a validación humana.`,
        input: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    const payload = (await upstream.json()) as OpenAIResponse;

    if (!upstream.ok) {
      console.error("[PISAO AI] OpenAI error", upstream.status, payload.error);
      return Response.json({
        text: fallbackText,
        proposal,
        reservation: reservationPayload,
        fallback: true,
        agent: agent.id,
        agentLabel: agent.label,
        menuSource: catalog.source,
      });
    }

    const modelText = extractOutputText(payload);
    const text = modelText || fallbackText;

    return Response.json({
      text,
      proposal,
      reservation: reservationPayload,
      fallback: !modelText,
      agent: agent.id,
      agentLabel: agent.label,
      menuSource: catalog.source,
    });
  } catch (error) {
    console.error("[PISAO AI] Error inesperado", error);
    return Response.json(
      { error: "Ocurrió un error inesperado. Puedes continuar por WhatsApp." },
      { status: 500 },
    );
  }
}
