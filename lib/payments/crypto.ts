/**
 * Pago manual con criptomonedas.
 *
 * El cliente elige el activo, escanea el QR/copia la dirección y luego sube
 * el comprobante. El backend conserva la evidencia y notifica al equipo de
 * pagos por el mismo canal utilizado para QR/Bre-B.
 */

export type CriptoMoneda = "BNB" | "USDT" | "ETH" | "BTC";

export interface CryptoPaymentDestination {
  moneda: CriptoMoneda;
  red: string;
  direccion: string;
  qrImageUrl: string;
}

const EVM_WALLET = "0xf27f2ab291cb3fee22298b3169b119c6b854b21c";
const BTC_WALLET = "13Kg9rf5C4mNQG9A21G655q7dARrbJmatF";

export const CRYPTO_PAYMENT_DESTINATIONS: CryptoPaymentDestination[] = [
  {
    moneda: "BNB",
    red: "BNB Smart Chain (BEP20)",
    direccion: EVM_WALLET,
    qrImageUrl: "/QR/crypto/BNB.png",
  },
  {
    moneda: "USDT",
    red: "BNB Smart Chain (BEP20)",
    direccion: EVM_WALLET,
    qrImageUrl: "/QR/crypto/USDT.png",
  },
  {
    moneda: "ETH",
    red: "Ethereum (ERC20)",
    direccion: EVM_WALLET,
    qrImageUrl: "/QR/crypto/ETH.png",
  },
  {
    moneda: "BTC",
    red: "Bitcoin",
    direccion: BTC_WALLET,
    qrImageUrl: "/QR/crypto/BTC.png",
  },
];

export function getCryptoPaymentDestination(
  moneda: string | null | undefined,
): CryptoPaymentDestination | null {
  if (!moneda) return null;
  return (
    CRYPTO_PAYMENT_DESTINATIONS.find((item) => item.moneda === moneda) ?? null
  );
}

export interface CrearCargoCriptoInput {
  pedidoId: string;
  numeroPedido: number;
  montoTotalCop: number;
  webhookUrl: string;
}

export interface CrearCargoCriptoResult {
  proveedor: "BINANCE_MANUAL";
  modo: "MANUAL_RECEIPT";
  referencia: string;
  opciones: CryptoPaymentDestination[];
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
  return {
    proveedor: "BINANCE_MANUAL",
    modo: "MANUAL_RECEIPT",
    referencia: `pisao-cripto-${input.pedidoId}`,
    opciones: CRYPTO_PAYMENT_DESTINATIONS,
  };
}

/**
 * Mientras el flujo sea manual, la aprobación depende del comprobante y de la
 * validación administrativa. Esta interfaz se conserva para poder migrar a un
 * verificador on-chain sin alterar el contrato del resto de la aplicación.
 */
export async function consultarEstadoCargoCripto(
  referencia: string,
): Promise<EstadoCargoCripto> {
  return { referencia, estado: "PENDIENTE" };
}
