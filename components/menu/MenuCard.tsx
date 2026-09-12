"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart/store";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";

export interface MenuCardProduct {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string | null;
  disponible: boolean;
  categoriaSlug?: string;
}

export function MenuCard({ product }: { product: MenuCardProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const quantityInCart = useCartStore(
    (s) => s.items.find((item) => item.productoId === product.id)?.cantidad ?? 0,
  );
  const visual = getMenuCategoryVisual(product.categoriaSlug);

  return (
    <article className="group border-pisao-gold/10 bg-pisao-noche hover:border-pisao-gold/35 flex h-full flex-col overflow-hidden rounded-[1.75rem] border transition duration-300 hover:-translate-y-1">
      <Link
        href={`/menu/${product.slug}`}
        className="bg-pisao-carbon-soft relative block aspect-[4/5] overflow-hidden"
      >
        {product.imagenUrl ? (
          <Image
            src={product.imagenUrl}
            alt={`${product.nombre} de PISÁO Gastrobar`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <MenuImageFallback
            name={product.nombre}
            categorySlug={product.categoriaSlug}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/5 to-transparent" />
        <span className="border-pisao-gold/25 bg-pisao-carbon/75 text-pisao-gold absolute top-4 left-4 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase backdrop-blur">
          {visual.badge}
        </span>
        {quantityInCart > 0 && (
          <span className="bg-pisao-gold text-pisao-carbon absolute top-4 right-4 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold shadow-lg">
            <Check className="size-3" /> {quantityInCart} en mesa
          </span>
        )}
        <span className="text-pisao-cream absolute right-4 bottom-4 inline-flex items-center gap-1 text-xs font-semibold opacity-0 transition duration-300 group-hover:opacity-100">
          Ver detalle <ArrowUpRight className="size-3.5" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">
          {visual.eyebrow}
        </p>
        <Link href={`/menu/${product.slug}`} className="mt-2 inline-block">
          <h3 className="font-display text-pisao-cream text-2xl leading-tight transition-colors group-hover:text-pisao-gold-light">
            {product.nombre}
          </h3>
        </Link>
        {product.descripcion ? (
          <p className="text-pisao-cream-muted mt-3 line-clamp-2 flex-1 text-sm leading-relaxed">
            {product.descripcion}
          </p>
        ) : (
          <p className="text-pisao-cream-muted/75 mt-3 flex-1 text-sm leading-relaxed">
            Parte de nuestra selección {visual.label.toLowerCase()}.
          </p>
        )}

        <div className="border-pisao-gold/10 mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-pisao-cream-muted text-[10px] tracking-[0.14em] uppercase">
              Precio
            </p>
            <span className="text-pisao-gold mt-1 block text-base font-semibold">
              {formatCurrency(product.precio)}
            </span>
          </div>
          <button
            type="button"
            disabled={!product.disponible}
            onClick={() =>
              addItem({
                productoId: product.id,
                nombre: product.nombre,
                slug: product.slug,
                precio: product.precio,
                imagenUrl: product.imagenUrl,
                categoriaSlug: product.categoriaSlug,
              })
            }
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              quantityInCart > 0
                ? "border border-pisao-gold/35 bg-pisao-gold/10 text-pisao-gold hover:bg-pisao-gold/20"
                : "bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light"
            }`}
            aria-label={`Agregar ${product.nombre} al carrito`}
          >
            <Plus className="size-4" />
            {product.disponible
              ? quantityInCart > 0
                ? "Agregar otro"
                : "A la mesa"
              : "No disponible"}
          </button>
        </div>
      </div>
    </article>
  );
}
