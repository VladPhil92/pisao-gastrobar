export type OrderOperationalStatus =
  | "PENDIENTE_PAGO"
  | "PENDIENTE_VERIFICACION"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "LISTO"
  | "EN_CAMINO"
  | "ENTREGADO"
  | "CANCELADO";

export type OrderDeliveryType = "DOMICILIO" | "RECOGIDA";

export function nextOperationalStatuses(
  current: OrderOperationalStatus,
  deliveryType: OrderDeliveryType,
): OrderOperationalStatus[] {
  if (current === "CONFIRMADO") return ["EN_PREPARACION"];
  if (current === "EN_PREPARACION") return ["LISTO"];
  if (current === "LISTO") {
    return deliveryType === "DOMICILIO" ? ["EN_CAMINO"] : ["ENTREGADO"];
  }
  if (current === "EN_CAMINO" && deliveryType === "DOMICILIO") {
    return ["ENTREGADO"];
  }
  return [];
}

export function canTransitionOrderStatus(input: {
  current: OrderOperationalStatus;
  next: OrderOperationalStatus;
  deliveryType: OrderDeliveryType;
}) {
  return nextOperationalStatuses(input.current, input.deliveryType).includes(
    input.next,
  );
}

export function orderStatusActionLabel(
  status: OrderOperationalStatus,
  deliveryType: OrderDeliveryType,
) {
  const next = nextOperationalStatuses(status, deliveryType)[0];
  if (!next) return null;

  const labels: Record<OrderOperationalStatus, string> = {
    PENDIENTE_PAGO: "Esperando pago",
    PENDIENTE_VERIFICACION: "Verificar pago",
    CONFIRMADO: "Iniciar preparación",
    EN_PREPARACION: "Marcar listo",
    LISTO:
      deliveryType === "DOMICILIO" ? "Marcar en camino" : "Marcar entregado",
    EN_CAMINO: "Marcar entregado",
    ENTREGADO: "Entregado",
    CANCELADO: "Cancelado",
  };

  return {
    next,
    label: labels[status],
  };
}
