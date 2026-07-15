"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, TipoEntrega } from "./types";

interface CartState {
  items: CartItem[];
  tipoEntrega: TipoEntrega;
  direccionEntrega: string;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "cantidad">, cantidad?: number) => void;
  removeItem: (productoId: string) => void;
  updateCantidad: (productoId: string, cantidad: number) => void;
  setTipoEntrega: (tipo: TipoEntrega) => void;
  setDireccionEntrega: (direccion: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tipoEntrega: "RECOGIDA",
      direccionEntrega: "",
      isOpen: false,

      addItem: (item, cantidad = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productoId === item.productoId);

        if (existing) {
          set({
            items: items.map((i) =>
              i.productoId === item.productoId
                ? { ...i, cantidad: i.cantidad + cantidad }
                : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, cantidad }] });
        }
        set({ isOpen: true });
      },

      removeItem: (productoId) =>
        set({ items: get().items.filter((i) => i.productoId !== productoId) }),

      updateCantidad: (productoId, cantidad) => {
        if (cantidad <= 0) {
          get().removeItem(productoId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productoId === productoId ? { ...i, cantidad } : i,
          ),
        });
      },

      setTipoEntrega: (tipoEntrega) => set({ tipoEntrega }),
      setDireccionEntrega: (direccionEntrega) => set({ direccionEntrega }),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: "pisao-cart",
      partialize: (state) => ({
        items: state.items,
        tipoEntrega: state.tipoEntrega,
        direccionEntrega: state.direccionEntrega,
      }),
    },
  ),
);

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.cantidad, 0);
}
