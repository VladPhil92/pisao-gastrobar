"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/lib/cart/store";

export interface MenuCardProduct {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string | null;
  disponible: boolean;
}

export function MenuCard({ product }: { product: MenuCardProduct }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div className="group border-pisao-gold/10 bg-pisao-carbon-soft flex flex-col overflow-hidden rounded-xl border">
      <Link
        href={`/menu/${product.slug}`}
        className="bg-pisao-noche relative block aspect-square overflow-hidden"
      >
        {product.imagenUrl ? (
          <Image
            src={product.imagenUrl}
            alt={product.nombre}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-pisao-cream-muted flex h-full items-center justify-center text-xs">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/menu/${product.slug}`}>
          <h3 className="font-display text-pisao-cream text-lg">
            {product.nombre}
          </h3>
        </Link>
        {product.descripcion && (
          <p className="text-pisao-cream-muted mt-1 line-clamp-2 flex-1 text-sm">
            {product.descripcion}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-pisao-gold text-sm font-semibold">
            {formatCurrency(product.precio)}
          </span>
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
              })
            }
            className="bg-pisao-gold text-pisao-carbon flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40"
            aria-label={`Agregar ${product.nombre} al carrito`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
