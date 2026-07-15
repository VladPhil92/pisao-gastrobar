/**
 * Datos de la cuenta bancaria / QR para el método de pago manual.
 * El pedido queda en estado PENDIENTE_VERIFICACION hasta que un usuario
 * con rol ADMIN o CAJERO valide el comprobante subido en el panel.
 */
export const datosTransferenciaBancaria = {
  banco: process.env.BANK_TRANSFER_BANK_NAME ?? "Banco Placeholder",
  titular: process.env.BANK_TRANSFER_ACCOUNT_HOLDER ?? "PISÁO Gastrobar S.A.S.",
  tipoCuenta: process.env.BANK_TRANSFER_ACCOUNT_TYPE ?? "Ahorros",
  numeroCuenta: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "000-000000-00",
  nit: process.env.BANK_TRANSFER_NIT ?? "900.000.000-0",
  /** URL de la imagen del código QR (ej. Bre-B / llave bancaria) subida a /public o a un bucket. */
  qrImageUrl:
    process.env.BANK_TRANSFER_QR_IMAGE_URL ?? "/pagos/qr-placeholder.svg",
};

export const EVIDENCIA_TIPOS_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

export const EVIDENCIA_TAMANO_MAXIMO_MB = 8;
