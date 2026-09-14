"use client";

import Image from "next/image";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import type { CartItem } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

export function VisualOrderRail({
  items,
  className,
  maxItems = 5,
}: {
  items: CartItem[];
  className?: string;
  maxItems?: number;
}) {
  if (items.length === 0) return null;

  const visualItems = items.slice(0, maxItems);
  const remaining = Math.max(0, items.length - visualItems.length);

  return (
    <div className={cn("flex items-center", className)} aria-label="Vista visual del pedido">
      <div className="flex -space-x-3">
        {visualItems.map((item, index) => (
          <div
            key={item.productoId}
            className="border-pisao-carbon bg-pisao-carbon-soft relative size-12 overflow-hidden rounded-full border-2 shadow-lg sm:size-14"
            style={{ zIndex: visualItems.length - index }}
            title={item.nombre}
          >
            {item.imagenUrl ? (
              <Image
                src={item.imagenUrl}
                alt={item.nombre}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <MenuImageFallback
                name={item.nombre}
                categorySlug={item.categoriaSlug}
                compact
              />
            )}
            {item.cantidad > 1 && (
              <span className="bg-pisao-gold text-pisao-carbon absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                {item.cantidad}
              </span>
            )}
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <span className="border-pisao-gold/20 bg-pisao-noche text-pisao-cream-muted ml-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold">
          +{remaining}
        </span>
      )}
    </div>
  );
}
