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
    <div className="border-pisao-gold/10 bg-pisao-carbon/92 sticky top-16 z-20 -mx-4 border-y px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          aria-pressed={active === null}
          onClick={() => onChange(null)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all",
            active === null
              ? "border-pisao-gold bg-pisao-gold text-pisao-carbon shadow-[0_10px_30px_rgba(199,154,58,.14)]"
              : "border-pisao-gold/20 bg-pisao-noche/80 text-pisao-cream-muted hover:border-pisao-gold/60 hover:text-pisao-cream",
          )}
        >
          Toda la carta
        </button>
        {categories.map((c) => (
          <button
            type="button"
            key={c.slug}
            aria-pressed={active === c.slug}
            onClick={() => onChange(c.slug)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all",
              active === c.slug
                ? "border-pisao-gold bg-pisao-gold text-pisao-carbon shadow-[0_10px_30px_rgba(199,154,58,.14)]"
                : "border-pisao-gold/20 bg-pisao-noche/80 text-pisao-cream-muted hover:border-pisao-gold/60 hover:text-pisao-cream",
            )}
          >
            {c.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
