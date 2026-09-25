export type CommercialPaymentMethod =
  | "QR_TRANSFERENCIA"
  | "CRIPTO"
  | "TARJETA";

export type CommercialPaymentStatus =
  | "PENDIENTE"
  | "EN_VERIFICACION"
  | "APROBADO"
  | "RECHAZADO";

export type CommercialOrderStatus =
  | "PENDIENTE_PAGO"
  | "PENDIENTE_VERIFICACION"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "LISTO"
  | "EN_CAMINO"
  | "ENTREGADO"
  | "CANCELADO";

export type CommercialDeliveryType = "DOMICILIO" | "RECOGIDA";

export type CommercialSnapshot = {
  method: CommercialPaymentMethod;
  paymentStatus: CommercialPaymentStatus;
  orderStatus: CommercialOrderStatus;
  deliveryType: CommercialDeliveryType;
  evidenceReceived: boolean;
  cryptoTxPresent?: boolean;
  cryptoConfirmed?: boolean;
};

export type CommercialCertification = {
  certified: boolean;
  issues: string[];
};

const MANUAL_METHODS = new Set<CommercialPaymentMethod>([
  "QR_TRANSFERENCIA",
  "CRIPTO",
]);

const OPERATIONAL_ORDER_STATES = new Set<CommercialOrderStatus>([
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "EN_CAMINO",
  "ENTREGADO",
]);

export function certifyCommercialSnapshot(
  snapshot: CommercialSnapshot,
): CommercialCertification {
  const issues: string[] = [];
  const manual = MANUAL_METHODS.has(snapshot.method);
  const operational = OPERATIONAL_ORDER_STATES.has(snapshot.orderStatus);

  if (
    manual &&
    snapshot.paymentStatus === "APROBADO" &&
    !snapshot.evidenceReceived
  ) {
    issues.push("MANUAL_PAYMENT_APPROVED_WITHOUT_EVIDENCE");
  }

  if (
    manual &&
    snapshot.evidenceReceived &&
    snapshot.paymentStatus === "PENDIENTE"
  ) {
    issues.push("EVIDENCE_RECEIVED_BUT_PAYMENT_STILL_PENDING");
  }

  if (
    snapshot.paymentStatus === "EN_VERIFICACION" &&
    snapshot.orderStatus !== "PENDIENTE_VERIFICACION"
  ) {
    issues.push("PAYMENT_REVIEW_ORDER_STATE_MISMATCH");
  }

  if (
    snapshot.orderStatus === "PENDIENTE_VERIFICACION" &&
    snapshot.paymentStatus !== "EN_VERIFICACION"
  ) {
    issues.push("ORDER_REVIEW_PAYMENT_STATE_MISMATCH");
  }

  if (operational && snapshot.paymentStatus !== "APROBADO") {
    issues.push("OPERATIONAL_ORDER_WITHOUT_APPROVED_PAYMENT");
  }

  if (
    snapshot.paymentStatus === "APROBADO" &&
    ["PENDIENTE_PAGO", "PENDIENTE_VERIFICACION"].includes(
      snapshot.orderStatus,
    )
  ) {
    issues.push("APPROVED_PAYMENT_WITH_UNRELEASED_ORDER");
  }

  if (
    snapshot.paymentStatus === "RECHAZADO" &&
    snapshot.orderStatus !== "CANCELADO"
  ) {
    issues.push("REJECTED_PAYMENT_WITH_ACTIVE_ORDER");
  }

  if (
    snapshot.orderStatus === "EN_CAMINO" &&
    snapshot.deliveryType !== "DOMICILIO"
  ) {
    issues.push("PICKUP_ORDER_CANNOT_BE_ON_ROUTE");
  }

  if (snapshot.method === "CRIPTO") {
    const requiresTx = ["EN_VERIFICACION", "APROBADO"].includes(
      snapshot.paymentStatus,
    );

    if (requiresTx && !snapshot.cryptoTxPresent) {
      issues.push("CRYPTO_REVIEW_WITHOUT_TX");
    }

    if (snapshot.cryptoConfirmed && !snapshot.cryptoTxPresent) {
      issues.push("CRYPTO_CONFIRMED_WITHOUT_TX");
    }

    if (
      snapshot.paymentStatus === "APROBADO" &&
      snapshot.cryptoConfirmed !== true
    ) {
      issues.push("CRYPTO_APPROVED_WITHOUT_ONCHAIN_CONFIRMATION");
    }
  }

  return {
    certified: issues.length === 0,
    issues,
  };
}

export function expectedCommercialLifecycle(input: {
  method: CommercialPaymentMethod;
  deliveryType: CommercialDeliveryType;
}) {
  const { method, deliveryType } = input;
  const manual = MANUAL_METHODS.has(method);

  const lifecycle: CommercialSnapshot[] = [
    {
      method,
      paymentStatus: "PENDIENTE",
      orderStatus: "PENDIENTE_PAGO",
      deliveryType,
      evidenceReceived: false,
      cryptoTxPresent: false,
      cryptoConfirmed: false,
    },
  ];

  if (manual) {
    lifecycle.push({
      method,
      paymentStatus: "EN_VERIFICACION",
      orderStatus: "PENDIENTE_VERIFICACION",
      deliveryType,
      evidenceReceived: true,
      cryptoTxPresent: method === "CRIPTO",
      cryptoConfirmed: false,
    });
  }

  lifecycle.push({
    method,
    paymentStatus: "APROBADO",
    orderStatus: "CONFIRMADO",
    deliveryType,
    evidenceReceived: manual,
    cryptoTxPresent: method === "CRIPTO",
    cryptoConfirmed: method === "CRIPTO",
  });

  for (const orderStatus of ["EN_PREPARACION", "LISTO"] as const) {
    lifecycle.push({
      method,
      paymentStatus: "APROBADO",
      orderStatus,
      deliveryType,
      evidenceReceived: manual,
      cryptoTxPresent: method === "CRIPTO",
      cryptoConfirmed: method === "CRIPTO",
    });
  }

  if (deliveryType === "DOMICILIO") {
    lifecycle.push({
      method,
      paymentStatus: "APROBADO",
      orderStatus: "EN_CAMINO",
      deliveryType,
      evidenceReceived: manual,
      cryptoTxPresent: method === "CRIPTO",
      cryptoConfirmed: method === "CRIPTO",
    });
  }

  lifecycle.push({
    method,
    paymentStatus: "APROBADO",
    orderStatus: "ENTREGADO",
    deliveryType,
    evidenceReceived: manual,
    cryptoTxPresent: method === "CRIPTO",
    cryptoConfirmed: method === "CRIPTO",
  });

  return lifecycle;
}
