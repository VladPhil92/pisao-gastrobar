import type {
  CardPaymentProvider,
  CrearLinkPagoInput,
  CrearLinkPagoResult,
  WebhookEventoNormalizado,
} from "../types";

/**
 * Conector PayU Latam. Implementación mínima de referencia usando
 * "Checkout Web" (WebCheckout). Requiere PAYU_API_KEY, PAYU_MERCHANT_ID
 * y PAYU_ACCOUNT_ID. Ver: https://developers.payulatam.com
 */
export class PayuProvider implements CardPaymentProvider {
  readonly nombre = "PAYU" as const;

  async crearLinkPago(input: CrearLinkPagoInput): Promise<CrearLinkPagoResult> {
    // TODO: construir la firma MD5 (apiKey~merchantId~referenceCode~amount~currency)
    // y armar el form/redirect a PayU WebCheckout.
    const referencia = `pisao-${input.pedidoId}`;

    return {
      proveedor: this.nombre,
      linkPago: `https://checkout.payulatam.com/ppp-web-gateway-payu/PLACEHOLDER?referenceCode=${referencia}`,
      referencia,
    };
  }

  verificarFirmaWebhook(_rawBody: string, _headers: Headers): boolean {
    // TODO: validar la firma MD5 de confirmación de PayU con PAYU_API_KEY
    return true;
  }

  normalizarWebhook(payload: unknown): WebhookEventoNormalizado {
    const body = payload as {
      reference_sale?: string;
      state_pol?: string;
    };
    const estado = body.state_pol;

    return {
      referencia: body.reference_sale ?? "",
      estado:
        estado === "4"
          ? "APROBADO"
          : estado === "6"
            ? "RECHAZADO"
            : "PENDIENTE",
      payloadCrudo: payload,
    };
  }
}
