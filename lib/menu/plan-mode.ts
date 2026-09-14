import type { SuggestibleProduct } from "@/lib/cart/experience";

export type PlanIntent = "rapido" | "compartir" | "completa";
export type DrinkPreference = "sin-alcohol" | "cerveza" | "cualquiera";

export interface PlanModeConfig {
  intent: PlanIntent;
  diners: number;
  budgetPerPerson: number;
  drinkPreference: DrinkPreference;
}

export interface PlanProposalItem {
  product: SuggestibleProduct;
  quantity: number;
  role: "share" | "main" | "drink" | "sweet";
  roleLabel: string;
}

export interface PlanProposal {
  items: PlanProposalItem[];
  targetTotal: number;
  total: number;
  perPerson: number;
  difference: number;
  fitsBudget: boolean;
  diners: number;
  intent: PlanIntent;
}

const SHARE = new Set(["entradas"]);
const MAIN = new Set(["patacones-insignia", "hamburguesas", "bowls"]);
const DRINK_NON_ALCOHOLIC = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
]);
const DRINK_BEER = new Set(["cervezas"]);
const DRINK_ANY = new Set([
  ...DRINK_NON_ALCOHOLIC,
  "cervezas",
  "cocteles",
]);
const SWEET = new Set(["postre"]);

const ROLE_LABELS: Record<PlanProposalItem["role"], string> = {
  share: "Para compartir",
  main: "Plato fuerte",
  drink: "Bebida",
  sweet: "Cierre dulce",
};

function availableIn(
  products: SuggestibleProduct[],
  categories: Set<string>,
): SuggestibleProduct[] {
  return products
    .filter(
      (product) =>
        product.disponible &&
        !!product.categoriaSlug &&
        categories.has(product.categoriaSlug),
    )
    .sort((a, b) => a.precio - b.precio || a.nombre.localeCompare(b.nombre));
}

function chooseProduct(
  candidates: SuggestibleProduct[],
  targetUnitPrice: number,
  usedIds: Set<string>,
): SuggestibleProduct | undefined {
  if (candidates.length === 0) return undefined;

  const unique = candidates.filter((product) => !usedIds.has(product.id));
  const pool = unique.length > 0 ? unique : candidates;
  const underTarget = pool.filter((product) => product.precio <= targetUnitPrice);

  if (underTarget.length > 0) {
    return underTarget.at(-1);
  }

  return pool[0];
}

function addUnits(
  output: PlanProposalItem[],
  candidates: SuggestibleProduct[],
  units: number,
  targetBudget: number,
  role: PlanProposalItem["role"],
) {
  if (units <= 0 || candidates.length === 0) return;

  const targetUnitPrice = targetBudget / units;
  const usedIds = new Set<string>();

  for (let index = 0; index < units; index += 1) {
    const product = chooseProduct(candidates, targetUnitPrice, usedIds);
    if (!product) break;
    usedIds.add(product.id);

    const existing = output.find(
      (item) => item.product.id === product.id && item.role === role,
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      output.push({
        product,
        quantity: 1,
        role,
        roleLabel: ROLE_LABELS[role],
      });
    }
  }
}

function getDrinkCategories(preference: DrinkPreference) {
  if (preference === "cerveza") return DRINK_BEER;
  if (preference === "cualquiera") return DRINK_ANY;
  return DRINK_NON_ALCOHOLIC;
}

export function buildPlanProposal(
  products: SuggestibleProduct[],
  config: PlanModeConfig,
): PlanProposal {
  const diners = Math.min(8, Math.max(1, Math.round(config.diners)));
  const targetTotal = Math.max(0, config.budgetPerPerson) * diners;
  const output: PlanProposalItem[] = [];

  const shares = availableIn(products, SHARE);
  const mains = availableIn(products, MAIN);
  const drinks = availableIn(products, getDrinkCategories(config.drinkPreference));
  const sweets = availableIn(products, SWEET);

  if (config.intent === "rapido") {
    addUnits(output, mains, diners, targetTotal * 0.75, "main");
    addUnits(output, drinks, diners, targetTotal * 0.25, "drink");
  }

  if (config.intent === "compartir") {
    const shareUnits = Math.max(1, Math.ceil(diners / 3));
    const mainUnits = Math.max(1, Math.ceil(diners / 2));
    addUnits(output, shares, shareUnits, targetTotal * 0.25, "share");
    addUnits(output, mains, mainUnits, targetTotal * 0.45, "main");
    addUnits(output, drinks, diners, targetTotal * 0.3, "drink");
  }

  if (config.intent === "completa") {
    const shareUnits = diners > 1 ? Math.max(1, Math.ceil(diners / 3)) : 0;
    const sweetUnits = Math.max(1, Math.ceil(diners / 2));
    addUnits(output, shares, shareUnits, targetTotal * 0.15, "share");
    addUnits(output, mains, diners, targetTotal * 0.55, "main");
    addUnits(output, drinks, diners, targetTotal * 0.2, "drink");
    addUnits(output, sweets, sweetUnits, targetTotal * 0.1, "sweet");
  }

  const total = output.reduce(
    (sum, item) => sum + item.product.precio * item.quantity,
    0,
  );
  const difference = targetTotal - total;

  return {
    items: output,
    targetTotal,
    total,
    perPerson: diners > 0 ? Math.round(total / diners) : total,
    difference,
    fitsBudget: total <= targetTotal,
    diners,
    intent: config.intent,
  };
}

export const PLAN_INTENTS: Array<{
  id: PlanIntent;
  title: string;
  description: string;
}> = [
  {
    id: "rapido",
    title: "Rápido y contundente",
    description: "Un fuerte por persona y una bebida. Menos pasos, decisión más rápida.",
  },
  {
    id: "compartir",
    title: "Compartir y picar",
    description: "Entradas al centro, algunos fuertes y bebidas para una mesa más social.",
  },
  {
    id: "completa",
    title: "Mesa completa",
    description: "Entrada, fuerte, bebida y cierre dulce dentro de una referencia de presupuesto.",
  },
];

export const PLAN_BUDGETS = [30000, 45000, 60000, 80000];
