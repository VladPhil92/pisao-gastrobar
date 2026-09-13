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
  addItems: (
    items: Array<{ item: Omit<CartItem, "cantidad">; cantidad: number }>,
  ) => void;
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

      addItems: (entries) => {
        const merged = [...get().items];

        for (const entry of entries) {
          if (entry.cantidad <= 0) continue;
          const index = merged.findIndex(
            (item) => item.productoId === entry.item.productoId,
          );

          if (index >= 0) {
            merged[index] = {
              ...merged[index],
              ...entry.item,
              cantidad: merged[index].cantidad + entry.cantidad,
            };
          } else {
            merged.push({ ...entry.item, cantidad: entry.cantidad });
          }
        }

        set({ items: merged, isOpen: false });
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
