import type { CardPaymentProvider } from "../types";
import { WompiProvider } from "./wompi";
import { PayuProvider } from "./payu";
import { EpaycoProvider } from "./epayco";

const providers: Record<string, () => CardPaymentProvider> = {
  WOMPI: () => new WompiProvider(),
  PAYU: () => new PayuProvider(),
  EPAYCO: () => new EpaycoProvider(),
};

/**
 * Fábrica del proveedor de tarjeta activo. Cambiar de pasarela es
 * cuestión de actualizar `PAYMENT_GATEWAY_PROVIDER` en las variables de
 * entorno; ningún otro archivo debe importar un proveedor directamente.
 */
export function getCardPaymentProvider(): CardPaymentProvider {
  const key = (process.env.PAYMENT_GATEWAY_PROVIDER ?? "WOMPI").toUpperCase();
  const factory = providers[key];

  if (!factory) {
    throw new Error(
      `Proveedor de pago "${key}" no soportado. Usa WOMPI, PAYU o EPAYCO.`,
    );
  }

  return factory();
}

export type { CardPaymentProvider } from "../types";
