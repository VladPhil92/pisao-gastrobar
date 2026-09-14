import { prisma } from "@/lib/prisma";
import { buildPisaoInstructions, routePisaoAgent } from "@/lib/ai/pisao-agents";
import {
  analyzeCommerceRequest,
  buildConversationalProposal,
  deterministicCommerceReply,
  proposalContextForModel,
  type CommerceProduct,
} from "@/lib/ai/conversational-commerce";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
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
    .slice(-10)
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

    const agent = routePisaoAgent(latestUserMessage.content);
    const catalog = await getMenuCatalog();
    const transcript = messages
      .filter((message) => message.role === "user")
      .map((message) => message.content)
      .join("\n");
    const commerceAnalysis = analyzeCommerceRequest(transcript);
    const proposal =
      agent.id === "ventas" || (agent.id === "anfitrion" && commerceAnalysis.foodIntent)
        ? buildConversationalProposal(catalog.products, commerceAnalysis)
        : null;

    const fallbackText = deterministicCommerceReply(commerceAnalysis, proposal);
    const hoursContext = [
      `${siteConfig.location.label}. ${siteConfig.location.address}`,
      ...siteConfig.hours.map(({ dia, horario }) => `${dia}: ${horario}`),
      `WhatsApp: ${siteConfig.contact.phone}`,
    ].join("\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({
        text: fallbackText,
        proposal,
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
        })}\n\nCOMERCIO CONVERSACIONAL\n${proposalContextForModel(proposal)}\n\nSi no hay propuesta calculada, haz solo la pregunta mínima necesaria para poder construirla. Para alergias, intolerancias o veganismo, no generes una mesa automática: deriva a validación humana.`,
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
        fallback: true,
        agent: agent.id,
        agentLabel: agent.label,
        menuSource: catalog.source,
      });
    }

    const text = extractOutputText(payload) || fallbackText;

    return Response.json({
      text,
      proposal,
      fallback: !extractOutputText(payload),
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
