/**
 * Datos visibles del método de pago vigente.
 * Las variables NEXT_PUBLIC_* son deliberadas: son datos que el comercio
 * muestra al cliente para que pueda transferir, nunca credenciales secretas.
 */
function optional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export const datosTransferenciaBancaria = {
  banco:
    process.env.NEXT_PUBLIC_BANK_TRANSFER_BANK_NAME?.trim() || "Bancolombia",
  titular:
    process.env.NEXT_PUBLIC_BANK_TRANSFER_ACCOUNT_HOLDER?.trim() ||
    "Grupo PISÁO Food & Drinks S.A.S.",
  tipoCuenta: optional(process.env.NEXT_PUBLIC_BANK_TRANSFER_ACCOUNT_TYPE),
  numeroCuenta: optional(
    process.env.NEXT_PUBLIC_BANK_TRANSFER_ACCOUNT_NUMBER,
  ),
  nit: optional(process.env.NEXT_PUBLIC_BANK_TRANSFER_NIT),
  brebKeyType: optional(process.env.NEXT_PUBLIC_BANK_TRANSFER_BREB_KEY_TYPE),
  brebKey: optional(process.env.NEXT_PUBLIC_BANK_TRANSFER_BREB_KEY),
  qrImageUrl:
    process.env.NEXT_PUBLIC_BANK_TRANSFER_QR_IMAGE_URL?.trim() ||
    "/QR/QRTransferencia.jpeg",
};

export const EVIDENCIA_TIPOS_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export const EVIDENCIA_TAMANO_MAXIMO_MB = 8;
