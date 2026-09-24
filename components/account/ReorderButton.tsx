"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { useCartStore } from "@/lib/cart/store";

export type ReorderItem = {
  productoId: string;
  nombre: string;
  slug: string;
  precio: number;
  imagenUrl?: string | null;
  categoriaSlug?: string;
  cantidad: number;
  disponible: boolean;
};

export function ReorderButton({ items }: { items: ReorderItem[] }) {
  const router = useRouter();
  const clear = useCartStore((state) => state.clear);
  const addItems = useCartStore((state) => state.addItems);

  const availableItems = items.filter((item) => item.disponible);
  const unavailableCount = items.length - availableItems.length;

  function repeatOrder() {
    if (!availableItems.length) return;
    clear();
    addItems(
      availableItems.map((item) => ({
        item: {
          productoId: item.productoId,
          nombre: item.nombre,
          slug: item.slug,
          precio: item.precio,
          imagenUrl: item.imagenUrl,
          categoriaSlug: item.categoriaSlug,
        },
        cantidad: item.cantidad,
      })),
    );
    router.push("/pedidos");
  }

  return (
    <button
      type="button"
      onClick={repeatOrder}
      disabled={!availableItems.length}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-pisao-gold/20 px-4 py-2.5 text-xs font-semibold text-pisao-gold transition hover:bg-pisao-gold/10 disabled:cursor-not-allowed disabled:opacity-45"
      title={
        unavailableCount
          ? `${unavailableCount} producto(s) ya no están disponibles y no se agregarán.`
          : "Repetir este pedido"
      }
    >
      <RotateCcw className="size-3.5" />
      {availableItems.length ? "Pedir de nuevo" : "Pedido no disponible"}
    </button>
  );
}
