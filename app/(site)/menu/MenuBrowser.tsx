"use client";

import { useMemo, useState } from "react";
import { Sparkles, Utensils } from "lucide-react";
import { MenuCard, type MenuCardProduct } from "@/components/menu/MenuCard";
import { VisualTableDock } from "@/components/cart/VisualTableDock";
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
    <div className="pb-24 sm:pb-28">
      <div className="border-pisao-gold/15 bg-[linear-gradient(135deg,rgba(199,154,58,.12),rgba(17,17,17,.82))] mb-7 overflow-hidden rounded-[1.5rem] border p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-pisao-gold">
              <Sparkles className="size-4" />
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase">
                Nueva experiencia de compra
              </p>
            </div>
            <h2 className="font-display text-pisao-cream mt-2 text-2xl sm:text-3xl">
              Arma la mesa, no solo el carrito.
            </h2>
            <p className="text-pisao-cream-muted mt-2 max-w-xl text-sm leading-relaxed">
              Agrega platos y la Mesa Visual aparecerá abajo con fotografías reales, total en vivo y sugerencias para completar entrada, fuerte, bebida o postre.
            </p>
          </div>
          <div className="border-pisao-gold/20 bg-pisao-noche/70 text-pisao-cream flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
            <span className="bg-pisao-gold text-pisao-carbon flex size-9 items-center justify-center rounded-full">
              <Utensils className="size-4" />
            </span>
            <div>
              <p className="font-semibold">Mesa Visual PISÁO</p>
              <p className="text-pisao-cream-muted text-[11px]">Se activa con tu primer producto.</p>
            </div>
          </div>
        </div>
      </div>

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

      <VisualTableDock products={products} />
    </div>
  );
}
