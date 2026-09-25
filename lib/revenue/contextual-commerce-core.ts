export const CONTEXTUAL_COMMERCE_VERSION = "contextual_commerce_v18";

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
};

export type ContextualCommerceAction = {
  type: "REPEAT_FAVORITE" | "COMPLEMENT_TABLE" | "DISCOVER_PRODUCT";
  productId: string;
  productName: string;
  productSlug: string;
  category: string | null;
  currentPrice: number;
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

const DRINK_CATEGORIES = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
  "cervezas",
  "cocteles",
]);
const MAIN_CATEGORIES = new Set([
  "patacones-insignia",
  "hamburguesas",
  "bowls",
]);
const SHARE_CATEGORIES = new Set(["entradas"]);
const SWEET_CATEGORIES = new Set(["postre"]);

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

function eligibleProducts(products: ContextualCommerceProduct[]) {
  return products.filter((product) => {
    if (!product.available || product.lowInventory === true) return false;
    if (!product.name.trim() || !product.slug.trim()) return false;
    if (!Number.isFinite(product.price) || product.price <= 0) return false;
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
    "CONTEXTUAL COMMERCE V18 — ONE OPTIONAL NEXT BEST ACTION",
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
        "CONTEXTUAL COMMERCE V18 SUPRIMIDO: la solicitud requiere validación humana; no introduzcas una recomendación comercial automática.",
    };
  }

  if (input.reservationIntent) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "SUPPRESSED",
      suppressionReason: "reservation_priority",
      action: null,
      context:
        "CONTEXTUAL COMMERCE V18 SUPRIMIDO: completa primero la intención de reserva; no desvíes el turno hacia venta adicional.",
    };
  }

  if (input.experimentEligible || input.adaptivePolicyRelevant) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "SUPPRESSED",
      suppressionReason: "controlled_revenue_layer",
      action: null,
      context:
        "CONTEXTUAL COMMERCE V18 SUPRIMIDO: existe una capa controlada de experimentación o política adaptativa relevante; no añadas una segunda intervención comercial.",
    };
  }

  const text = normalize(input.latestUserMessage);
  const repeatIntent =
    /(lo de siempre|repetir|repite|otra vez|mi favorito|mi favorita|lo que suelo|pedido anterior|pedir de nuevo)/.test(
      text,
    );
  const drinkIntent =
    /(bebida|tomar|cerveza|birra|coctel|limonada|soda|gaseosa)/.test(text);
  const sweetIntent = /(postre|dulce|algo dulce)/.test(text);
  const shareIntent = /(entrada|picar|para compartir|al centro)/.test(text);
  const complementIntent =
    /(acompan|complement|que mas|qué mas|agregar|anadir|añadir|sumar|con esto)/.test(
      text,
    );
  const discoveryIntent =
    /(recomiend|sugier|que pido|qué pido|quiero probar|sorprendeme|sorpréndeme|algo nuevo|algo diferente)/.test(
      text,
    );
  const noveltyIntent = /(algo nuevo|algo diferente|quiero probar|sorprendeme|sorpréndeme)/.test(
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
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "NO_ACTION",
      suppressionReason: null,
      action: null,
      context:
        "CONTEXTUAL COMMERCE V18: no hay una intención explícita que justifique una sugerencia comercial adicional en este turno.",
    };
  }

  const favoriteByName = favoriteMap(input.favorites);
  const activeIds = new Set(input.activeProposalProductIds ?? []);
  const available = eligibleProducts(input.products);

  let candidates = available.filter((product) => !activeIds.has(product.id));
  let actionType: ContextualCommerceAction["type"] = "DISCOVER_PRODUCT";
  let reason: ContextualCommerceAction["reason"] = "guided_discovery";
  let requiredMoment: string | null = null;

  if (repeatIntent && input.lifecycleMode !== "ANONYMOUS") {
    candidates = candidates.filter((product) =>
      favoriteByName.has(normalize(product.name)),
    );
    actionType = "REPEAT_FAVORITE";
    reason = "explicit_repeat";
  } else if (drinkIntent) {
    requiredMoment = "drink";
    candidates = candidates.filter((product) => matchesMoment(product, requiredMoment));
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
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "NO_ACTION",
      suppressionReason: null,
      action: null,
      context:
        "CONTEXTUAL COMMERCE V18: no existe un producto elegible que satisfaga la intención actual sin violar disponibilidad, inventario o guardrails comerciales.",
    };
  }

  const returning =
    input.lifecycleMode === "RETURNING" ||
    input.lifecycleMode === "LOYALTY" ||
    input.lifecycleMode === "RETURN_RECOVERY";

  const ranked = candidates
    .map((product) => {
      const favoriteUnits = favoriteByName.get(normalize(product.name)) ?? 0;
      const favoriteScore =
        returning && !noveltyIntent ? Math.min(60, favoriteUnits * 5) : 0;
      const repeatScore = repeatIntent && favoriteUnits > 0 ? 220 : 0;
      const categoryScore = requiredMoment ? 140 : 0;
      const completionScore = reason === "table_completion" ? 40 : 0;
      const discoveryScore = discoveryIntent ? 35 : 0;
      return {
        product,
        score:
          repeatScore +
          categoryScore +
          completionScore +
          discoveryScore +
          favoriteScore +
          marginAdjustment(product),
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

  const selected = ranked[0]?.product;
  if (!selected) {
    return {
      version: CONTEXTUAL_COMMERCE_VERSION,
      status: "NO_ACTION",
      suppressionReason: null,
      action: null,
      context: "CONTEXTUAL COMMERCE V18: sin acción aplicable.",
    };
  }

  const action: ContextualCommerceAction = {
    type: actionType,
    productId: selected.id,
    productName: selected.name,
    productSlug: selected.slug,
    category: selected.category ?? null,
    currentPrice: selected.price,
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
