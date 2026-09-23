export type OrderTrackingTimelineState =
  | "complete"
  | "current"
  | "upcoming"
  | "issue";

export type OrderTrackingTone = "neutral" | "progress" | "success" | "issue";

export type OrderTrackingInput = {
  numero: number;
  total: number;
  tipoEntrega: "DOMICILIO" | "RECOGIDA";
  estado:
    | "PENDIENTE_PAGO"
    | "PENDIENTE_VERIFICACION"
    | "CONFIRMADO"
    | "EN_PREPARACION"
    | "LISTO"
    | "EN_CAMINO"
    | "ENTREGADO"
    | "CANCELADO";
  createdAt: Date | string;
  updatedAt: Date | string;
  pago: null | {
    metodo: "QR_TRANSFERENCIA" | "CRIPTO" | "TARJETA";
    estado: "PENDIENTE" | "EN_VERIFICACION" | "APROBADO" | "RECHAZADO";
    comprobanteRecibidoEn: Date | string | null;
    verificadoEn: Date | string | null;
    criptoMoneda: string | null;
    txHash: string | null;
    confirmacionesOnchain: number | null;
    payloadProveedor: unknown;
  };
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function iso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function normalizeCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) return digits.slice(2);
  if (digits.length === 14 && digits.startsWith("0057")) return digits.slice(4);
  return digits;
}

export function maskTransactionHash(value: string | null) {
  if (!value) return null;
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function buildOrderTrackingSnapshot(input: OrderTrackingInput) {
  const payment = input.pago;
  const provider = asObject(payment?.payloadProveedor);
  const reconciliation = asObject(provider.reconciliation);

  const onchainState =
    stringValue(reconciliation.state) ?? stringValue(provider.status);
  const network =
    stringValue(reconciliation.network) ?? stringValue(provider.network);
  const explorerUrl =
    stringValue(reconciliation.explorerUrl) ??
    stringValue(provider.explorerUrl);
  const requiredConfirmations =
    numberValue(reconciliation.requiredConfirmations) ??
    numberValue(provider.requiredConfirmations);
  const receivedAmount =
    stringValue(reconciliation.amount) ?? stringValue(provider.amount);

  const evidenceReceived = Boolean(payment?.comprobanteRecibidoEn);
  const transactionObserved = Boolean(payment?.txHash);
  const blockchainConfirmed = onchainState === "CONFIRMED";
  const underpaid = onchainState === "UNDERPAID";
  const paymentApproved = payment?.estado === "APROBADO";
  const paymentRejected = payment?.estado === "RECHAZADO";

  const orderConfirmed = [
    "CONFIRMADO",
    "EN_PREPARACION",
    "LISTO",
    "EN_CAMINO",
    "ENTREGADO",
  ].includes(input.estado);
  const preparing = ["EN_PREPARACION", "LISTO", "EN_CAMINO", "ENTREGADO"].includes(
    input.estado,
  );
  const ready = ["LISTO", "EN_CAMINO", "ENTREGADO"].includes(input.estado);
  const onRoute = ["EN_CAMINO", "ENTREGADO"].includes(input.estado);
  const delivered = input.estado === "ENTREGADO";
  const cancelled = input.estado === "CANCELADO" || paymentRejected;

  const paymentRegistered =
    evidenceReceived ||
    transactionObserved ||
    payment?.estado === "EN_VERIFICACION" ||
    paymentApproved;

  const steps: Array<{
    id: string;
    label: string;
    description: string;
    complete: boolean;
  }> = [
    {
      id: "received",
      label: "Pedido recibido",
      description: "PISÁO registró tu pedido y su valor.",
      complete: true,
    },
    {
      id: "payment_registered",
      label:
        payment?.metodo === "CRIPTO"
          ? "Transacción registrada"
          : payment?.metodo === "TARJETA"
            ? "Pago iniciado"
            : "Comprobante recibido",
      description:
        payment?.metodo === "CRIPTO"
          ? "La transacción quedó vinculada a tu pedido."
          : payment?.metodo === "TARJETA"
            ? "Estamos esperando la respuesta de la pasarela."
            : "Tu evidencia de pago quedó almacenada para revisión.",
      complete: paymentRegistered,
    },
  ];

  if (payment?.metodo === "CRIPTO") {
    steps.push({
      id: "onchain",
      label: "Confirmación en blockchain",
      description: underpaid
        ? "La transacción fue detectada, pero el monto recibido es insuficiente."
        : blockchainConfirmed
          ? "La red alcanzó el mínimo de confirmaciones requerido."
          : transactionObserved
            ? "La transacción está visible y sigue acumulando confirmaciones."
            : "PISÁO verificará automáticamente la transacción.",
      complete: blockchainConfirmed && !underpaid,
    });
  }

  steps.push(
    {
      id: "payment_approved",
      label: "Pago aprobado",
      description: "Un administrador confirma que el pago corresponde al pedido.",
      complete: paymentApproved,
    },
    {
      id: "order_confirmed",
      label: "Pedido confirmado",
      description: "El pedido queda liberado para operación.",
      complete: orderConfirmed,
    },
    {
      id: "preparing",
      label: "En preparación",
      description: "Cocina está trabajando en tu pedido.",
      complete: preparing,
    },
    {
      id: "ready",
      label:
        input.tipoEntrega === "RECOGIDA"
          ? "Listo para recoger"
          : "Listo para despacho",
      description:
        input.tipoEntrega === "RECOGIDA"
          ? "Tu pedido está listo para entregarse en PISÁO."
          : "Tu pedido terminó preparación y está listo para salir.",
      complete: ready,
    },
  );

  if (input.tipoEntrega === "DOMICILIO") {
    steps.push({
      id: "on_route",
      label: "En camino",
      description: "Tu pedido salió hacia la dirección indicada.",
      complete: onRoute,
    });
  }

  steps.push({
    id: "delivered",
    label: "Entregado",
    description: "El pedido fue marcado como entregado.",
    complete: delivered,
  });

  let currentIndex = steps.findIndex((step) => !step.complete);
  if (currentIndex < 0) currentIndex = steps.length - 1;

  const timeline = steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    description: step.description,
    state: cancelled
      ? index === currentIndex
        ? ("issue" as const)
        : step.complete
          ? ("complete" as const)
          : ("upcoming" as const)
      : step.complete
        ? ("complete" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("upcoming" as const),
  }));

  let stage: {
    code: string;
    label: string;
    description: string;
    tone: OrderTrackingTone;
  };

  if (cancelled) {
    stage = {
      code: "CANCELLED",
      label: "Pedido cancelado",
      description:
        "El pedido no continuará. Si necesitas aclarar el motivo, contacta directamente a PISÁO.",
      tone: "issue",
    };
  } else if (delivered) {
    stage = {
      code: "DELIVERED",
      label: "Pedido entregado",
      description: "El ciclo del pedido se completó.",
      tone: "success",
    };
  } else if (input.estado === "EN_CAMINO") {
    stage = {
      code: "ON_ROUTE",
      label: "Tu pedido va en camino",
      description: "El pedido salió de PISÁO y está en ruta.",
      tone: "progress",
    };
  } else if (input.estado === "LISTO") {
    stage = {
      code: "READY",
      label:
        input.tipoEntrega === "RECOGIDA"
          ? "Tu pedido está listo para recoger"
          : "Tu pedido está listo para despacho",
      description: "La preparación ya terminó.",
      tone: "progress",
    };
  } else if (input.estado === "EN_PREPARACION") {
    stage = {
      code: "PREPARING",
      label: "Estamos preparando tu pedido",
      description: "Cocina ya tiene el pedido en operación.",
      tone: "progress",
    };
  } else if (orderConfirmed) {
    stage = {
      code: "ORDER_CONFIRMED",
      label: "Pedido confirmado",
      description: "El pago fue aprobado y el pedido quedó liberado.",
      tone: "progress",
    };
  } else if (paymentApproved) {
    stage = {
      code: "PAYMENT_APPROVED",
      label: "Pago aprobado",
      description: "El pedido está pasando a confirmación operativa.",
      tone: "progress",
    };
  } else if (underpaid) {
    stage = {
      code: "CRYPTO_UNDERPAID",
      label: "El monto cripto necesita revisión",
      description:
        "La blockchain detectó la transacción, pero el monto recibido está por debajo del mínimo aceptado.",
      tone: "issue",
    };
  } else if (payment?.metodo === "CRIPTO" && blockchainConfirmed) {
    stage = {
      code: "CRYPTO_CONFIRMED",
      label: evidenceReceived
        ? "Pago confirmado en blockchain"
        : "Blockchain confirmada · falta comprobante",
      description: evidenceReceived
        ? "La red confirmó el pago. Falta la aprobación administrativa final."
        : "La red confirmó el pago. Sube el comprobante para completar la revisión.",
      tone: "progress",
    };
  } else if (payment?.metodo === "CRIPTO" && transactionObserved) {
    stage = {
      code: "CRYPTO_OBSERVED",
      label: "Transacción detectada",
      description:
        "PISÁO seguirá consultando la blockchain automáticamente hasta alcanzar las confirmaciones requeridas.",
      tone: "progress",
    };
  } else if (evidenceReceived) {
    stage = {
      code: "EVIDENCE_REVIEW",
      label: "Comprobante en revisión",
      description: "La evidencia de pago está almacenada y pendiente de validación.",
      tone: "progress",
    };
  } else if (payment?.metodo === "TARJETA") {
    stage = {
      code: "GATEWAY_PENDING",
      label: "Esperando respuesta de la pasarela",
      description: "El pedido se actualizará cuando la pasarela confirme el pago.",
      tone: "neutral",
    };
  } else {
    stage = {
      code: "PAYMENT_PENDING",
      label: "Esperando tu pago",
      description:
        payment?.metodo === "CRIPTO"
          ? "Completa la transferencia y registra el TxID/TxHash."
          : "Completa el pago y sube el comprobante.",
      tone: "neutral",
    };
  }

  const completedCount = timeline.filter((item) => item.state === "complete").length;
  const progress =
    timeline.length === 0
      ? 0
      : Math.round((completedCount / timeline.length) * 100);

  return {
    version: "order_tracking_v12",
    order: {
      numero: input.numero,
      total: input.total,
      tipoEntrega: input.tipoEntrega,
      estado: input.estado,
      createdAt: iso(input.createdAt),
      updatedAt: iso(input.updatedAt),
    },
    payment: payment
      ? {
          metodo: payment.metodo,
          estado: payment.estado,
          evidenceReceived,
          evidenceReceivedAt: iso(payment.comprobanteRecibidoEn),
          verifiedAt: iso(payment.verificadoEn),
          crypto:
            payment.metodo === "CRIPTO"
              ? {
                  moneda: payment.criptoMoneda,
                  txHash: maskTransactionHash(payment.txHash),
                  confirmations: payment.confirmacionesOnchain ?? 0,
                  requiredConfirmations,
                  state: onchainState,
                  network,
                  explorerUrl,
                  receivedAmount,
                }
              : null,
        }
      : null,
    stage,
    timeline,
    progress,
    terminal: cancelled || delivered,
    refreshAfterMs: cancelled || delivered ? null : 8_000,
    generatedAt: new Date().toISOString(),
  };
}
