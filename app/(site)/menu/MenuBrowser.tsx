"use client";

import { useMemo, useState } from "react";
import { MenuCard, type MenuCardProduct } from "@/components/menu/MenuCard";
import {
  CategoryFilter,
  type Category,
} from "@/components/menu/CategoryFilter";

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

  return (
    <div>
      <CategoryFilter
        categories={categories}
        active={active}
        onChange={setActive}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <MenuCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
