/**
 * Pago manual con criptomonedas con prevalidación on-chain y cotización COP.
 *
 * El cliente elige el activo, escanea el QR/copia la dirección, paga, verifica
 * el TxID/TxHash y luego sube el comprobante. La aprobación final sigue siendo
 * administrativa.
 */

import { getCryptoQuotesCop, type CryptoQuote } from "@/lib/payments/crypto-quote";

export type CriptoMoneda = "BNB" | "USDT" | "ETH" | "BTC";

export interface CryptoPaymentDestination {
  moneda: CriptoMoneda;
  red: string;
  direccion: string;
  qrImageUrl: string;
  quote?: CryptoQuote | null;
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
  quoteAvailable: boolean;
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
  const quotes = await getCryptoQuotesCop(input.montoTotalCop);

  return {
    proveedor: "BINANCE_MANUAL",
    modo: "MANUAL_RECEIPT",
    referencia: `pisao-cripto-${input.pedidoId}`,
    quoteAvailable: Boolean(quotes),
    opciones: CRYPTO_PAYMENT_DESTINATIONS.map((destination) => ({
      ...destination,
      quote: quotes?.[destination.moneda] ?? null,
    })),
  };
}

/**
 * La aprobación final sigue dependiendo de la validación administrativa.
 * La infraestructura on-chain y de cotización permite endurecer esa decisión
 * sin delegar autoridad de aprobación a un tercero.
 */
export async function consultarEstadoCargoCripto(
  referencia: string,
): Promise<EstadoCargoCripto> {
  return { referencia, estado: "PENDIENTE" };
}
