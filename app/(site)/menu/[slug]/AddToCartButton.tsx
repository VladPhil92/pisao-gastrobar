"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";
import type { MenuCardProduct } from "@/components/menu/MenuCard";

export function AddToCartButton({ producto }: { producto: MenuCardProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const quantity = useCartStore(
    (s) => s.items.find((item) => item.productoId === producto.id)?.cantidad ?? 0,
  );

  return (
    <div className="mt-8">
      <Button
        variant="primary"
        className="w-full sm:w-auto"
        onClick={() =>
          addItem({
            productoId: producto.id,
            nombre: producto.nombre,
            slug: producto.slug,
            precio: producto.precio,
            imagenUrl: producto.imagenUrl,
            categoriaSlug: producto.categoriaSlug,
          })
        }
      >
        {quantity > 0 ? <Check className="size-4" /> : <Plus className="size-4" />}
        {quantity > 0 ? `En tu mesa · ${quantity}` : "Agregar a mi mesa"}
      </Button>
      {quantity > 0 && (
        <p className="text-pisao-cream-muted mt-2 text-xs">
          Puedes agregar otra unidad o revisar la Mesa Visual desde el carrito.
        </p>
      )}
    </div>
  );
}
