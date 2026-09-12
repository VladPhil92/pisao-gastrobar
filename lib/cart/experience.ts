import type { CartItem } from "./types";

export interface SuggestibleProduct {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  imagenUrl?: string | null;
  disponible: boolean;
  categoriaSlug?: string;
}

const MAIN_CATEGORIES = new Set([
  "patacones-insignia",
  "hamburguesas",
  "bowls",
  "menu-infantil",
]);

const DRINK_CATEGORIES = new Set([
  "sodas-saborizadas",
  "limonadas",
  "gaseosas-y-bebidas",
  "cervezas",
  "cocteles",
]);

export interface TableMoment {
  id: "share" | "main" | "drink" | "sweet";
  label: string;
  complete: boolean;
}

export function getTableMoments(items: CartItem[]): TableMoment[] {
  const categories = new Set(
    items.map((item) => item.categoriaSlug).filter(Boolean) as string[],
  );

  return [
    { id: "share", label: "Para compartir", complete: categories.has("entradas") },
    {
      id: "main",
      label: "Plato fuerte",
      complete: [...categories].some((category) => MAIN_CATEGORIES.has(category)),
    },
    {
      id: "drink",
      label: "Bebida",
      complete: [...categories].some((category) => DRINK_CATEGORIES.has(category)),
    },
    { id: "sweet", label: "Algo dulce", complete: categories.has("postre") },
  ];
}

function firstAvailable(
  products: SuggestibleProduct[],
  categories: Set<string>,
  excludedIds: Set<string>,
) {
  return products.find(
    (product) =>
      product.disponible &&
      !excludedIds.has(product.id) &&
      !!product.categoriaSlug &&
      categories.has(product.categoriaSlug),
  );
}

export function getTableSuggestions(
  products: SuggestibleProduct[],
  items: CartItem[],
): SuggestibleProduct[] {
  const moments = getTableMoments(items);
  const excludedIds = new Set(items.map((item) => item.productoId));
  const suggestions: SuggestibleProduct[] = [];

  const add = (product?: SuggestibleProduct) => {
    if (!product || suggestions.some((item) => item.id === product.id)) return;
    suggestions.push(product);
  };

  if (!moments.find((moment) => moment.id === "main")?.complete) {
    add(firstAvailable(products, MAIN_CATEGORIES, excludedIds));
  }

  if (!moments.find((moment) => moment.id === "drink")?.complete) {
    add(firstAvailable(products, DRINK_CATEGORIES, excludedIds));
  }

  if (!moments.find((moment) => moment.id === "share")?.complete) {
    add(firstAvailable(products, new Set(["entradas"]), excludedIds));
  }

  if (
    moments.find((moment) => moment.id === "main")?.complete &&
    moments.find((moment) => moment.id === "drink")?.complete
  ) {
    add(firstAvailable(products, new Set(["postre"]), excludedIds));
  }

  return suggestions.slice(0, 3);
}

export function getTableCompletion(items: CartItem[]) {
  const moments = getTableMoments(items);
  const complete = moments.filter((moment) => moment.complete).length;
  return {
    complete,
    total: moments.length,
    percent: Math.round((complete / moments.length) * 100),
  };
}
