export type MetodoPago = "QR_TRANSFERENCIA" | "CRIPTO" | "TARJETA";

export interface CrearLinkPagoInput {
  pedidoId: string;
  numeroPedido: number;
  montoTotal: number;
  moneda?: string;
  descripcion: string;
  clienteEmail?: string;
  clienteNombre: string;
  clienteTelefono: string;
  /** URLs a las que el proveedor debe redirigir/notificar. */
  redirectUrl: string;
  webhookUrl: string;
}

export interface CrearLinkPagoResult {
  proveedor: "WOMPI" | "PAYU" | "EPAYCO";
  /** URL a la que se redirige al cliente para completar el pago. */
  linkPago: string;
  /** Identificador/referencia interna que debe viajar en el webhook. */
  referencia: string;
}

export interface WebhookEventoNormalizado {
  referencia: string;
  estado: "APROBADO" | "RECHAZADO" | "PENDIENTE";
  payloadCrudo: unknown;
}

/**
 * Contrato que debe implementar cualquier pasarela de tarjeta de
 * crédito/débito colombiana (Wompi, PayU, ePayco...). El checkout y las
 * rutas de API solo dependen de esta interfaz, nunca de un proveedor
 * concreto — así se puede intercambiar el proveedor activo vía
 * `PAYMENT_GATEWAY_PROVIDER` sin tocar el resto del código.
 */
export interface CardPaymentProvider {
  readonly nombre: "WOMPI" | "PAYU" | "EPAYCO";
  crearLinkPago(input: CrearLinkPagoInput): Promise<CrearLinkPagoResult>;
  verificarFirmaWebhook(rawBody: string, headers: Headers): boolean;
  normalizarWebhook(payload: unknown): WebhookEventoNormalizado;
}
