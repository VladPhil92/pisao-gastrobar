"use client";

import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";
import type { MenuCardProduct } from "@/components/menu/MenuCard";

export function AddToCartButton({ producto }: { producto: MenuCardProduct }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <Button
      variant="primary"
      className="mt-8"
      onClick={() =>
        addItem({
          productoId: producto.id,
          nombre: producto.nombre,
          slug: producto.slug,
          precio: producto.precio,
          imagenUrl: producto.imagenUrl,
        })
      }
    >
      Agregar al carrito
    </Button>
  );
}
