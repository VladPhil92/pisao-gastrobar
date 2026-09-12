"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag, Sparkles } from "lucide-react";
import { useCartStore, cartSubtotal, cartItemCount } from "@/lib/cart/store";
import { getTableCompletion } from "@/lib/cart/experience";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { VisualOrderRail } from "@/components/cart/VisualOrderRail";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const updateCantidad = useCartStore((s) => s.updateCantidad);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = cartSubtotal(items);
  const count = cartItemCount(items);
  const completion = getTableCompletion(items);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity",
        isOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <aside
        className={cn(
          "bg-pisao-carbon absolute top-0 right-0 flex h-full w-full max-w-lg flex-col border-l border-pisao-gold/10 shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-pisao-gold/15 flex items-start justify-between border-b px-5 py-5 sm:px-6">
          <div>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
              Mesa Visual PISÁO
            </p>
            <h2 className="font-display text-pisao-cream mt-1 text-2xl">Tu mesa</h2>
            {items.length > 0 && (
              <p className="text-pisao-cream-muted mt-1 text-xs">
                {count} {count === 1 ? "producto" : "productos"} · {completion.complete}/{completion.total} momentos cubiertos
              </p>
            )}
          </div>
          <button
            onClick={close}
            aria-label="Cerrar carrito"
            className="border-pisao-gold/15 text-pisao-cream hover:border-pisao-gold/40 flex size-10 items-center justify-center rounded-full border transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {items.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <span className="bg-pisao-gold/10 text-pisao-gold flex size-16 items-center justify-center rounded-full">
                <ShoppingBag className="size-7" />
              </span>
              <h3 className="font-display text-pisao-cream mt-5 text-2xl">La mesa todavía está vacía.</h3>
              <p className="text-pisao-cream-muted mt-2 max-w-xs text-sm leading-relaxed">
                Explora la carta y agrega tu primer plato. La Mesa Visual empezará a construir la experiencia contigo.
              </p>
              <Button href="/menu" onClick={close} variant="primary" className="mt-6">
                Ver la carta
              </Button>
            </div>
          ) : (
            <>
              <div className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-pisao-cream text-sm font-semibold">Así se ve tu pedido</p>
                    <p className="text-pisao-cream-muted mt-1 text-xs">Fotografías reales de lo que estás armando.</p>
                  </div>
                  <Sparkles className="size-4 shrink-0 text-pisao-gold" />
                </div>
                <VisualOrderRail items={items} className="mt-4" maxItems={6} />
              </div>

              <ul className="mt-6 space-y-4">
                {items.map((item) => (
                  <li
                    key={item.productoId}
                    className="border-pisao-gold/10 bg-pisao-carbon-soft/60 flex gap-4 rounded-2xl border p-3"
                  >
                    <Link
                      href={`/menu/${item.slug}`}
                      onClick={close}
                      className="bg-pisao-noche relative size-20 shrink-0 overflow-hidden rounded-xl"
                    >
                      {item.imagenUrl ? (
                        <Image
                          src={item.imagenUrl}
                          alt={item.nombre}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <MenuImageFallback
                          name={item.nombre}
                          categorySlug={item.categoriaSlug}
                          compact
                        />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/menu/${item.slug}`}
                            onClick={close}
                            className="text-pisao-cream line-clamp-2 text-sm font-semibold hover:text-pisao-gold"
                          >
                            {item.nombre}
                          </Link>
                          <p className="text-pisao-gold mt-1 text-xs font-semibold">
                            {formatCurrency(item.precio)}
                          </p>
                        </div>
                        <button
                          aria-label={`Eliminar ${item.nombre}`}
                          onClick={() => removeItem(item.productoId)}
                          className="text-pisao-cream-muted hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="border-pisao-gold/15 flex items-center rounded-full border">
                          <button
                            aria-label="Restar"
                            onClick={() =>
                              updateCantidad(item.productoId, item.cantidad - 1)
                            }
                            className="text-pisao-gold flex size-8 items-center justify-center"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-pisao-cream w-7 text-center text-xs font-semibold">
                            {item.cantidad}
                          </span>
                          <button
                            aria-label="Sumar"
                            onClick={() =>
                              updateCantidad(item.productoId, item.cantidad + 1)
                            }
                            className="text-pisao-gold flex size-8 items-center justify-center"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-pisao-cream text-sm font-semibold">
                          {formatCurrency(item.precio * item.cantidad)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                href="/menu"
                onClick={close}
                className="border-pisao-gold/15 text-pisao-gold hover:bg-pisao-gold/5 mt-5 flex items-center justify-center rounded-2xl border px-4 py-3 text-xs font-semibold transition"
              >
                + Seguir armando la mesa
              </Link>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-pisao-gold/15 bg-pisao-noche border-t px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-pisao-cream-muted text-[10px] tracking-[0.14em] uppercase">Subtotal</p>
                <p className="font-display text-pisao-gold mt-1 text-3xl">{formatCurrency(subtotal)}</p>
              </div>
              <p className="text-pisao-cream-muted max-w-[13rem] text-right text-[11px] leading-relaxed">
                El total final puede variar según método de pago o condiciones aplicables.
              </p>
            </div>
            <Button href="/pedidos" onClick={close} variant="primary" className="w-full py-3.5">
              Continuar con mi pedido
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
