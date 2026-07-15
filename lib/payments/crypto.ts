/**
 * Abstracción del gateway de criptomonedas. El proveedor real (ej.
 * Coinbase Commerce, BTCPay, NOWPayments...) se conecta implementando
 * esta misma forma, controlado por CRYPTO_GATEWAY_PROVIDER.
 */

export interface CrearCargoCriptoInput {
  pedidoId: string;
  numeroPedido: number;
  montoTotalCop: number;
  webhookUrl: string;
}

export interface CrearCargoCriptoResult {
  proveedor: string;
  /** Dirección de wallet o checkout hospedado por el gateway. */
  direccionPago: string;
  criptoMoneda: string;
  montoCripto: string;
  checkoutUrl?: string;
  referencia: string;
}

export interface EstadoCargoCripto {
  referencia: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  txHash?: string;
  confirmaciones?: number;
}

/** % de descuento aplicado automáticamente al pagar con cripto. */
export const DESCUENTO_CRIPTO_PORCENTAJE = Number(
  process.env.CRYPTO_DISCOUNT_PERCENTAGE ?? 5,
);

export function aplicarDescuentoCripto(subtotal: number) {
  const descuento = Math.round((subtotal * DESCUENTO_CRIPTO_PORCENTAJE) / 100);
  return {
    descuento,
    total: subtotal - descuento,
    porcentaje: DESCUENTO_CRIPTO_PORCENTAJE,
  };
}

export async function crearCargoCripto(
  input: CrearCargoCriptoInput,
): Promise<CrearCargoCriptoResult> {
  // TODO: integrar con el gateway configurado en CRYPTO_GATEWAY_PROVIDER
  // (ej. Coinbase Commerce `POST /charges`). Debe devolver la dirección
  // o checkout hospedado donde el cliente completa el pago on-chain.
  const referencia = `pisao-cripto-${input.pedidoId}`;

  return {
    proveedor: process.env.CRYPTO_GATEWAY_PROVIDER ?? "PLACEHOLDER",
    direccionPago: "0xPLACEHOLDER_WALLET_ADDRESS",
    criptoMoneda: "USDT",
    montoCripto: "0.00",
    checkoutUrl: undefined,
    referencia,
  };
}

/** Consulta el estado on-chain de un cargo (usado por polling o webhook). */
export async function consultarEstadoCargoCripto(
  _referencia: string,
): Promise<EstadoCargoCripto> {
  // TODO: consultar al gateway el número de confirmaciones on-chain y
  // el hash de transacción asociado antes de marcar el pedido como
  // CONFIRMADO. Guardar siempre `txHash` en el modelo Pago.
  return { referencia: _referencia, estado: "PENDIENTE" };
}
