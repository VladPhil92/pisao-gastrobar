"use client";

import { cn } from "@/lib/utils";

export interface Category {
  slug: string;
  nombre: string;
}

export function CategoryFilter({
  categories,
  active,
  onChange,
}: {
  categories: Category[];
  active: string | null;
  onChange: (slug: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm transition-colors",
          active === null
            ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
            : "border-pisao-gold/30 text-pisao-cream-muted hover:border-pisao-gold",
        )}
      >
        Todos
      </button>
      {categories.map((c) => (
        <button
          key={c.slug}
          onClick={() => onChange(c.slug)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm transition-colors",
            active === c.slug
              ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
              : "border-pisao-gold/30 text-pisao-cream-muted hover:border-pisao-gold",
          )}
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
