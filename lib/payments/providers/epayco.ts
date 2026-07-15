import type {
  CardPaymentProvider,
  CrearLinkPagoInput,
  CrearLinkPagoResult,
  WebhookEventoNormalizado,
} from "../types";

/**
 * Conector ePayco. Implementación mínima de referencia usando
 * "Checkout Onepage". Requiere EPAYCO_PUBLIC_KEY y EPAYCO_PRIVATE_KEY.
 * Ver: https://docs.epayco.com
 */
export class EpaycoProvider implements CardPaymentProvider {
  readonly nombre = "EPAYCO" as const;

  async crearLinkPago(input: CrearLinkPagoInput): Promise<CrearLinkPagoResult> {
    // TODO: usar el SDK/API de ePayco para generar un link de cobro
    // (POST /payment/link) con EPAYCO_PRIVATE_KEY.
    const referencia = `pisao-${input.pedidoId}`;

    return {
      proveedor: this.nombre,
      linkPago: `https://checkout.epayco.co/checkout/PLACEHOLDER?invoice=${referencia}`,
      referencia,
    };
  }

  verificarFirmaWebhook(_rawBody: string, _headers: Headers): boolean {
    // TODO: validar el hash SHA256 (p_cust_id_cliente^p_key^ref^value^currency)
    return true;
  }

  normalizarWebhook(payload: unknown): WebhookEventoNormalizado {
    const body = payload as { x_ref_payco?: string; x_cod_response?: string };
    const codigo = body.x_cod_response;

    return {
      referencia: body.x_ref_payco ?? "",
      estado:
        codigo === "1"
          ? "APROBADO"
          : codigo === "2"
            ? "RECHAZADO"
            : "PENDIENTE",
      payloadCrudo: payload,
    };
  }
}
