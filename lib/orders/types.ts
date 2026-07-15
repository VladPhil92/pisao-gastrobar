import type { CartItem, TipoEntrega } from "@/lib/cart/types";
import type { MetodoPago } from "@/lib/payments/types";

export interface CrearPedidoInput {
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
  };
  tipoEntrega: TipoEntrega;
  direccionEntrega?: string;
  notas?: string;
  items: CartItem[];
  metodoPago: MetodoPago;
}
