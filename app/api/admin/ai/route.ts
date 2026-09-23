import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

type AdminAgentId = "gerencia" | "ventas" | "menu" | "contenido";
type ClientMessage = { role: "user" | "assistant"; content: string };

type OpenAIResponse = {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const agents: Record<AdminAgentId, { label: string; mission: string }> = {
  gerencia: {
    label: "Gerencia IA",
    mission:
      "Analiza el negocio como gerente de restaurante: detecta prioridades, riesgos operativos, oportunidades comerciales y próximos pasos medibles.",
  },
  ventas: {
    label: "Revenue IA",
    mission:
      "Busca aumentar conversión, ticket promedio y repetición de compra usando únicamente los datos internos suministrados.",
  },
  menu: {
    label: "Menu Intelligence",
    mission:
      "Evalúa disponibilidad, mezcla de productos, demanda observable y oportunidades de destacar o revisar productos. No cambia precios ni disponibilidad por sí solo.",
  },
  contenido: {
    label: "Growth & Content IA",
    mission:
      "Convierte datos y productos reales de PISÁO en ideas de campañas, contenidos y mensajes comerciales. No inventa promociones vigentes ni publica contenido automáticamente.",
  },
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
      content: message.content.trim().slice(0, 2500),
    }));
}

function jsonRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function colombiaMidnightUtc(daysAgo = 0) {
  const now = new Date();
  const colombia = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const localMidnight = Date.UTC(
    colombia.getUTCFullYear(),
    colombia.getUTCMonth(),
    colombia.getUTCDate() - daysAgo,
    5,
    0,
    0,
    0,
  );
  return new Date(localMidnight);
}

async function getBusinessContext() {
  const since30Days = colombiaMidnightUtc(30);
  const today = colombiaMidnightUtc(0);

  const [
    orders,
    reservations,
    categories,
    aiRuns,
    transactionCommands,
    revenueActions,
    revenueExperiments,
    revenuePolicies,
    inventoryIngredients,
    recipeLinks,
  ] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: since30Days } },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        pago: { select: { estado: true, metodo: true } },
        attribution: {
          select: {
            assists: true,
            lastAssist: true,
            touchCount: true,
          },
        },
        items: {
          include: { producto: true },
        },
      },
    }),
    prisma.reserva.findMany({
      where: { fecha: { gte: today } },
      orderBy: { fecha: "asc" },
      take: 80,
    }),
    prisma.categoria.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        productos: {
          orderBy: [{ destacado: "desc" }, { orden: "asc" }, { nombre: "asc" }],
        },
      },
    }),
    prisma.aiConciergeRun.findMany({
      where: { createdAt: { gte: since30Days } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.aiTransactionCommand.findMany({
      where: { createdAt: { gte: since30Days } },
      select: {
        type: true,
        status: true,
        containsPii: true,
        createdAt: true,
        executedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.revenueAction.findMany({
      where: { createdAt: { gte: since30Days } },
      select: {
        type: true,
        status: true,
        title: true,
        priorityScore: true,
        riskLevel: true,
        executedAt: true,
        measuredAt: true,
      },
      orderBy: [{ status: "asc" }, { priorityScore: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    prisma.revenueExperiment.findMany({
      where: {
        OR: [
          { createdAt: { gte: since30Days } },
          { status: { in: ["RUNNING", "PAUSED"] } },
        ],
      },
      select: {
        status: true,
        primaryMetric: true,
        result: true,
        action: { select: { title: true } },
        assignments: { select: { arm: true, exposedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.revenuePolicy.findMany({
      where: {
        OR: [
          { createdAt: { gte: since30Days } },
          { status: { in: ["ACTIVE", "PAUSED"] } },
        ],
      },
      select: {
        status: true,
        trafficPct: true,
        priorityScore: true,
        rollbackReason: true,
        outcome: true,
        action: { select: { title: true } },
        assignments: { select: { arm: true, servedAt: true } },
      },
      orderBy: [{ status: "asc" }, { priorityScore: "desc" }],
      take: 12,
    }),
    prisma.inventarioInsumo.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        unidadBase: true,
        stockActual: true,
        stockMinimo: true,
        costoUnidadBase: true,
      },
    }),
    prisma.recetaInsumo.findMany({
      select: { productoId: true },
    }),
  ]);

  const validOrders = orders.filter((order) => order.estado !== "CANCELADO");
  const paidOrders = validOrders.filter((order) => order.pago?.estado === "APROBADO");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const todayOrders = paidOrders.filter((order) => order.createdAt >= today);
  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const trackedPaidOrders = paidOrders.filter((order) => order.attribution);
  const assistedPaidOrders = trackedPaidOrders.filter(
    (order) => (order.attribution?.assists.length ?? 0) > 0,
  );
  const assistedRevenue = assistedPaidOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const conciergeRevenue = assistedPaidOrders
    .filter((order) => order.attribution?.assists.includes("CONCIERGE"))
    .reduce((sum, order) => sum + Number(order.total), 0);
  const attributionCoverage = paidOrders.length
    ? Math.round((trackedPaidOrders.length / paidOrders.length) * 100)
    : 0;

  const catalogProducts = categories.flatMap((category) => category.productos);
  const costConfiguredProducts = catalogProducts.filter(
    (product) => product.costoUnitario !== null,
  );
  const costCoveragePct = catalogProducts.length
    ? Math.round((costConfiguredProducts.length / catalogProducts.length) * 100)
    : 0;
  const lowInventoryProducts = catalogProducts.filter(
    (product) => product.inventarioBajo || product.inventarioBajoReceta,
  ).length;
  const recipeRiskProducts = catalogProducts.filter(
    (product) => product.inventarioBajoReceta,
  ).length;
  const recipeProductCount = new Set(recipeLinks.map((line) => line.productoId)).size;
  const recipeCoveragePct = catalogProducts.length
    ? Math.round((recipeProductCount / catalogProducts.length) * 100)
    : 0;
  const ingredientCostConfigured = inventoryIngredients.filter(
    (ingredient) => ingredient.costoUnidadBase !== null,
  ).length;
  const ingredientCostCoveragePct = inventoryIngredients.length
    ? Math.round(
        (ingredientCostConfigured / inventoryIngredients.length) * 100,
      )
    : 0;
  const criticalIngredients = inventoryIngredients.filter(
    (ingredient) =>
      Number(ingredient.stockActual) <= 0 ||
      Number(ingredient.stockActual) <= Number(ingredient.stockMinimo),
  );
  const inventoryLines = inventoryIngredients
    .map(
      (ingredient) =>
        `- ${ingredient.nombre}: stock ${Number(ingredient.stockActual)} ${ingredient.unidadBase} | mínimo ${Number(ingredient.stockMinimo)} | costo base ${ingredient.costoUnidadBase === null ? "N/D" : Number(ingredient.costoUnidadBase)}`,
    )
    .join("\n");
  const unavailableProducts = catalogProducts.filter(
    (product) => !product.disponible,
  ).length;

  const marginCompletePaidOrders = paidOrders.filter(
    (order) =>
      order.items.length > 0 &&
      order.items.every((item) => item.costoUnitarioSnapshot !== null),
  );
  const marginKnownRevenue = marginCompletePaidOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const marginKnownCost = marginCompletePaidOrders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum, item) =>
          itemSum +
          Number(item.costoUnitarioSnapshot ?? 0) * item.cantidad,
        0,
      ),
    0,
  );
  const observedContribution = marginKnownRevenue - marginKnownCost;
  const observedContributionMarginPct =
    marginKnownRevenue > 0
      ? Number(((observedContribution / marginKnownRevenue) * 100).toFixed(2))
      : null;

  const productStats = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  for (const order of paidOrders) {
    for (const item of order.items) {
      const current = productStats.get(item.productoId) ?? {
        name: item.producto.nombre,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.cantidad;
      current.revenue += Number(item.subtotal);
      productStats.set(item.productoId, current);
    }
  }

  const topProducts = [...productStats.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 12);

  const menu = categories
    .map((category) => {
      const products = category.productos
        .map(
          (product) => {
            const price = Number(product.precio);
            const cost =
              product.costoUnitario === null
                ? null
                : Number(product.costoUnitario);
            const margin =
              cost === null || price <= 0
                ? null
                : Number((((price - cost) / price) * 100).toFixed(1));
            return `- ${product.nombre} | precio ${price.toLocaleString("es-CO")} | costo ${cost === null ? "SIN CONFIGURAR" : "$" + cost.toLocaleString("es-CO")} | margen contrib. ${margin === null ? "N/D" : margin + "%"} | ${product.disponible ? "disponible" : "NO disponible"} | ${product.inventarioBajo || product.inventarioBajoReceta ? "INVENTARIO BAJO" : "stock operativo normal"} | ${product.destacado ? "destacado" : "normal"}`;
          },
        )
        .join("\n");
      return `${category.nombre}\n${products}`;
    })
    .join("\n\n");

  const aiFallbacks = aiRuns.filter((run) => run.fallback).length;
  const aiLatencyAvg = aiRuns.length
    ? Math.round(
        aiRuns.reduce((sum, run) => sum + run.latencyMs, 0) / aiRuns.length,
      )
    : 0;
  const commandsExecuted = transactionCommands.filter(
    (command) => command.status === "EXECUTED",
  ).length;
  const commandsPending = transactionCommands.filter(
    (command) => command.status === "PENDING",
  ).length;
  const commandExecutionRate = transactionCommands.length
    ? Math.round((commandsExecuted / transactionCommands.length) * 100)
    : 0;
  const revenueActionsPending = revenueActions.filter(
    (action) => action.status === "PENDING",
  ).length;
  const revenueActionsExecuted = revenueActions.filter(
    (action) => action.status === "EXECUTED",
  ).length;
  const topRevenueActions = revenueActions
    .filter((action) => action.status !== "REJECTED")
    .slice(0, 8)
    .map(
      (action) =>
        `- [${action.status}] ${action.title} | prioridad ${action.priorityScore} | riesgo ${action.riskLevel}`,
    )
    .join("\n");

  const experimentSummary = revenueExperiments
    .map((experiment) => {
      const result = jsonRecord(experiment.result);
      const interpretation =
        typeof result.interpretation === "string"
          ? result.interpretation
          : "SIN_RESULTADO";
      const lift =
        typeof result.observedConversionLiftPctPoints === "number"
          ? result.observedConversionLiftPctPoints
          : null;
      const sampleReady = result.sampleReady === true;
      const control = experiment.assignments.filter(
        (item) => item.arm === "CONTROL",
      ).length;
      const treatment = experiment.assignments.filter(
        (item) => item.arm === "TREATMENT",
      ).length;
      const exposed = experiment.assignments.filter(
        (item) => item.arm === "TREATMENT" && item.exposedAt,
      ).length;

      return `- [${experiment.status}] ${experiment.action.title} | control ${control} / treatment ${treatment} / expuestos ${exposed} | muestra lista ${sampleReady ? "sí" : "no"} | interpretación ${interpretation}${lift === null ? "" : ` | lift conversión ${lift} pp`}`;
    })
    .join("\n");

  const policySummary = revenuePolicies
    .map((policy) => {
      const outcome = jsonRecord(policy.outcome);
      const guardrail =
        typeof outcome.guardrail === "string" ? outcome.guardrail : "SIN_MEDIR";
      const lift =
        typeof outcome.observedConversionLiftPctPoints === "number"
          ? outcome.observedConversionLiftPctPoints
          : null;
      const serve = policy.assignments.filter(
        (item) => item.arm === "SERVE",
      ).length;
      const holdout = policy.assignments.filter(
        (item) => item.arm === "HOLDOUT",
      ).length;
      const exposures = policy.assignments.filter(
        (item) => item.arm === "SERVE" && item.servedAt,
      ).length;

      return `- [${policy.status}] ${policy.action.title} | tráfico ${policy.trafficPct}% serve | serve ${serve} / holdout ${holdout} / expuestos ${exposures} | guardrail ${guardrail}${lift === null ? "" : ` | lift producción ${lift} pp`}${policy.rollbackReason ? ` | rollback ${policy.rollbackReason}` : ""}`;
    })
    .join("\n");

  return [
    `NEGOCIO: ${siteConfig.name}`,
    `UBICACIÓN: ${siteConfig.location.address}`,
    `VENTANA DE DATOS: últimos 30 días (máximo 120 pedidos recientes)` ,
    `Pedidos no cancelados observados: ${validOrders.length}`,
    `Pedidos con pago aprobado observados: ${paidOrders.length}`,
    `Ventas aprobadas observadas: ${Math.round(revenue).toLocaleString("es-CO")} COP`,
    `Pedidos pagados de hoy observados: ${todayOrders.length}`,
    `Ventas aprobadas de hoy observadas: ${Math.round(todayRevenue).toLocaleString("es-CO")} COP`,
    `Cobertura de atribución sobre pagos aprobados: ${attributionCoverage}%`,
    `Pedidos pagados con asistencia digital observada: ${assistedPaidOrders.length}`,
    `Ingreso pagado asociado a alguna asistencia digital: ${Math.round(assistedRevenue).toLocaleString("es-CO")} COP`,
    `Ingreso pagado asociado a señal de PISÁO Concierge: ${Math.round(conciergeRevenue).toLocaleString("es-CO")} COP`,
    "NOTA DE ATRIBUCIÓN: las asistencias son señales observadas antes del pedido; no prueban causalidad ni ingreso incremental.",
    "PROFIT INTELLIGENCE V5:",
    `Cobertura actual de costo unitario: ${costCoveragePct}% (${costConfiguredProducts.length}/${catalogProducts.length} productos)`,
    `Productos no disponibles: ${unavailableProducts}`,
    `Productos con inventario bajo: ${lowInventoryProducts}`,
    `Pedidos pagados con snapshot completo de costos: ${marginCompletePaidOrders.length}/${paidOrders.length}`,
    `Ingreso pagado con costo histórico completo: ${Math.round(marginKnownRevenue).toLocaleString("es-CO")} COP`,
    `Costo histórico observado en esos pedidos: ${Math.round(marginKnownCost).toLocaleString("es-CO")} COP`,
    `Contribución observada con cobertura completa: ${Math.round(observedContribution).toLocaleString("es-CO")} COP`,
    `Margen de contribución observado: ${observedContributionMarginPct === null ? "N/D" : observedContributionMarginPct + "%"}`,
    "NOTA DE MARGEN: estas métricas solo incluyen pedidos cuyos ítems tienen snapshot de costo completo; no extrapoles el margen a pedidos sin cobertura.",
    "RECIPE & INVENTORY INTELLIGENCE V6:",
    `Cobertura de recetas: ${recipeCoveragePct}% (${recipeProductCount}/${catalogProducts.length} productos)`,
    `Cobertura de costo de insumos: ${ingredientCostCoveragePct}% (${ingredientCostConfigured}/${inventoryIngredients.length} insumos activos)`,
    `Insumos críticos por conteo actual: ${criticalIngredients.length}`,
    `Productos con riesgo derivado de receta: ${recipeRiskProducts}`,
    "INSUMOS ACTIVOS Y CONTEO ACTUAL:",
    inventoryLines || "Sin insumos configurados todavía.",
    "NOTA V6: el stock cambia solo por movimientos administrativos auditables. El consumo por receta sirve para costo teórico y pronóstico; no equivale a una salida física automática de inventario.",
    `Reservas futuras observadas: ${reservations.length}`,
    `Ejecuciones Concierge IA observadas: ${aiRuns.length}`,
    `Fallbacks IA observados: ${aiFallbacks}`,
    `Latencia media Concierge observada: ${aiLatencyAvg} ms`,
    `Comandos transaccionales observados: ${transactionCommands.length}`,
    `Comandos ejecutados: ${commandsExecuted}`,
    `Comandos pendientes: ${commandsPending}`,
    `Tasa de ejecución de comandos observada: ${commandExecutionRate}%`,
    `Acciones Revenue pendientes: ${revenueActionsPending}`,
    `Acciones Revenue ejecutadas: ${revenueActionsExecuted}`,
    "ACCIONES REVENUE GOBERNADAS:",
    topRevenueActions || "Sin acciones generadas todavía.",
    "EXPERIMENTOS CONTROLADOS REVENUE:",
    experimentSummary || "Sin experimentos activos o recientes.",
    "NOTA EXPERIMENTAL: solo un experimento con asignación controlada, muestra suficiente e instrumentación íntegra puede aportar evidencia de incrementalidad dentro de la población observada. No generalices más allá de esa población.",
    "POLÍTICAS ADAPTATIVAS DE PRODUCCIÓN:",
    policySummary || "Sin políticas adaptativas activas o recientes.",
    "NOTA ADAPTATIVA: el holdout continuo es un mecanismo de seguridad y monitoreo. La selección contextual y los cambios de composición del tráfico pueden limitar la interpretación causal frente al experimento A/B original.",
    "TOP PRODUCTOS POR UNIDADES OBSERVADAS:",
    topProducts.length
      ? topProducts
          .map(
            (product, index) =>
              `${index + 1}. ${product.name}: ${product.quantity} uds / $${Math.round(product.revenue).toLocaleString("es-CO")} COP`,
          )
          .join("\n")
      : "Sin datos suficientes de pedidos.",
    "MENÚ ACTUAL:",
    menu || "Sin menú cargado.",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || role !== "ADMIN") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      agent?: AdminAgentId;
      messages?: unknown;
    };
    const agentId = body.agent && agents[body.agent] ? body.agent : "gerencia";
    const agent = agents[agentId];
    const messages = sanitizeMessages(body.messages);

    if (!messages.some((message) => message.role === "user")) {
      return Response.json({ error: "Mensaje inválido." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY todavía no está configurada en producción." },
        { status: 503 },
      );
    }

    const businessContext = await getBusinessContext();
    const instructions = `
Eres ${agent.label}, uno de los agentes internos de administración de PISÁO Gastrobar.
Misión: ${agent.mission}

REGLAS OPERATIVAS
- Trabajas exclusivamente con los datos internos incluidos abajo. Distingue dato observado, inferencia y recomendación.
- No inventes ventas, costos, márgenes, inventario, disponibilidad, aforo, reseñas ni métricas externas.
- No afirmes causalidad cuando solo hay correlación o una muestra limitada.
- Puedes describir un resultado como evidencia experimental únicamente cuando provenga del bloque EXPERIMENTOS CONTROLADOS, la muestra figure como lista y la asignación CONTROL/TREATMENT sea válida. Aun así, limita la conclusión a la población y periodo instrumentados.
- Las POLÍTICAS ADAPTATIVAS son producción gobernada basada en experimentos previos. Su holdout continuo sirve como guardrail; no lo presentes como un nuevo A/B fijo equivalente al experimento original.
- PROFIT INTELLIGENCE V5 usa costos configurados y snapshots históricos. Si la cobertura no es completa, limita cualquier conclusión de rentabilidad a los pedidos/productos cubiertos.
- Un producto con INVENTARIO BAJO puede seguir vendiéndose si está disponible, pero no debe recomendarse proactivamente como Next Best Action hasta normalizar existencias.
- RECIPE & INVENTORY INTELLIGENCE V6 distingue conteo físico, costo teórico por receta y riesgo de insumos. No confundas consumo teórico con una salida real de stock.
- Puedes recomendar conteos, reposición, revisión de merma o completar recetas, pero nunca afirmes que un movimiento de inventario ocurrió si no aparece registrado en los datos.
- Si una política aparece ROLLED_BACK, no recomiendes reactivarla sin un nuevo experimento o revisión humana explícita.
- Prioriza acciones concretas, medibles y ordenadas por impacto/esfuerzo.
- Puedes proponer cambios de menú, campañas, promociones o procesos, pero NO afirmes que fueron ejecutados.
- Si una acción ya aparece como EXECUTED en el Revenue Action Engine, puedes tratarla como cambio operativo real; si está PENDING o APPROVED, sigue siendo una propuesta.
- Precios, descuentos, reembolsos, pagos, disponibilidad de productos y publicaciones requieren aprobación humana explícita.
- Si faltan costos o márgenes, dilo antes de recomendar descuentos.
- Responde en español profesional, directo y orientado a gestión. Evita texto inflado.

CONTEXTO OPERATIVO EN TIEMPO REAL
${businessContext}
`.trim();

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna",
        store: false,
        max_output_tokens: 900,
        instructions,
        input: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    const payload = (await upstream.json()) as OpenAIResponse;
    if (!upstream.ok) {
      console.error("[PISAO ADMIN AI] OpenAI error", upstream.status, payload.error);
      return Response.json(
        { error: "El agente no pudo responder en este momento." },
        { status: 502 },
      );
    }

    const text = extractOutputText(payload);
    if (!text) {
      return Response.json({ error: "Respuesta vacía del agente." }, { status: 502 });
    }

    return Response.json({ text, agent: agentId, agentLabel: agent.label });
  } catch (error) {
    console.error("[PISAO ADMIN AI] Error", error);
    return Response.json({ error: "Error inesperado del agente." }, { status: 500 });
  }
}
