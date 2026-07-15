import type { TipoEntrega } from "@/lib/cart/types";
import type { MetodoPago } from "@/lib/payments/types";

export interface DatosCliente {
  nombre: string;
  telefono: string;
  email: string;
  direccionEntrega: string;
  notas: string;
}

export interface CheckoutState {
  cliente: DatosCliente;
  tipoEntrega: TipoEntrega;
  metodoPago: MetodoPago | null;
  pedidoId: string | null;
}

export const CHECKOUT_INICIAL: CheckoutState = {
  cliente: {
    nombre: "",
    telefono: "",
    email: "",
    direccionEntrega: "",
    notas: "",
  },
  tipoEntrega: "RECOGIDA",
  metodoPago: null,
  pedidoId: null,
};
