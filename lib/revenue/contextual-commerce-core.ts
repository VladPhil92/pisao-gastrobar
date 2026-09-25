import {
  closedLoopAdjustment,
  type ClosedLoopSignal,
} from "./closed-loop-recommendation-core";

export const CONTEXTUAL_COMMERCE_VERSION = "contextual_commerce_v20";

export type ContextualLifecycleMode =
  | "ANONYMOUS"
  | "FIRST_PURCHASE"
  | "RETURNING"
  | "LOYALTY"
  | "RETURN_RECOVERY";

export type ContextualFavorite = {
  name: string;
  units: number;
};

export type ContextualCommerceProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  price: number;
  cost?: number | null;
  available: boolean;
  lowInventory?: boolean;
};

export type ContextualCommerceInput = {
  latestUserMessage: string;
  lifecycleMode: ContextualLifecycleMode;
  favorites: ContextualFavorite[];
  products: ContextualCommerceProduct[];
  activeProposalProductIds?: string[];
  activeProposalCategories?: string[];
  reservationIntent?: boolean;
  requiresHumanValidation?: boolean;
  experimentEligible?: boolean;
  adaptivePolicyRelevant?: boolean;
  vegetarian?: boolean;
  noSpicy?: boolean;
  drinkPreference?: "sin-alcohol" | "cerveza" | "cualquiera";
  maxSuggestedUnitPrice?: number;
  learningSignals?: ClosedLoopSignal[];
};

export type ContextualCommerceAction = {
  type: "REPEAT_FAVORITE" | "COMPLEMENT_TABLE" | "DISCOVER_PRODUCT";
  productId: string;
  productName: string;
  productSlug: string;
  category: string | null;
  currentPrice: number;
  learning: {
    applied: boolean;
    adjustment: number;
    exposures: number;
  };
  reason:
    | "explicit_repeat"
    | "explicit_category"
    | "table_completion"
    | "guided_discovery";
};

export type ContextualCommerceGuidance = {
  version: typeof CONTEXTUAL_COMMERCE_VERSION;
  status: "READY" | "NO_ACTION" | "SUPPRESSED";
  suppressionReason:
    | "reservation_priority"
    | "human_validation_required"
    | "controlled_revenue_layer"
    | null;
  action: ContextualCommerceAction | null;
  context: string;
};

const DRINK_NON_ALCOHOLIC = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
]);
const DRINK_BEER = new Set(["cervezas"]);
const DRINK_COCKTAIL = new Set(["cocteles"]);
const DRINK_CATEGORIES = new Set([
  ...DRINK_NON_ALCOHOLIC,
  ...DRINK_BEER,
  ...DRINK_COCKTAIL,
]);
const MAIN_CATEGORIES = new Set([
  "patacones-insignia",
  "hamburguesas",
  "bowls",
]);
const SHARE_CATEGORIES = new Set(["entradas"]);
const SWEET_CATEGORIES = new Set(["postre"]);
const SAFE_VEGETARIAN_CATEGORIES = new Set([
  ...DRINK_CATEGORIES,
  ...SWEET_CATEGORIES,
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function safeUnits(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function contributionMarginPct(product: ContextualCommerceProduct) {
  if (
    product.cost == null ||
    !Number.isFinite(product.cost) ||
    !Number.isFinite(product.price) ||
    product.price <= 0
  ) {
    return null;
  }
  return ((product.price - product.cost) / product.price) * 100;
}

function vegetarianEligible(product: ContextualCommerceProduct) {
  const category = product.category ?? "";
  const searchable = normalize(`${product.name} ${product.description ?? ""}`);

  if (SAFE_VEGETARIAN_CATEGORIES.has(category)) return true;
  if (product.slug === "vegetariano") return true;
  if (category === "entradas") {
    return !/(chicharr|carne|pollo|choriz|salchicha|costilla)/.test(searchable);
  }
  return false;
}

function eligibleProducts(
  products: ContextualCommerceProduct[],
  input: ContextualCommerceInput,
) {
  return products.filter((product) => {
    if (!product.available || product.lowInventory === true) return false;
    if (!product.name.trim() || !product.slug.trim()) return false;
    if (!Number.isFinite(product.price) || product.price <= 0) return false;

    if (
      input.maxSuggestedUnitPrice &&
      Number.isFinite(input.maxSuggestedUnitPrice) &&
      input.maxSuggestedUnitPrice > 0 &&
      product.price > input.maxSuggestedUnitPrice
    ) {
      return false;
    }

    const searchable = normalize(`${product.name} ${product.description ?? ""}`);
    if (input.noSpicy && /(jalapeno|picante|aji\b)/.test(searchable)) {
      return false;
    }
    if (input.vegetarian && !vegetarianEligible(product)) {
      return false;
    }

    const margin = contributionMarginPct(product);
    return margin == null || margin > 0;
  });
}

function favoriteMap(favorites: ContextualFavorite[]) {
  const map = new Map<string, number>();
  for (const favorite of favorites) {
    const key = normalize(favorite.name);
    const units = safeUnits(favorite.units);
    if (!key || units <= 0) continue;
    map.set(key, Math.max(map.get(key) ?? 0, units));
  }
  return map;
}

function categoryMoment(category?: string) {
  if (!category) return null;
  if (DRINK_CATEGORIES.has(category)) return "drink";
  if (MAIN_CATEGORIES.has(category)) return "main";
  if (SHARE_CATEGORIES.has(category)) return "share";
  if (SWEET_CATEGORIES.has(category)) return "sweet";
  return null;
}

function missingMoment(categories: string[]) {
  const moments = new Set(categories.map(categoryMoment).filter(Boolean));
  if (!moments.has("main")) return "main";
  if (!moments.has("drink")) return "drink";
  if (!moments.has("share")) return "share";
  if (!moments.has("sweet")) return "sweet";
  return null;
}

function matchesMoment(product: ContextualCommerceProduct, moment: string | null) {
  if (!moment) return true;
  return categoryMoment(product.category) === moment;
}

function drinkCategories(
  text: string,
  preference: ContextualCommerceInput["drinkPreference"],
) {
  if (/(cerveza|birra)/.test(text)) return DRINK_BEER;
  if (/(coctel|trago)/.test(text)) return DRINK_COCKTAIL;
  if (preference === "cerveza") return DRINK_BEER;
  if (preference === "cualquiera" && /(alcohol)/.test(text)) {
    return DRINK_CATEGORIES;
  }
  return DRINK_NON_ALCOHOLIC;
}

function marginAdjustment(product: ContextualCommerceProduct) {
  const margin = contributionMarginPct(product);
  if (margin == null) return 0;
  return Math.max(-8, Math.min(12, (margin - 30) / 4));
}

function actionContext(action: ContextualCommerceAction) {
  const price = Math.round(action.currentPrice).toLocaleString("es-CO");
  const reason =
    action.reason === "explicit_repeat"
      ? "La persona pidió repetir y el producto coincide con una preferencia histórica verificable."
      : action.reason === "explicit_category"
        ? "La persona pidió explícitamente una categoría compatible con este producto."
        : action.reason === "table_completion"
          ? "La persona pidió complementar su mesa y este producto cubre un momento faltante."
          : "La persona pidió una recomendación y este producto pasó los guardrails comerciales y operativos.";

  return [
    "CONTEXTUAL COMMERCE V20 — ONE OPTIONAL NEXT BEST ACTION",
    `Acción: ${action.type}.`,
    `Producto elegible: ${action.productName} — $${price} COP.`,
    `Motivo: ${reason}`,
    "Reglas:",
    "- Preséntalo como máximo como una sugerencia breve y opcional; la intención explícita del cliente manda.",
    "- No agregues productos al carrito ni alteres Mesa Visual sin una autorización transaccional independiente.",
    "- No inventes descuentos, promociones, urgencia, escasez, beneficios, disponibilidad ni redención de puntos.",
    "- No reveles scoring, rentabilidad, costos, segmentación ni lógica interna de selección.",
    "- Si el usuario rechaza la sugerencia, abandónala y continúa con su solicitud sin insistir.",
  ].join("\n");
}

function noAction(context: string): ContextualCommerceGuidance {
  return {
    version: CONTEXTUAL_COMMERCE_VERSION,
    status: "NO_ACTION",
    suppressionReason: null,
    action: null,
    context,
  };
}

export function buildContextualCommerceGuidance(
  input: ContextualCommerceInput,
): ContextualCommerceGuidance {
  if (input.requiresHumanValidation) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "SUPPRESSED",
      suppressionReason: "human_validation_required",
      action: null,
      context:
        "CONTEXTUAL COMMERCE V20 SUPRIMIDO: la solicitud requiere validación humana; no introduzcas una recomendación comercial automática.",
    };
  }

  if (input.reservationIntent) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "SUPPRESSED",
      suppressionReason: "reservation_priority",
      action: null,
      context:
        "CONTEXTUAL COMMERCE V20 SUPRIMIDO: completa primero la intención de reserva; no desvíes el turno hacia venta adicional.",
    };
  }

  if (input.experimentEligible || input.adaptivePolicyRelevant) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "SUPPRESSED",
      suppressionReason: "controlled_revenue_layer",
      action: null,
      context:
        "CONTEXTUAL COMMERCE V20 SUPRIMIDO: existe una capa controlada de experimentación o política adaptativa relevante; no añadas una segunda intervención comercial.",
    };
  }

  const text = normalize(input.latestUserMessage);
  const repeatIntent =
    /(lo de siempre|repetir|repite|otra vez|mi favorito|mi favorita|lo que suelo|pedido anterior|pedir de nuevo)/.test(
      text,
    );
  const drinkIntent =
    /(bebida|tomar|cerveza|birra|coctel|limonada|soda|gaseosa|trago)/.test(text);
  const sweetIntent = /(postre|dulce|algo dulce)/.test(text);
  const shareIntent = /(entrada|picar|para compartir|al centro)/.test(text);
  const complementIntent =
    /(acompan|complement|que mas|agregar|anadir|sumar|con esto)/.test(text);
  const discoveryIntent =
    /(recomiend|sugier|que pido|quiero probar|sorprendeme|algo nuevo|algo diferente)/.test(
      text,
    );
  const noveltyIntent = /(algo nuevo|algo diferente|quiero probar|sorprendeme)/.test(
    text,
  );

  if (
    !repeatIntent &&
    !drinkIntent &&
    !sweetIntent &&
    !shareIntent &&
    !complementIntent &&
    !discoveryIntent
  ) {
    return noAction(
      "CONTEXTUAL COMMERCE V20: no hay una intención explícita que justifique una sugerencia comercial adicional en este turno.",
    );
  }

  const favoriteByName = favoriteMap(input.favorites);
  if (repeatIntent && favoriteByName.size === 0) {
    return noAction(
      "CONTEXTUAL COMMERCE V20: la persona pidió repetir, pero no existe un favorito histórico verificable; no adivines qué pidió antes.",
    );
  }

  const activeIds = new Set(input.activeProposalProductIds ?? []);
  const hasActiveProposal = activeIds.size > 0;

  if (
    hasActiveProposal &&
    discoveryIntent &&
    !repeatIntent &&
    !drinkIntent &&
    !sweetIntent &&
    !shareIntent &&
    !complementIntent
  ) {
    return noAction(
      "CONTEXTUAL COMMERCE V20: ya existe una propuesta calculada para esta intención; no añadas un producto extra fuera de la propuesta.",
    );
  }

  const available = eligibleProducts(input.products, input);
  let candidates = available.filter((product) => !activeIds.has(product.id));
  let actionType: ContextualCommerceAction["type"] = "DISCOVER_PRODUCT";
  let reason: ContextualCommerceAction["reason"] = "guided_discovery";
  let requiredMoment: string | null = null;

  if (repeatIntent) {
    candidates = candidates.filter((product) =>
      favoriteByName.has(normalize(product.name)),
    );
    actionType = "REPEAT_FAVORITE";
    reason = "explicit_repeat";
  } else if (drinkIntent) {
    const allowedDrinkCategories = drinkCategories(text, input.drinkPreference);
    candidates = candidates.filter(
      (product) =>
        Boolean(product.category) &&
        allowedDrinkCategories.has(product.category ?? ""),
    );
    actionType = "DISCOVER_PRODUCT";
    reason = "explicit_category";
  } else if (sweetIntent) {
    requiredMoment = "sweet";
    candidates = candidates.filter((product) => matchesMoment(product, requiredMoment));
    actionType = "DISCOVER_PRODUCT";
    reason = "explicit_category";
  } else if (shareIntent) {
    requiredMoment = "share";
    candidates = candidates.filter((product) => matchesMoment(product, requiredMoment));
    actionType = "DISCOVER_PRODUCT";
    reason = "explicit_category";
  } else if (complementIntent && (input.activeProposalCategories?.length ?? 0) > 0) {
    requiredMoment = missingMoment(input.activeProposalCategories ?? []);
    if (requiredMoment) {
      candidates = candidates.filter((product) => matchesMoment(product, requiredMoment));
      actionType = "COMPLEMENT_TABLE";
      reason = "table_completion";
    }
  }

  if (noveltyIntent) {
    candidates = candidates.filter(
      (product) => !favoriteByName.has(normalize(product.name)),
    );
  }

  if (!candidates.length) {
    return noAction(
      "CONTEXTUAL COMMERCE V20: no existe un producto elegible que satisfaga la intención actual sin violar disponibilidad, inventario, presupuesto o guardrails comerciales.",
    );
  }

  const returning =
    input.lifecycleMode === "RETURNING" ||
    input.lifecycleMode === "LOYALTY" ||
    input.lifecycleMode === "RETURN_RECOVERY";
  const learningBySlug = new Map(
    (input.learningSignals ?? []).map((signal) => [signal.productSlug, signal]),
  );

  const ranked = candidates
    .map((product) => {
      const favoriteUnits = favoriteByName.get(normalize(product.name)) ?? 0;
      const favoriteScore =
        returning && !noveltyIntent ? Math.min(60, favoriteUnits * 5) : 0;
      const repeatScore = repeatIntent && favoriteUnits > 0 ? 220 : 0;
      const categoryScore = drinkIntent || requiredMoment ? 140 : 0;
      const completionScore = reason === "table_completion" ? 40 : 0;
      const discoveryScore = discoveryIntent ? 35 : 0;
      const learning = repeatIntent
        ? {
            eligible: false,
            adjustment: 0,
            exposures: 0,
            addRatePct: 0,
            paidMatchRatePct: 0,
          }
        : closedLoopAdjustment(learningBySlug.get(product.slug));
      return {
        product,
        learning,
        score:
          repeatScore +
          categoryScore +
          completionScore +
          discoveryScore +
          favoriteScore +
          marginAdjustment(product) +
          learning.adjustment,
        favoriteUnits,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.favoriteUnits - a.favoriteUnits ||
        a.product.price - b.product.price ||
        a.product.name.localeCompare(b.product.name),
    );

  const selectedCandidate = ranked[0];
  const selected = selectedCandidate?.product;
  if (!selected) {
    return noAction("CONTEXTUAL COMMERCE V20: sin acción aplicable.");
  }

  const action: ContextualCommerceAction = {
    type: actionType,
    productId: selected.id,
    productName: selected.name,
    productSlug: selected.slug,
    category: selected.category ?? null,
    currentPrice: selected.price,
    learning: {
      applied: selectedCandidate?.learning.eligible === true,
      adjustment: selectedCandidate?.learning.adjustment ?? 0,
      exposures: selectedCandidate?.learning.exposures ?? 0,
    },
    reason,
  };

  return {
    version: CONTEXTUAL_COMMERCE_VERSION,
    status: "READY",
    suppressionReason: null,
    action,
    context: actionContext(action),
  };
}
