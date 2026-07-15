import type {
  CardPaymentProvider,
  CrearLinkPagoInput,
  CrearLinkPagoResult,
  WebhookEventoNormalizado,
} from "../types";

/**
 * Conector Wompi (Bancolombia). Implementación mínima de referencia:
 * genera un link de pago usando el "Widget de Wompi" / Payment Link API.
 * Requiere WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY y WOMPI_EVENTS_SECRET.
 * Ver: https://docs.wompi.co
 */
export class WompiProvider implements CardPaymentProvider {
  readonly nombre = "WOMPI" as const;

  async crearLinkPago(input: CrearLinkPagoInput): Promise<CrearLinkPagoResult> {
    // TODO: reemplazar por la llamada real a la API de Wompi
    // (POST /v1/payment_links) usando WOMPI_PRIVATE_KEY.
    const referencia = `pisao-${input.pedidoId}`;

    return {
      proveedor: this.nombre,
      linkPago: `https://checkout.wompi.co/l/PLACEHOLDER?reference=${referencia}`,
      referencia,
    };
  }

  verificarFirmaWebhook(_rawBody: string, _headers: Headers): boolean {
    // TODO: validar el checksum SHA256 con WOMPI_EVENTS_SECRET
    // https://docs.wompi.co/docs/colombia/eventos/
    return true;
  }

  normalizarWebhook(payload: unknown): WebhookEventoNormalizado {
    const body = payload as {
      data?: { transaction?: { reference?: string; status?: string } };
    };
    const status = body.data?.transaction?.status;

    return {
      referencia: body.data?.transaction?.reference ?? "",
      estado:
        status === "APPROVED"
          ? "APROBADO"
          : status === "DECLINED" || status === "ERROR"
            ? "RECHAZADO"
            : "PENDIENTE",
      payloadCrudo: payload,
    };
  }
}
