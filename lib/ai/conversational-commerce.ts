import type { SuggestibleProduct } from "@/lib/cart/experience";
import {
  buildPlanProposal,
  type DrinkPreference,
  type PlanIntent,
} from "@/lib/menu/plan-mode";

export interface CommerceProduct extends SuggestibleProduct {
  descripcion?: string;
}

export interface CommerceProposalItem {
  product: SuggestibleProduct;
  quantity: number;
  role: "share" | "main" | "drink" | "sweet";
  roleLabel: string;
}

export interface ConversationalProposal {
  id: string;
  items: CommerceProposalItem[];
  diners: number;
  intent: PlanIntent;
  intentLabel: string;
  drinkPreference: DrinkPreference;
  targetTotal: number;
  total: number;
  perPerson: number;
  fitsBudget: boolean;
  budgetWasExplicit: boolean;
  assumptions: string[];
}

export interface CommerceAnalysis {
  foodIntent: boolean;
  diners?: number;
  budgetPerPerson?: number;
  budgetTotal?: number;
  intent: PlanIntent;
  drinkPreference: DrinkPreference;
  vegetarian: boolean;
  noSpicy: boolean;
  groupWithoutCount: boolean;
  requiresHumanValidation: boolean;
  validationReason?: string;
}

const INTENT_LABELS: Record<PlanIntent, string> = {
  rapido: "Rápido y contundente",
  compartir: "Para compartir",
  completa: "Mesa completa",
};

const NUMBER_WORDS: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const DRINK_CATEGORIES = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
  "cervezas",
  "cocteles",
]);

const SAFE_VEGETARIAN_CATEGORIES = new Set([
  ...DRINK_CATEGORIES,
  "postre",
]);

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function lastNumericDiners(text: string) {
  const patterns = [
    /(?:somos|seremos|para|mesa\s+para)\s+(\d{1,2})\b/g,
    /\b(\d{1,2})\s+(?:personas?|adultos?|comensales?)\b/g,
  ];

  const matches: Array<{ index: number; value: number }> = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 20) {
        matches.push({ index: match.index ?? 0, value });
      }
    }
  }

  const wordPattern = new RegExp(
    `(?:somos|seremos|para|mesa\\s+para)\\s+(${Object.keys(NUMBER_WORDS).join("|")})\\b`,
    "g",
  );
  for (const match of text.matchAll(wordPattern)) {
    const value = NUMBER_WORDS[match[1]];
    if (value) matches.push({ index: match.index ?? 0, value });
  }

  return matches.sort((a, b) => a.index - b.index).at(-1)?.value;
}

function parseMoney(text: string) {
  const candidates: Array<{ index: number; value: number; perPerson: boolean }> = [];

  const pushCandidate = (index: number, value: number, rawLength: number) => {
    if (!Number.isFinite(value) || value < 10_000 || value > 2_000_000) return;
    const window = text.slice(Math.max(0, index - 24), index + rawLength + 36);
    candidates.push({
      index,
      value: Math.round(value),
      perPerson: /(por\s+persona|cada\s+uno|c\/u|por\s+cabeza)/.test(window),
    });
  };

  for (const match of text.matchAll(/\b(\d{1,3}(?:[.\s]\d{3})+|\d{4,7})\b/g)) {
    const raw = match[1];
    const value = Number(raw.replace(/[.\s]/g, ""));
    pushCandidate(match.index ?? 0, value, match[0].length);
  }

  for (const match of text.matchAll(/\b(\d{1,4}(?:[.,]\d+)?)\s*(mil|k)\b/g)) {
    const value = Number(match[1].replace(",", ".")) * 1000;
    pushCandidate(match.index ?? 0, value, match[0].length);
  }

  return candidates.sort((a, b) => a.index - b.index).at(-1);
}

export function analyzeCommerceRequest(transcript: string): CommerceAnalysis {
  const text = normalizeText(transcript);
  const diners = lastNumericDiners(text);
  const money = parseMoney(text);

  const foodIntent =
    /(comer|comida|hambre|pedir|pedido|domicilio|recomiend|que\s+pedimos|que\s+comemos|menu|patacon|hamburgues|burger|cayeye|bowl|entrada|cerveza|coctel|limonada|soda)/.test(
      text,
    );

  const groupWithoutCount =
    !diners && /(somos\s+varios|grupo|familia|con\s+amigos|varias\s+personas)/.test(text);

  const requiresHumanValidation =
    /(alerg|anafil|celiac|gluten|intoler|lactos|mani|nueces?|marisco|vegano|vegan\b)/.test(text);

  let validationReason: string | undefined;
  if (requiresHumanValidation) {
    validationReason =
      "La solicitud incluye una alergia o restricción que requiere validación humana de ingredientes y posible contaminación cruzada.";
  }

  const vegetarian = /(vegetarian|sin\s+carne)/.test(text) && !/(vegano|vegan\b)/.test(text);
  const noSpicy = /(sin\s+picante|no\s+picante|nada\s+picante|sin\s+aji)/.test(text);

  let drinkPreference: DrinkPreference = "sin-alcohol";
  if (/(cerveza|birra)/.test(text) && !/(sin\s+alcohol|no\s+alcohol)/.test(text)) {
    drinkPreference = "cerveza";
  } else if (/(coctel|alcohol|trago)/.test(text) && !/(sin\s+alcohol|no\s+alcohol)/.test(text)) {
    drinkPreference = "cualquiera";
  }

  let intent: PlanIntent;
  if (/(compart|picar|al\s+centro|entre\s+todos)/.test(text)) {
    intent = "compartir";
  } else if (/(completa|entrada.*fuerte|postre|experiencia|comer\s+bien|cena\s+completa)/.test(text)) {
    intent = "completa";
  } else if (/(rapido|rapida|sencillo|sin\s+complicar|algo\s+facil)/.test(text)) {
    intent = "rapido";
  } else {
    intent = diners && diners >= 3 ? "compartir" : "rapido";
  }

  const budgetPerPerson = money?.perPerson ? money.value : undefined;
  const budgetTotal = money && !money.perPerson ? money.value : undefined;

  return {
    foodIntent,
    diners,
    budgetPerPerson,
    budgetTotal,
    intent,
    drinkPreference,
    vegetarian,
    noSpicy,
    groupWithoutCount,
    requiresHumanValidation,
    validationReason,
  };
}

function eligibleProducts(products: CommerceProduct[], analysis: CommerceAnalysis) {
  return products.filter((product) => {
    if (!product.disponible) return false;
    if (product.categoriaSlug === "menu-infantil") return false;

    const searchable = normalizeText(`${product.nombre} ${product.descripcion ?? ""}`);

    if (analysis.noSpicy && /(jalapeno|picante|aji\b)/.test(searchable)) {
      return false;
    }

    if (analysis.vegetarian) {
      if (SAFE_VEGETARIAN_CATEGORIES.has(product.categoriaSlug ?? "")) return true;
      if (product.slug === "vegetariano") return true;
      if (product.categoriaSlug === "entradas") {
        return !/(chicharr|carne|pollo|choriz|salchicha|costilla)/.test(searchable);
      }
      return false;
    }

    return true;
  });
}

export function buildConversationalProposal(
  products: CommerceProduct[],
  analysis: CommerceAnalysis,
): ConversationalProposal | null {
  if (!analysis.foodIntent || analysis.requiresHumanValidation || analysis.groupWithoutCount) {
    return null;
  }

  if (analysis.diners && analysis.diners > 8) return null;

  const diners = analysis.diners ?? 1;
  const explicitBudget = analysis.budgetPerPerson ?? analysis.budgetTotal;
  const budgetPerPerson = analysis.budgetPerPerson
    ? analysis.budgetPerPerson
    : analysis.budgetTotal
      ? Math.max(10_000, Math.floor(analysis.budgetTotal / diners))
      : 45_000;

  const proposal = buildPlanProposal(eligibleProducts(products, analysis), {
    diners,
    intent: analysis.intent,
    budgetPerPerson,
    drinkPreference: analysis.drinkPreference,
  });

  if (!proposal.items.length) return null;

  const assumptions: string[] = [];
  if (!analysis.diners) {
    assumptions.push("Asumí 1 persona porque no indicaste cuántos son.");
  }
  if (!explicitBudget) {
    assumptions.push(
      "Usé $45.000 COP por persona como referencia de presupuesto; no es una promoción ni un precio fijo.",
    );
  }
  if (analysis.vegetarian) {
    assumptions.push(
      "Filtré carnes identificables en la carta; para restricciones estrictas confirma ingredientes y contaminación cruzada con el equipo.",
    );
  }
  if (analysis.noSpicy) {
    assumptions.push("Excluí productos descritos explícitamente con jalapeño o picante.");
  }

  const items: CommerceProposalItem[] = proposal.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
    role: item.role,
    roleLabel: item.roleLabel,
  }));

  const id = [
    analysis.intent,
    diners,
    proposal.total,
    ...items.map((item) => `${item.product.slug}x${item.quantity}`),
  ].join(":");

  return {
    id,
    items,
    diners,
    intent: analysis.intent,
    intentLabel: INTENT_LABELS[analysis.intent],
    drinkPreference: analysis.drinkPreference,
    targetTotal: proposal.targetTotal,
    total: proposal.total,
    perPerson: proposal.perPerson,
    fitsBudget: proposal.fitsBudget,
    budgetWasExplicit: Boolean(explicitBudget),
    assumptions,
  };
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")} COP`;
}

export function proposalContextForModel(proposal: ConversationalProposal | null) {
  if (!proposal) return "No hay una propuesta transaccional calculada para este turno.";

  const items = proposal.items
    .map(
      (item) =>
        `- ${item.quantity} x ${item.product.nombre} (${item.roleLabel}): ${money(item.product.precio)} c/u`,
    )
    .join("\n");

  return [
    "PROPUESTA TRANSACCIONAL CALCULADA POR EL SISTEMA",
    `Plan: ${proposal.intentLabel}`,
    `Personas: ${proposal.diners}`,
    items,
    `Total calculado: ${money(proposal.total)}`,
    `Por persona: ${money(proposal.perPerson)}`,
    `Referencia máxima usada: ${money(proposal.targetTotal)}`,
    `Dentro de referencia: ${proposal.fitsBudget ? "sí" : "no"}`,
    proposal.assumptions.length
      ? `Supuestos transparentes: ${proposal.assumptions.join(" | ")}`
      : "Sin supuestos adicionales.",
    "No cambies productos, cantidades, precios ni total de esta propuesta en tu respuesta. Resume por qué encaja y dile al usuario que puede añadirla completa a Mesa Visual.",
  ].join("\n");
}

export function deterministicCommerceReply(
  analysis: CommerceAnalysis,
  proposal: ConversationalProposal | null,
) {
  if (analysis.requiresHumanValidation) {
    return "Puedo orientarte, pero no voy a asumir ingredientes ni ausencia de contaminación cruzada. Esa restricción necesita validación del equipo; usa WhatsApp para confirmarla antes de pedir.";
  }

  if (analysis.groupWithoutCount) {
    return "Te ayudo a armar la mesa. ¿Cuántas personas son? Si además me das un presupuesto aproximado y si quieren alcohol o no, puedo dejarte una propuesta completa lista para agregar.";
  }

  if (analysis.diners && analysis.diners > 8) {
    return "Para un grupo de más de 8 personas prefiero no construir una mesa automática sin más contexto. Dime si buscan compartir, una cena completa o un evento, y el equipo puede ayudarte a cerrar la mejor opción.";
  }

  if (!proposal) {
    return "Puedo ayudarte con menú, pedidos, reservas y eventos. Si quieres una propuesta de comida, dime cuántas personas son, presupuesto aproximado y si prefieren bebidas sin alcohol o cerveza.";
  }

  const summary = proposal.items
    .map((item) => `${item.quantity}× ${item.product.nombre}`)
    .join(", ");
  const budgetLine = proposal.budgetWasExplicit
    ? proposal.fitsBudget
      ? "Queda dentro de la referencia que me diste."
      : "Supera la referencia que me diste; puedes ajustarla antes de pagar."
    : "Usé una referencia de $45.000 COP por persona para construirla.";

  return `Te armé una propuesta para ${proposal.diners}: ${summary}. Total de referencia: ${money(proposal.total)} (${money(proposal.perPerson)} por persona). ${budgetLine} Puedes añadirla completa a Mesa Visual y ajustarla antes del checkout.`;
}
