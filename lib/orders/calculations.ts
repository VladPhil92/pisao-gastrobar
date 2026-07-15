import type { CartItem } from "@/lib/cart/types";
import { aplicarDescuentoCripto } from "@/lib/payments/crypto";
import type { MetodoPago } from "@/lib/payments/types";

export function calcularSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

/**
 * Calcula subtotal/descuento/total de un pedido según el método de
 * pago elegido. Solo el método CRIPTO aplica descuento automático.
 */
export function calcularTotalesPedido(
  items: CartItem[],
  metodoPago: MetodoPago,
) {
  const subtotal = calcularSubtotal(items);

  if (metodoPago === "CRIPTO") {
    const { descuento, total } = aplicarDescuentoCripto(subtotal);
    return { subtotal, descuento, total };
  }

  return { subtotal, descuento: 0, total: subtotal };
}
