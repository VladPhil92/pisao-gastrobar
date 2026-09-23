import type { CartItem } from "@/lib/cart/types";

export type AdaptiveDaypart = "preopen" | "afternoon" | "dinner" | "night" | "closed";

export interface AdaptiveMenuProduct {
  id: string;
  slug: string;
  precio: number;
  disponible: boolean;
  inventarioBajo?: boolean;
  categoriaSlug?: string;
  imagenUrl?: string | null;
}

export interface AdaptiveMenuContext {
  daypart: AdaptiveDaypart;
  isWeekend: boolean;
  hour: number;
  label: string;
  description: string;
}

export interface AdaptiveRankedProduct<T> {
  product: T;
  score: number;
  reason: string;
}

const MAIN_CATEGORIES = new Set([
  "patacones-insignia",
  "hamburguesas",
  "bowls",
]);

const DRINK_CATEGORIES = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
  "cervezas",
  "cocteles",
]);

const NON_ALCOHOLIC_DRINKS = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
]);

const SOCIAL_CATEGORIES = new Set([
  "entradas",
  "cervezas",
  "cocteles",
]);

function getCartagenaClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "12");
  const isWeekend = weekday === "Fri" || weekday === "Sat" || weekday === "Sun";

  return { weekday, hour, isWeekend };
}

export function getAdaptiveMenuContext(now = new Date()): AdaptiveMenuContext {
  const { hour, isWeekend } = getCartagenaClock(now);
  const openingHour = isWeekend ? 14 : 16;

  let daypart: AdaptiveDaypart;
  if (hour < openingHour) daypart = "preopen";
  else if (hour < 17) daypart = "afternoon";
  else if (hour < 20) daypart = "dinner";
  else if (hour < 22) daypart = "night";
  else daypart = "closed";

  switch (daypart) {
    case "afternoon":
      return {
        daypart,
        isWeekend,
        hour,
        label: "Tarde PISÁO",
        description: "La carta prioriza opciones para compartir y bebidas frías, sin ocultar el resto del menú.",
      };
    case "dinner":
      return {
        daypart,
        isWeekend,
        hour,
        label: "Hora de comer",
        description: "Platos fuertes y entradas suben primero; tu Mesa Visual puede cambiar el orden con complementos.",
      };
    case "night":
      return {
        daypart,
        isWeekend,
        hour,
        label: "Noche en la terraza",
        description: "La prioridad combina platos fuertes, opciones para compartir y barra, siempre según disponibilidad real.",
      };
    case "closed":
      return {
        daypart,
        isWeekend,
        hour,
        label: "Para tu próxima mesa",
        description: "PISÁO ya cerró por hoy; puedes explorar la carta completa y preparar tu próxima selección.",
      };
    default:
      return {
        daypart,
        isWeekend,
        hour,
        label: "Para cuando abramos",
        description: "La carta está preparada para ayudarte a decidir antes del servicio, sin cambiar precios ni disponibilidad.",
      };
  }
}

function categoryOf(value?: string | null) {
  return value ?? "";
}

function scoreDaypart(category: string, context: AdaptiveMenuContext) {
  switch (context.daypart) {
    case "afternoon":
      if (category === "entradas") return 5;
      if (NON_ALCOHOLIC_DRINKS.has(category)) return 5;
      if (MAIN_CATEGORIES.has(category)) return 2;
      if (category === "cervezas") return 1;
      return 0;
    case "dinner":
      if (MAIN_CATEGORIES.has(category)) return 7;
      if (category === "entradas") return 4;
      if (NON_ALCOHOLIC_DRINKS.has(category)) return 2;
      if (category === "cervezas") return 2;
      return 0;
    case "night":
      if (MAIN_CATEGORIES.has(category)) return 5;
      if (category === "cervezas" || category === "cocteles") return 6;
      if (category === "entradas") return 4;
      if (category === "postre") return 2;
      return 0;
    case "closed":
    case "preopen":
      if (MAIN_CATEGORIES.has(category)) return 4;
      if (category === "entradas") return 2;
      if (NON_ALCOHOLIC_DRINKS.has(category)) return 1;
      return 0;
  }
}

function getReason(
  category: string,
  context: AdaptiveMenuContext,
  hasMain: boolean,
  hasDrink: boolean,
  hasDessert: boolean,
) {
  if (hasMain && !hasDrink && DRINK_CATEGORIES.has(category)) return "Completa tu mesa";
  if (hasMain && hasDrink && !hasDessert && category === "postre") return "Para cerrar la mesa";
  if (!hasMain && hasDrink && MAIN_CATEGORIES.has(category)) return "Equilibra tu mesa";
  if (context.isWeekend && SOCIAL_CATEGORIES.has(category)) return "Prioridad de fin de semana";
  if (context.daypart === "afternoon" && NON_ALCOHOLIC_DRINKS.has(category)) return "Prioridad de tarde";
  if (context.daypart === "dinner" && MAIN_CATEGORIES.has(category)) return "Prioridad de cena";
  if (context.daypart === "night" && (category === "cervezas" || category === "cocteles")) return "Prioridad de noche";
  if (MAIN_CATEGORIES.has(category)) return "Plato fuerte";
  if (category === "entradas") return "Para abrir la mesa";
  if (category === "postre") return "Final dulce";
  return "Selección PISÁO";
}

export function rankAdaptiveMenu<T extends AdaptiveMenuProduct>(
  products: T[],
  cartItems: CartItem[],
  activeCategory: string | null,
  now = new Date(),
): { context: AdaptiveMenuContext; ranked: AdaptiveRankedProduct<T>[] } {
  const context = getAdaptiveMenuContext(now);
  const cartCategories = new Set(cartItems.map((item) => categoryOf(item.categoriaSlug)));
  const hasMain = [...cartCategories].some((category) => MAIN_CATEGORIES.has(category));
  const hasDrink = [...cartCategories].some((category) => DRINK_CATEGORIES.has(category));
  const hasDessert = cartCategories.has("postre");
  const cartProductIds = new Set(cartItems.map((item) => item.productoId));

  const ranked = products.map((product, index) => {
    const category = categoryOf(product.categoriaSlug);
    let score = product.disponible ? 100 : -1000;

    // Low stock remains directly purchasable, but is deliberately pushed
    // out of proactive discovery surfaces until operations normalize it.
    if (product.inventarioBajo) score -= 60;

    score += scoreDaypart(category, context);

    if (context.isWeekend && SOCIAL_CATEGORIES.has(category)) score += 2;
    if (activeCategory && category === activeCategory) score += 12;

    if (hasMain && !hasDrink && DRINK_CATEGORIES.has(category)) score += 10;
    if (hasMain && hasDrink && !hasDessert && category === "postre") score += 9;
    if (!hasMain && hasDrink && MAIN_CATEGORIES.has(category)) score += 8;

    // Kids remains opt-in: never surface it automatically unless the customer
    // explicitly filtered it or already has a kids item in the current table.
    if (
      category === "menu-infantil" &&
      activeCategory !== "menu-infantil" &&
      !cartCategories.has("menu-infantil")
    ) {
      score -= 40;
    }

    // Preserve variety in discovery rails while keeping already selected items visible.
    if (cartProductIds.has(product.id)) score -= 2;

    // Stable tie-breaker: keep the source menu order when contextual scores match.
    score -= index / 1000;

    return {
      product,
      score,
      reason: getReason(category, context, hasMain, hasDrink, hasDessert),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return { context, ranked };
}
