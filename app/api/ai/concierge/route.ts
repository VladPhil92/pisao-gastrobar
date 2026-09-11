import { prisma } from "@/lib/prisma";
import { buildPisaoInstructions, routePisaoAgent } from "@/lib/ai/pisao-agents";
import { siteConfig } from "@/lib/site-config";

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
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1600),
    }));
}

async function getMenuContext() {
  try {
    const categories = await prisma.categoria.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        productos: {
          where: { disponible: true },
          orderBy: [{ destacado: "desc" }, { orden: "asc" }, { nombre: "asc" }],
        },
      },
    });

    if (!categories.length) return "No hay catálogo cargado en este momento.";

    return categories
      .map((category) => {
        const products = category.productos
          .map(
            (product) =>
              `- ${product.nombre}: $${Number(product.precio).toLocaleString("es-CO")} COP. ${product.descripcion}`,
          )
          .join("\n");
        return `${category.nombre}\n${products}`;
      })
      .join("\n\n")
      .slice(0, 14000);
  } catch (error) {
    console.error("[PISAO AI] No se pudo cargar el menú", error);
    return "El catálogo dinámico no está disponible. No inventes platos ni precios; dirige al visitante a /menu.";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: unknown };
    const messages = sanitizeMessages(body.messages);
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json({ error: "Mensaje inválido." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: "El asistente todavía no tiene configurada su credencial de IA.",
          fallback: true,
        },
        { status: 503 },
      );
    }

    const agent = routePisaoAgent(latestUserMessage.content);
    const menuContext = await getMenuContext();
    const hoursContext = [
      `${siteConfig.location.label}. ${siteConfig.location.address}`,
      ...siteConfig.hours.map(({ dia, horario }) => `${dia}: ${horario}`),
      `WhatsApp: ${siteConfig.contact.phone}`,
    ].join("\n");

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
        instructions: buildPisaoInstructions({
          agent,
          menuContext,
          hoursContext,
        }),
        input: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    const payload = (await upstream.json()) as OpenAIResponse;

    if (!upstream.ok) {
      console.error("[PISAO AI] OpenAI error", upstream.status, payload.error);
      return Response.json(
        { error: "No pude responder en este momento. Intenta de nuevo o escríbenos por WhatsApp." },
        { status: 502 },
      );
    }

    const text = extractOutputText(payload);
    if (!text) {
      return Response.json(
        { error: "No pude generar una respuesta útil. Intenta nuevamente." },
        { status: 502 },
      );
    }

    return Response.json({
      text,
      agent: agent.id,
      agentLabel: agent.label,
    });
  } catch (error) {
    console.error("[PISAO AI] Error inesperado", error);
    return Response.json(
      { error: "Ocurrió un error inesperado. Puedes continuar por WhatsApp." },
      { status: 500 },
    );
  }
}
