"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Plus, Sparkles, Utensils } from "lucide-react";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { VisualOrderRail } from "@/components/cart/VisualOrderRail";
import { useCartStore, cartItemCount, cartSubtotal } from "@/lib/cart/store";
import {
  getTableCompletion,
  getTableMoments,
  getTableSuggestions,
  type SuggestibleProduct,
} from "@/lib/cart/experience";
import { formatCurrency } from "@/lib/utils";

export function VisualTableDock({ products }: { products: SuggestibleProduct[] }) {
  const [expanded, setExpanded] = useState(false);
  const items = useCartStore((state) => state.items);
  const cartOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.open);
  const addItem = useCartStore((state) => state.addItem);

  const effectiveItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        categoriaSlug:
          item.categoriaSlug ??
          products.find((product) => product.id === item.productoId)?.categoriaSlug,
      })),
    [items, products],
  );

  const suggestions = useMemo(
    () => getTableSuggestions(products, effectiveItems),
    [products, effectiveItems],
  );
  const moments = useMemo(() => getTableMoments(effectiveItems), [effectiveItems]);
  const completion = useMemo(
    () => getTableCompletion(effectiveItems),
    [effectiveItems],
  );
  const subtotal = cartSubtotal(items);
  const itemCount = cartItemCount(items);

  if (items.length === 0 || cartOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-5 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-[1.6rem] border border-pisao-gold/25 bg-pisao-carbon/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        {expanded && (
          <div className="border-b border-pisao-gold/10 p-4 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
                      Mesa Visual PISÁO
                    </p>
                    <h3 className="font-display mt-2 text-2xl text-pisao-cream sm:text-3xl">
                      Mira tu pedido antes de cerrarlo.
                    </h3>
                  </div>
                  <span className="border-pisao-gold/20 bg-pisao-gold/10 text-pisao-gold rounded-full border px-3 py-1.5 text-xs font-semibold">
                    {completion.percent}% completa
                  </span>
                </div>

                <VisualOrderRail items={effectiveItems} className="mt-5" />

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {moments.map((moment) => (
                    <div
                      key={moment.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${
                        moment.complete
                          ? "border-pisao-gold/25 bg-pisao-gold/8 text-pisao-cream"
                          : "border-white/8 bg-white/[.025] text-pisao-cream-muted"
                      }`}
                    >
                      <span
                        className={`flex size-5 items-center justify-center rounded-full ${
                          moment.complete
                            ? "bg-pisao-gold text-pisao-carbon"
                            : "border border-pisao-gold/25"
                        }`}
                      >
                        {moment.complete && <Check className="size-3" />}
                      </span>
                      {moment.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-pisao-gold" />
                  <p className="text-sm font-semibold text-pisao-cream">
                    Completa la experiencia
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
                  Sugerencias basadas únicamente en las categorías que todavía no están en tu mesa.
                </p>

                {suggestions.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {suggestions.map((product) => (
                      <div
                        key={product.id}
                        className="overflow-hidden rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {product.imagenUrl ? (
                            <Image
                              src={product.imagenUrl}
                              alt={product.nombre}
                              fill
                              sizes="160px"
                              className="object-cover"
                            />
                          ) : (
                            <MenuImageFallback
                              name={product.nombre}
                              categorySlug={product.categoriaSlug}
                              compact
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-1 text-xs font-semibold text-pisao-cream">
                            {product.nombre}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-pisao-gold">
                              {formatCurrency(product.precio)}
                            </span>
                            <button
                              type="button"
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
                              className="bg-pisao-gold text-pisao-carbon flex size-8 items-center justify-center rounded-full transition hover:bg-pisao-gold-light"
                              aria-label={`Agregar ${product.nombre}`}
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-pisao-gold/10 bg-pisao-gold/5 p-4 text-sm text-pisao-cream-muted">
                    Tu mesa ya cubre los momentos principales. Puedes revisar cantidades o continuar al pedido.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={expanded}
          >
            <span className="bg-pisao-gold text-pisao-carbon flex size-10 shrink-0 items-center justify-center rounded-full">
              <Utensils className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-pisao-cream">
                Tu Mesa Visual · {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </p>
              <p className="text-[11px] text-pisao-cream-muted">
                {completion.complete}/{completion.total} momentos · toca para {expanded ? "cerrar" : "completar"}
              </p>
            </div>
            <ChevronDown
              className={`size-4 shrink-0 text-pisao-gold transition ${expanded ? "rotate-180" : ""}`}
            />
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-[10px] tracking-[0.14em] text-pisao-cream-muted uppercase">
              Total visual
            </p>
            <p className="font-semibold text-pisao-gold">{formatCurrency(subtotal)}</p>
          </div>

          <button
            type="button"
            onClick={openCart}
            className="bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition sm:px-5"
          >
            Ver pedido
          </button>
        </div>
      </div>
    </div>
  );
}
