import type {
  CommerceProduct,
  ConversationalProposal,
} from "@/lib/ai/conversational-commerce";
import {
  applyStructuredCommerceTool,
  type StructuredCommerceMutation,
} from "@/lib/ai/tool-orchestrator";
import type { ReservationAvailability } from "@/lib/reservas/availability";

export type NativeToolName =
  | "search_menu"
  | "get_active_table"
  | "modify_active_table"
  | "check_reservation_availability"
  | "get_order_status";

export type NativeToolCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

export type NativeToolOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export type NativeToolExecution = {
  output: NativeToolOutput;
  toolName: NativeToolName | "unknown";
  commerceProposal?: ConversationalProposal | null;
  commerceMutated?: boolean;
  summary?: string | null;
};

type CheckAvailability = (params: {
  fecha: string;
  hora: string;
  personas: number;
}) => Promise<ReservationAvailability>;

type LookupOrderStatus = (params: {
  numero: number;
  telefono: string;
}) => Promise<unknown | null>;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isExplicitTableMutationIntent(message: string) {
  return /\b(agrega|agregame|anade|anademe|suma|incluye|quita|quitame|saca|elimina|retira|cambia|cambiar|reemplaza|reemplazar|sustituye|sustituir|deja|pon|ajusta)\b/i.test(
    normalize(message),
  );
}

function safeJson(value: unknown) {
  return JSON.stringify(value).slice(0, 12_000);
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function searchProducts(
  products: CommerceProduct[],
  query: string,
  category: string | null,
  limit: number,
) {
  const q = normalize(query);
  const categoryNormalized = category ? normalize(category) : null;

  return products
    .filter((product) => product.disponible)
    .map((product) => {
      const searchable = normalize(
        `${product.nombre} ${product.slug} ${product.descripcion ?? ""} ${product.categoriaSlug ?? ""}`,
      );
      let score = 0;
      if (!q) score += 1;
      if (q && searchable.includes(q)) score += 20;
      for (const token of q.split(" ").filter((item) => item.length >= 3)) {
        if (searchable.includes(token)) score += 4;
      }
      if (
        categoryNormalized &&
        normalize(product.categoriaSlug ?? "") === categoryNormalized
      ) {
        score += 12;
      } else if (categoryNormalized) {
        score -= 20;
      }
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.precio - b.product.precio ||
        a.product.nombre.localeCompare(b.product.nombre),
    )
    .slice(0, Math.min(8, Math.max(1, limit)))
    .map(({ product }) => ({
      id: product.id,
      nombre: product.nombre,
      slug: product.slug,
      categoria: product.categoriaSlug ?? null,
      precio: product.precio,
      disponible: product.disponible,
    }));
}

export function buildNativeToolDefinitions(params: {
  allowTableMutation: boolean;
}) {
  const tools: Array<Record<string, unknown>> = [
    {
      type: "function",
      name: "search_menu",
      description:
        "Busca productos reales y disponibles en la carta actual de PISÁO. Úsala cuando necesites identificar platos o bebidas concretos.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Texto breve a buscar, por ejemplo cerveza artesanal, hamburguesa o limonada.",
          },
          category: {
            type: ["string", "null"],
            description:
              "Slug de categoría si el usuario indicó una categoría concreta; null en caso contrario.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 8,
          },
        },
        required: ["query", "category", "limit"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_active_table",
      description:
        "Consulta la mesa/propuesta transaccional activa de esta sesión. No modifica nada.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "get_order_status",
      description:
        "Consulta el estado real de un pedido PISÁO cuando el cliente proporciona número de pedido y teléfono. Solo devuelve estado operativo y de pago; nunca datos personales.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          numero: {
            type: "integer",
            minimum: 1,
            maximum: 10000000,
            description: "Número visible del pedido.",
          },
          telefono: {
            type: "string",
            minLength: 7,
            maxLength: 32,
            description: "Teléfono del cliente para verificar acceso al pedido.",
          },
        },
        required: ["numero", "telefono"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "check_reservation_availability",
      description:
        "Consulta disponibilidad real de PISÁO para una fecha, hora y número de personas. Solo consulta; no crea reservas.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          fecha: {
            type: "string",
            description: "Fecha en formato YYYY-MM-DD.",
          },
          hora: {
            type: "string",
            description: "Hora local del restaurante en formato HH:MM de 24 horas.",
          },
          personas: {
            type: "integer",
            minimum: 1,
            maximum: 12,
          },
        },
        required: ["fecha", "hora", "personas"],
        additionalProperties: false,
      },
    },
  ];

  if (params.allowTableMutation) {
    tools.push({
      type: "function",
      name: "modify_active_table",
      description:
        "Modifica la mesa activa solo cuando el usuario pidió explícitamente agregar, quitar, reemplazar o ajustar una cantidad. Nunca la uses por iniciativa comercial propia.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["add", "remove", "replace", "set_quantity"],
          },
          source: {
            type: ["string", "null"],
            description:
              "Producto o categoría existente a quitar, reemplazar o ajustar. null para add.",
          },
          target: {
            type: ["string", "null"],
            description:
              "Producto o categoría destino para add/replace. null cuando no aplica.",
          },
          quantity: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 20,
            description:
              "Cantidad explícita. null si el usuario no especificó una cantidad.",
          },
        },
        required: ["operation", "source", "target", "quantity"],
        additionalProperties: false,
      },
    });
  }

  return tools;
}

function tableSnapshot(proposal: ConversationalProposal | null) {
  if (!proposal) return { active: false, items: [] };

  return {
    active: true,
    diners: proposal.diners,
    total: proposal.total,
    perPerson: proposal.perPerson,
    targetTotal: proposal.targetTotal,
    fitsBudget: proposal.fitsBudget,
    items: proposal.items.map((item) => ({
      productId: item.product.id,
      nombre: item.product.nombre,
      slug: item.product.slug,
      categoria: item.product.categoriaSlug ?? null,
      precio: item.product.precio,
      quantity: item.quantity,
      role: item.role,
    })),
  };
}

function structuredMutationFromArgs(
  args: Record<string, unknown>,
): StructuredCommerceMutation | null {
  const operation = args.operation;
  if (
    operation !== "add" &&
    operation !== "remove" &&
    operation !== "replace" &&
    operation !== "set_quantity"
  ) {
    return null;
  }

  const source =
    typeof args.source === "string" && args.source.trim()
      ? args.source.trim().slice(0, 120)
      : null;
  const target =
    typeof args.target === "string" && args.target.trim()
      ? args.target.trim().slice(0, 120)
      : null;
  const quantity =
    typeof args.quantity === "number" && Number.isFinite(args.quantity)
      ? Math.min(20, Math.max(1, Math.round(args.quantity)))
      : null;

  return { operation, source, target, quantity };
}

export async function executeNativeToolCall(params: {
  call: NativeToolCall;
  products: CommerceProduct[];
  activeProposal: ConversationalProposal | null;
  latestUserMessage: string;
  checkAvailability: CheckAvailability;
  lookupOrderStatus: LookupOrderStatus;
}): Promise<NativeToolExecution> {
  const args = parseArgs(params.call.arguments);
  const name = params.call.name as NativeToolName;

  if (name === "search_menu") {
    const query = typeof args.query === "string" ? args.query.slice(0, 160) : "";
    const category =
      typeof args.category === "string" ? args.category.slice(0, 96) : null;
    const limit =
      typeof args.limit === "number" ? Math.round(args.limit) : 5;
    const result = searchProducts(params.products, query, category, limit);
    return {
      toolName: name,
      output: {
        type: "function_call_output",
        call_id: params.call.call_id,
        output: safeJson({ ok: true, products: result }),
      },
    };
  }

  if (name === "get_active_table") {
    return {
      toolName: name,
      output: {
        type: "function_call_output",
        call_id: params.call.call_id,
        output: safeJson({ ok: true, table: tableSnapshot(params.activeProposal) }),
      },
    };
  }

  if (name === "get_order_status") {
    const numero =
      typeof args.numero === "number" && Number.isFinite(args.numero)
        ? Math.round(args.numero)
        : 0;
    const telefono =
      typeof args.telefono === "string" ? args.telefono.slice(0, 32) : "";

    if (numero <= 0 || telefono.length < 7) {
      return {
        toolName: name,
        output: {
          type: "function_call_output",
          call_id: params.call.call_id,
          output: safeJson({
            ok: false,
            code: "ORDER_VERIFICATION_REQUIRED",
            error:
              "Para consultar un pedido se requiere número de pedido y teléfono.",
          }),
        },
      };
    }

    const snapshot = await params.lookupOrderStatus({ numero, telefono });
    return {
      toolName: name,
      output: {
        type: "function_call_output",
        call_id: params.call.call_id,
        output: safeJson(
          snapshot
            ? { ok: true, order: snapshot }
            : {
                ok: false,
                code: "ORDER_NOT_VERIFIED",
                error:
                  "No se pudo verificar un pedido con ese número y teléfono.",
              },
        ),
      },
    };
  }

  if (name === "check_reservation_availability") {
    const fecha = typeof args.fecha === "string" ? args.fecha : "";
    const hora = typeof args.hora === "string" ? args.hora : "";
    const personas =
      typeof args.personas === "number" ? Math.round(args.personas) : 0;

    try {
      const availability = await params.checkAvailability({
        fecha,
        hora,
        personas,
      });
      return {
        toolName: name,
        output: {
          type: "function_call_output",
          call_id: params.call.call_id,
          output: safeJson({ ok: true, availability }),
        },
      };
    } catch (error) {
      return {
        toolName: name,
        output: {
          type: "function_call_output",
          call_id: params.call.call_id,
          output: safeJson({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "No fue posible consultar disponibilidad.",
          }),
        },
      };
    }
  }

  if (name === "modify_active_table") {
    if (!isExplicitTableMutationIntent(params.latestUserMessage)) {
      return {
        toolName: name,
        output: {
          type: "function_call_output",
          call_id: params.call.call_id,
          output: safeJson({
            ok: false,
            code: "USER_AUTHORIZATION_REQUIRED",
            error:
              "La modificación fue rechazada porque el último mensaje no contiene una orden explícita de editar la mesa.",
          }),
        },
      };
    }

    const mutation = structuredMutationFromArgs(args);
    if (!mutation) {
      return {
        toolName: name,
        output: {
          type: "function_call_output",
          call_id: params.call.call_id,
          output: safeJson({
            ok: false,
            code: "INVALID_TOOL_ARGUMENTS",
          }),
        },
      };
    }

    const result = applyStructuredCommerceTool({
      mutation,
      activeProposal: params.activeProposal,
      products: params.products,
    });

    return {
      toolName: name,
      commerceProposal: result.proposal,
      commerceMutated: result.handled,
      output: {
        type: "function_call_output",
        call_id: params.call.call_id,
        output: safeJson({
          ok: result.handled,
          tool: result.tool,
          summary: result.summary,
          table: tableSnapshot(result.proposal),
        }),
      },
    };
  }

  return {
    toolName: "unknown",
    output: {
      type: "function_call_output",
      call_id: params.call.call_id,
      output: safeJson({
        ok: false,
        code: "UNKNOWN_TOOL",
      }),
    },
  };
}

export function extractNativeToolCalls(payload: {
  output?: Array<{
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
  }>;
}): NativeToolCall[] {
  return (payload.output ?? [])
    .filter(
      (item): item is NativeToolCall =>
        item.type === "function_call" &&
        typeof item.call_id === "string" &&
        typeof item.name === "string" &&
        typeof item.arguments === "string",
    )
    .slice(0, 4);
}
