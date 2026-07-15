"use client";

import Link from "next/link";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, cartSubtotal } from "@/lib/cart/store";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const items = useCartStore((s) => s.items);
  const updateCantidad = useCartStore((s) => s.updateCantidad);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = cartSubtotal(items);

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
      <div className="absolute inset-0 bg-black/60" onClick={close} />

      <aside
        className={cn(
          "bg-pisao-carbon-soft absolute top-0 right-0 flex h-full w-full max-w-md flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="border-pisao-gold/15 flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-display text-pisao-gold text-lg">Tu pedido</h2>
          <button onClick={close} aria-label="Cerrar carrito">
            <X className="text-pisao-cream h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="text-pisao-cream-muted text-sm">
              Aún no has agregado productos. Explora el{" "}
              <Link
                href="/menu"
                onClick={close}
                className="text-pisao-gold underline"
              >
                menú
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.productoId} className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-pisao-cream text-sm font-medium">
                      {item.nombre}
                    </p>
                    <p className="text-pisao-cream-muted text-xs">
                      {formatCurrency(item.precio)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        aria-label="Restar"
                        onClick={() =>
                          updateCantidad(item.productoId, item.cantidad - 1)
                        }
                        className="border-pisao-gold/40 text-pisao-gold flex h-6 w-6 items-center justify-center rounded-full border"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-pisao-cream w-4 text-center text-sm">
                        {item.cantidad}
                      </span>
                      <button
                        aria-label="Sumar"
                        onClick={() =>
                          updateCantidad(item.productoId, item.cantidad + 1)
                        }
                        className="border-pisao-gold/40 text-pisao-gold flex h-6 w-6 items-center justify-center rounded-full border"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        aria-label="Eliminar"
                        onClick={() => removeItem(item.productoId)}
                        className="text-pisao-cream-muted ml-2 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-pisao-cream text-sm font-medium">
                    {formatCurrency(item.precio * item.cantidad)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-pisao-gold/15 border-t px-5 py-4">
          <div className="text-pisao-cream mb-4 flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <Button href="/pedidos" variant="primary" className="w-full">
            Ir a pagar
          </Button>
        </div>
      </aside>
    </div>
  );
}
