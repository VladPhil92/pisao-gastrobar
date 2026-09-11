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

  const [orders, reservations, categories] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: since30Days } },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
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
  ]);

  const validOrders = orders.filter((order) => order.estado !== "CANCELADO");
  const revenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const todayOrders = validOrders.filter((order) => order.createdAt >= today);
  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  const productStats = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  for (const order of validOrders) {
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
          (product) =>
            `- ${product.nombre} | $${Number(product.precio).toLocaleString("es-CO")} | ${product.disponible ? "disponible" : "NO disponible"} | ${product.destacado ? "destacado" : "normal"}`,
        )
        .join("\n");
      return `${category.nombre}\n${products}`;
    })
    .join("\n\n");

  return [
    `NEGOCIO: ${siteConfig.name}`,
    `UBICACIÓN: ${siteConfig.location.address}`,
    `VENTANA DE DATOS: últimos 30 días (máximo 120 pedidos recientes)` ,
    `Pedidos válidos observados: ${validOrders.length}`,
    `Ventas brutas observadas: $${Math.round(revenue).toLocaleString("es-CO")} COP`,
    `Pedidos de hoy observados: ${todayOrders.length}`,
    `Ventas de hoy observadas: $${Math.round(todayRevenue).toLocaleString("es-CO")} COP`,
    `Reservas futuras observadas: ${reservations.length}`,
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
- Prioriza acciones concretas, medibles y ordenadas por impacto/esfuerzo.
- Puedes proponer cambios de menú, campañas, promociones o procesos, pero NO afirmes que fueron ejecutados.
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
