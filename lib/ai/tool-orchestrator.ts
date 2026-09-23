import type {
  CommerceProduct,
  ConversationalProposal,
  CommerceProposalItem,
} from "@/lib/ai/conversational-commerce";
import type { DrinkPreference, PlanIntent } from "@/lib/menu/plan-mode";

export type CommerceToolName =
  | "table.add_item"
  | "table.remove_item"
  | "table.replace_item"
  | "table.set_quantity";

export type StoredCommerceState = {
  version: 1;
  diners: number;
  intent: PlanIntent;
  drinkPreference: DrinkPreference;
  targetTotal: number;
  budgetWasExplicit: boolean;
  items: Array<{
    productId: string;
    quantity: number;
    role: CommerceProposalItem["role"];
  }>;
};

export type StructuredCommerceMutation = {
  operation: "add" | "remove" | "replace" | "set_quantity";
  source: string | null;
  target: string | null;
  quantity: number | null;
};

export type CommerceToolResult = {
  handled: boolean;
  tool: CommerceToolName | null;
  proposal: ConversationalProposal | null;
  summary: string | null;
};

const ROLE_LABELS: Record<CommerceProposalItem["role"], string> = {
  share: "Para compartir",
  main: "Plato fuerte",
  drink: "Bebida",
  sweet: "Cierre dulce",
};

const CATEGORY_ALIASES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /\bcervezas?\b/, slug: "cervezas" },
  { pattern: /\blimonadas?\b/, slug: "limonadas" },
  { pattern: /\bsodas?\b/, slug: "sodas-saborizadas" },
  { pattern: /\b(cocteles?|tragos?)\b/, slug: "cocteles" },
  { pattern: /\b(gaseosas?|bebidas?)\b/, slug: "gaseosas-y-bebidas" },
  { pattern: /\bhamburguesas?\b/, slug: "hamburguesas" },
  { pattern: /\bpatacones?\b/, slug: "patacones-insignia" },
  { pattern: /\bbowls?\b/, slug: "bowls" },
  { pattern: /\bentradas?\b/, slug: "entradas" },
  { pattern: /\b(postres?|dulces?)\b/, slug: "postre" },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function roleForProduct(product: CommerceProduct): CommerceProposalItem["role"] {
  const category = product.categoriaSlug ?? "";
  if (category === "entradas") return "share";
  if (
    category === "cervezas" ||
    category === "limonadas" ||
    category === "sodas-saborizadas" ||
    category === "gaseosas-y-bebidas" ||
    category === "cocteles"
  ) {
    return "drink";
  }
  if (category === "postre") return "sweet";
  return "main";
}

function recalculateProposal(
  base: ConversationalProposal,
  items: CommerceProposalItem[],
): ConversationalProposal {
  const cleanItems = items
    .filter((item) => item.quantity > 0 && item.product.disponible)
    .slice(0, 24);
  const total = cleanItems.reduce(
    (sum, item) => sum + item.product.precio * item.quantity,
    0,
  );
  const perPerson =
    base.diners > 0 ? Math.round(total / base.diners) : total;
  const id = [
    "state",
    base.diners,
    total,
    ...cleanItems.map((item) => `${item.product.slug}x${item.quantity}`),
  ].join(":");

  return {
    ...base,
    id,
    items: cleanItems,
    total,
    perPerson,
    fitsBudget: total <= base.targetTotal,
  };
}

function categoryFromReference(reference: string) {
  const normalized = normalize(reference);
  return CATEGORY_ALIASES.find(({ pattern }) => pattern.test(normalized))?.slug;
}

function scoreProductReference(product: CommerceProduct, reference: string) {
  const ref = normalize(reference);
  if (!ref) return 0;

  const name = normalize(product.nombre);
  const slug = normalize(product.slug.replaceAll("-", " "));
  if (name === ref || slug === ref) return 100;
  if (name.includes(ref) || slug.includes(ref)) return 80;
  if (ref.includes(name) || ref.includes(slug)) return 70;

  const tokens = ref.split(" ").filter((token) => token.length >= 3);
  const overlap = tokens.filter(
    (token) => name.includes(token) || slug.includes(token),
  ).length;
  return overlap ? 30 + overlap * 10 : 0;
}

function sourceMatches(
  proposal: ConversationalProposal,
  reference: string,
): CommerceProposalItem[] {
  const category = categoryFromReference(reference);
  if (category) {
    const categoryMatches = proposal.items.filter(
      (item) => item.product.categoriaSlug === category,
    );
    if (categoryMatches.length) return categoryMatches;
  }

  return proposal.items
    .map((item) => ({
      item,
      score: scoreProductReference(item.product, reference),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map((entry) => entry.item);
}

function targetProduct(
  products: CommerceProduct[],
  reference: string,
  referencePrice?: number,
) {
  const available = products.filter((product) => product.disponible);
  const category = categoryFromReference(reference);

  if (category) {
    const categoryMatches = available.filter(
      (product) => product.categoriaSlug === category,
    );
    if (categoryMatches.length) {
      return categoryMatches.sort((a, b) => {
        if (referencePrice == null) return a.precio - b.precio;
        return (
          Math.abs(a.precio - referencePrice) -
            Math.abs(b.precio - referencePrice) ||
          a.precio - b.precio
        );
      })[0];
    }
  }

  return available
    .map((product) => ({
      product,
      score: scoreProductReference(product, reference),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(a.product.precio - (referencePrice ?? a.product.precio)) -
          Math.abs(b.product.precio - (referencePrice ?? b.product.precio)),
    )[0]?.product;
}

function addOrMerge(
  items: CommerceProposalItem[],
  product: CommerceProduct,
  quantity: number,
  role = roleForProduct(product),
) {
  const next = items.map((item) => ({ ...item }));
  const existing = next.find(
    (item) => item.product.id === product.id && item.role === role,
  );

  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + quantity);
  } else {
    next.push({
      product,
      quantity: Math.min(20, Math.max(1, quantity)),
      role,
      roleLabel: ROLE_LABELS[role],
    });
  }

  return next;
}

export function serializeCommerceProposal(
  proposal: ConversationalProposal,
): StoredCommerceState {
  return {
    version: 1,
    diners: proposal.diners,
    intent: proposal.intent,
    drinkPreference: proposal.drinkPreference,
    targetTotal: proposal.targetTotal,
    budgetWasExplicit: proposal.budgetWasExplicit,
    items: proposal.items.slice(0, 24).map((item) => ({
      productId: item.product.id,
      quantity: Math.min(20, Math.max(1, Math.round(item.quantity))),
      role: item.role,
    })),
  };
}

export function hydrateCommerceProposal(
  value: unknown,
  products: CommerceProduct[],
): ConversationalProposal | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredCommerceState>;
  if (candidate.version !== 1) return null;
  if (
    typeof candidate.diners !== "number" ||
    candidate.diners < 1 ||
    candidate.diners > 8 ||
    typeof candidate.targetTotal !== "number" ||
    candidate.targetTotal < 0 ||
    candidate.targetTotal > 2_000_000 ||
    !["rapido", "compartir", "completa"].includes(String(candidate.intent)) ||
    !["sin-alcohol", "cerveza", "cualquiera"].includes(
      String(candidate.drinkPreference),
    ) ||
    !Array.isArray(candidate.items)
  ) {
    return null;
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const items: CommerceProposalItem[] = [];

  for (const raw of candidate.items.slice(0, 24)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as StoredCommerceState["items"][number];
    const product = productMap.get(item.productId);
    if (!product?.disponible) continue;
    if (
      !["share", "main", "drink", "sweet"].includes(String(item.role)) ||
      !Number.isFinite(item.quantity)
    ) {
      continue;
    }

    const quantity = Math.min(20, Math.max(1, Math.round(item.quantity)));
    items.push({
      product,
      quantity,
      role: item.role,
      roleLabel: ROLE_LABELS[item.role],
    });
  }

  if (!items.length) return null;

  const shell: ConversationalProposal = {
    id: "restored",
    items,
    diners: Math.round(candidate.diners),
    intent: candidate.intent as PlanIntent,
    intentLabel:
      candidate.intent === "compartir"
        ? "Para compartir"
        : candidate.intent === "completa"
          ? "Mesa completa"
          : "Rápido y contundente",
    drinkPreference: candidate.drinkPreference as DrinkPreference,
    targetTotal: Math.round(candidate.targetTotal),
    total: 0,
    perPerson: 0,
    fitsBudget: true,
    budgetWasExplicit: Boolean(candidate.budgetWasExplicit),
    assumptions: [],
  };

  return recalculateProposal(shell, items);
}

export function isCommercePlanningTurn(message: string) {
  const text = normalize(message);
  return (
    /(comer|comida|pedido|pedir|domicilio|menu|recomiend|patacon|hamburgues|cayeye|bowl|entrada|postre)/.test(
      text,
    ) ||
    /(somos|para)\s+\d{1,2}\b/.test(text) ||
    /\b\d{1,2}\s+personas?\b/.test(text) ||
    /(presupuesto|\$|\b\d{2,4}\s*(mil|k)\b)/.test(text) ||
    /(compart|rapido|completa|cerveza|coctel|limonada|sin alcohol)/.test(text)
  );
}

export function applyStructuredCommerceTool(params: {
  mutation: StructuredCommerceMutation;
  activeProposal: ConversationalProposal | null;
  products: CommerceProduct[];
}): CommerceToolResult {
  const active = params.activeProposal;
  if (!active) {
    return { handled: false, tool: null, proposal: null, summary: null };
  }

  const mutation = params.mutation;

  if (mutation.operation === "add" && mutation.target) {
    const target = targetProduct(params.products, mutation.target);
    if (!target) {
      return { handled: false, tool: null, proposal: active, summary: null };
    }
    const quantity = mutation.quantity ?? 1;
    const proposal = recalculateProposal(
      active,
      addOrMerge(active.items, target, quantity),
    );
    return {
      handled: true,
      tool: "table.add_item",
      proposal,
      summary: `Agregué ${quantity} × ${target.nombre}. La mesa queda en ${proposal.total.toLocaleString("es-CO")} COP.`,
    };
  }

  if (mutation.operation === "remove" && mutation.source) {
    const sources = sourceMatches(active, mutation.source);
    if (!sources.length) {
      return { handled: false, tool: null, proposal: active, summary: null };
    }

    let remainingToRemove = mutation.quantity ?? 1;
    const sourceIds = new Set(sources.map((item) => item.product.id));
    const next = active.items
      .map((item) => {
        if (!sourceIds.has(item.product.id) || remainingToRemove <= 0) {
          return { ...item };
        }
        const removed = Math.min(item.quantity, remainingToRemove);
        remainingToRemove -= removed;
        return { ...item, quantity: item.quantity - removed };
      })
      .filter((item) => item.quantity > 0);

    const proposal = next.length ? recalculateProposal(active, next) : null;
    return {
      handled: true,
      tool: "table.remove_item",
      proposal,
      summary: proposal
        ? `Actualicé la mesa. El nuevo total es ${proposal.total.toLocaleString("es-CO")} COP.`
        : "Quité el último producto de la mesa activa.",
    };
  }

  if (
    mutation.operation === "replace" &&
    mutation.source &&
    mutation.target
  ) {
    const sources = sourceMatches(active, mutation.source);
    if (!sources.length) {
      return { handled: false, tool: null, proposal: active, summary: null };
    }

    const requestedQuantity =
      mutation.quantity ??
      sources.reduce((sum, item) => sum + item.quantity, 0);
    const referencePrice =
      sources.reduce(
        (sum, item) => sum + item.product.precio * item.quantity,
        0,
      ) /
      Math.max(
        1,
        sources.reduce((sum, item) => sum + item.quantity, 0),
      );
    const target = targetProduct(
      params.products,
      mutation.target,
      referencePrice,
    );
    if (!target || sources.some((item) => item.product.id === target.id)) {
      return { handled: false, tool: null, proposal: active, summary: null };
    }

    let remainingToRemove = requestedQuantity;
    const sourceIds = new Set(sources.map((item) => item.product.id));
    const remaining = active.items
      .map((item) => {
        if (!sourceIds.has(item.product.id) || remainingToRemove <= 0) {
          return { ...item };
        }
        const removed = Math.min(item.quantity, remainingToRemove);
        remainingToRemove -= removed;
        return { ...item, quantity: item.quantity - removed };
      })
      .filter((item) => item.quantity > 0);

    const role =
      sources.every((item) => item.role === sources[0].role)
        ? sources[0].role
        : roleForProduct(target);
    const proposal = recalculateProposal(
      active,
      addOrMerge(remaining, target, requestedQuantity, role),
    );
    return {
      handled: true,
      tool: "table.replace_item",
      proposal,
      summary: `Reemplacé ${requestedQuantity} unidad${requestedQuantity === 1 ? "" : "es"} por ${target.nombre}. La mesa queda en ${proposal.total.toLocaleString("es-CO")} COP.`,
    };
  }

  if (
    mutation.operation === "set_quantity" &&
    mutation.source &&
    mutation.quantity
  ) {
    const sources = sourceMatches(active, mutation.source);
    if (sources.length !== 1) {
      return { handled: false, tool: null, proposal: active, summary: null };
    }

    const sourceId = sources[0].product.id;
    const next = active.items.map((item) =>
      item.product.id === sourceId
        ? { ...item, quantity: mutation.quantity! }
        : { ...item },
    );
    const proposal = recalculateProposal(active, next);
    return {
      handled: true,
      tool: "table.set_quantity",
      proposal,
      summary: `Dejé ${mutation.quantity} × ${sources[0].product.nombre}. La mesa queda en ${proposal.total.toLocaleString("es-CO")} COP.`,
    };
  }

  return { handled: false, tool: null, proposal: active, summary: null };
}

export function applyCommerceTool(params: {
  latestUserMessage: string;
  activeProposal: ConversationalProposal | null;
  products: CommerceProduct[];
}): CommerceToolResult {
  const active = params.activeProposal;
  if (!active) {
    return { handled: false, tool: null, proposal: null, summary: null };
  }

  const text = normalize(params.latestUserMessage);

  const replaceMatch = text.match(
    /\b(?:cambia|cambiar|reemplaza|reemplazar|sustituye|sustituir)\b\s+(?:las?|los?|una?|un)?\s*(.+?)\s+por\s+(?:las?|los?|una?|un)?\s*(.+)$/,
  );
  if (replaceMatch) {
    const sources = sourceMatches(active, replaceMatch[1]);
    if (sources.length) {
      const totalQuantity = sources.reduce((sum, item) => sum + item.quantity, 0);
      const referencePrice =
        sources.reduce(
          (sum, item) => sum + item.product.precio * item.quantity,
          0,
        ) / totalQuantity;
      const target = targetProduct(
        params.products,
        replaceMatch[2],
        referencePrice,
      );

      if (target && !sources.some((item) => item.product.id === target.id)) {
        const sourceIds = new Set(sources.map((item) => item.product.id));
        const remaining = active.items.filter(
          (item) => !sourceIds.has(item.product.id),
        );
        const role =
          sources.every((item) => item.role === sources[0].role)
            ? sources[0].role
            : roleForProduct(target);
        const proposal = recalculateProposal(
          active,
          addOrMerge(remaining, target, totalQuantity, role),
        );
        return {
          handled: true,
          tool: "table.replace_item",
          proposal,
          summary: `Cambié ${totalQuantity} unidad${totalQuantity === 1 ? "" : "es"} por ${target.nombre}. La mesa queda en $${proposal.total.toLocaleString("es-CO")} COP.`,
        };
      }
    }
  }

  const removeMatch = text.match(
    /\b(?:quita|quitame|saca|elimina|retira)\b\s+(?:(una?|un|las?|los?)\s+)?(.+)$/,
  );
  if (removeMatch) {
    const sources = sourceMatches(active, removeMatch[2]);
    if (sources.length) {
      const removeAll = /^(las|los)$/.test(removeMatch[1] ?? "");
      const sourceIds = new Set(sources.map((item) => item.product.id));
      const next = active.items
        .map((item) => {
          if (!sourceIds.has(item.product.id)) return { ...item };
          if (removeAll) return { ...item, quantity: 0 };
          return { ...item, quantity: item.quantity - 1 };
        })
        .filter((item) => item.quantity > 0);
      const proposal = next.length ? recalculateProposal(active, next) : null;
      const label = sources.map((item) => item.product.nombre).join(", ");
      return {
        handled: true,
        tool: "table.remove_item",
        proposal,
        summary: proposal
          ? `Ajusté ${label}. La mesa queda en $${proposal.total.toLocaleString("es-CO")} COP.`
          : "Quité el último producto de la mesa activa.",
      };
    }
  }

  const quantityMatch = text.match(
    /\b(?:deja|pon|ajusta)\b\s+(?:en\s+)?(\d{1,2})\s+(?:x\s+|de\s+)?(.+)$/,
  );
  if (quantityMatch) {
    const quantity = Math.min(20, Math.max(1, Number(quantityMatch[1])));
    const sources = sourceMatches(active, quantityMatch[2]);
    if (sources.length === 1) {
      const sourceId = sources[0].product.id;
      const next = active.items.map((item) =>
        item.product.id === sourceId ? { ...item, quantity } : { ...item },
      );
      const proposal = recalculateProposal(active, next);
      return {
        handled: true,
        tool: "table.set_quantity",
        proposal,
        summary: `Dejé ${quantity} × ${sources[0].product.nombre}. La mesa queda en $${proposal.total.toLocaleString("es-CO")} COP.`,
      };
    }
  }

  const addMatch = text.match(
    /\b(?:agrega|agregame|anade|anademe|suma|incluye)\b\s+(?:(\d{1,2})\s+)?(?:una?|un|las?|los?)?\s*(.+)$/,
  );
  if (addMatch) {
    const quantity = Math.min(20, Math.max(1, Number(addMatch[1] ?? "1")));
    const target = targetProduct(params.products, addMatch[2]);
    if (target) {
      const proposal = recalculateProposal(
        active,
        addOrMerge(active.items, target, quantity),
      );
      return {
        handled: true,
        tool: "table.add_item",
        proposal,
        summary: `Agregué ${quantity} × ${target.nombre}. La mesa queda en $${proposal.total.toLocaleString("es-CO")} COP.`,
      };
    }
  }

  return { handled: false, tool: null, proposal: active, summary: null };
}

export function commerceToolContextForModel(result: CommerceToolResult) {
  if (!result.handled || !result.tool || !result.summary) {
    return "STATEFUL TOOL ORCHESTRATOR\nNo se aplicó una modificación de mesa en este turno.";
  }

  return [
    "STATEFUL TOOL ORCHESTRATOR",
    `Herramienta ejecutada: ${result.tool}`,
    `Resultado verificado: ${result.summary}`,
    "La modificación ya fue aplicada al estado de la sesión. No inventes cambios adicionales.",
  ].join("\n");
}
