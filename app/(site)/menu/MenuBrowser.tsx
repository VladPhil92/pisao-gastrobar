"use client";

import { useMemo, useState } from "react";
import { MenuCard, type MenuCardProduct } from "@/components/menu/MenuCard";
import {
  CategoryFilter,
  type Category,
} from "@/components/menu/CategoryFilter";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";

export function MenuBrowser({
  categories,
  products,
}: {
  categories: Category[];
  products: (MenuCardProduct & { categoriaSlug: string })[];
}) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      active ? products.filter((p) => p.categoriaSlug === active) : products,
    [active, products],
  );

  const visual = getMenuCategoryVisual(active);

  return (
    <div>
      <CategoryFilter
        categories={categories}
        active={active}
        onChange={setActive}
      />

      <div className="mt-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
            {visual.eyebrow}
          </p>
          <h2 className="font-display text-pisao-cream mt-2 text-3xl leading-tight sm:text-4xl">
            {active ? visual.label : "Todo el sabor PISÁO"}
          </h2>
          <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed sm:text-base">
            {active
              ? visual.description
              : "Explora la carta completa: patacones insignia, burgers, cayeye, bebidas y opciones para compartir sin convertir la elección en una tarea."}
          </p>
        </div>
        <p className="text-pisao-cream-muted text-xs font-semibold tracking-wide uppercase">
          {filtered.length} {filtered.length === 1 ? "opción" : "opciones"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <MenuCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
