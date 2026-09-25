export const CUSTOMER_LIFECYCLE_ENGINE_VERSION = "customer_lifecycle_v16";

export type CustomerLifecycleStage =
  | "PROSPECT"
  | "NEW_CUSTOMER"
  | "ACTIVE"
  | "LOYAL"
  | "AT_RISK"
  | "DORMANT";

export type CustomerLifecycleInput = {
  deliveredOrders: number;
  loyaltyPoints: number;
  lastActivityAt: Date;
  marketingConsent: boolean;
  hasContact: boolean;
};

export type CustomerLifecycleResult = {
  engineVersion: typeof CUSTOMER_LIFECYCLE_ENGINE_VERSION;
  stage: CustomerLifecycleStage;
  daysSinceLastActivity: number;
  outreachAllowed: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
  nextBestAction: string;
  rationale: string;
};

const DAY_MS = 86_400_000;

function recencyDays(lastActivityAt: Date, now: Date) {
  const last = lastActivityAt.getTime();
  const current = now.getTime();
  if (!Number.isFinite(last) || !Number.isFinite(current)) return 0;
  return Math.max(0, Math.floor((current - last) / DAY_MS));
}

export function classifyCustomerLifecycle(
  input: CustomerLifecycleInput,
  now = new Date(),
): CustomerLifecycleResult {
  const deliveredOrders = Math.max(0, Math.floor(input.deliveredOrders || 0));
  const loyaltyPoints = Math.max(0, Math.floor(input.loyaltyPoints || 0));
  const daysSinceLastActivity = recencyDays(input.lastActivityAt, now);
  const outreachAllowed = Boolean(input.marketingConsent && input.hasContact);

  let stage: CustomerLifecycleStage;
  if (daysSinceLastActivity > 90) {
    stage = "DORMANT";
  } else if (deliveredOrders > 0 && daysSinceLastActivity > 45) {
    stage = "AT_RISK";
  } else if (deliveredOrders >= 5) {
    stage = "LOYAL";
  } else if (deliveredOrders >= 2) {
    stage = "ACTIVE";
  } else if (deliveredOrders === 1) {
    stage = "NEW_CUSTOMER";
  } else {
    stage = "PROSPECT";
  }

  const contactRule = outreachAllowed
    ? "Puede recibir una acción de reactivación únicamente por canales consentidos."
    : "No habilitar contacto saliente: usar personalización onsite o esperar nueva interacción.";

  const byStage: Record<
    CustomerLifecycleStage,
    Pick<CustomerLifecycleResult, "priority" | "nextBestAction" | "rationale">
  > = {
    PROSPECT: {
      priority: "LOW",
      nextBestAction: "Reducir fricción para la primera compra",
      rationale:
        "Existe actividad CRM, pero todavía no hay un pedido pagado y entregado.",
    },
    NEW_CUSTOMER: {
      priority: "MEDIUM",
      nextBestAction: "Facilitar una segunda experiencia",
      rationale:
        "Ya completó una primera compra; la siguiente señal útil es recurrencia.",
    },
    ACTIVE: {
      priority: "MEDIUM",
      nextBestAction: "Reforzar frecuencia con relevancia, no con descuentos automáticos",
      rationale:
        "Tiene recurrencia demostrada y actividad reciente.",
    },
    LOYAL: {
      priority: "LOW",
      nextBestAction: "Reconocer fidelidad y proteger la experiencia",
      rationale: `Cliente frecuente con ${deliveredOrders} pedidos entregados y ${loyaltyPoints} PISÁO Points acumulados.`,
    },
    AT_RISK: {
      priority: "HIGH",
      nextBestAction: outreachAllowed
        ? "Preparar reactivación consentida"
        : "Preparar experiencia de retorno sin contacto saliente",
      rationale: `Tuvo compras previas, pero lleva ${daysSinceLastActivity} días sin actividad. ${contactRule}`,
    },
    DORMANT: {
      priority: "HIGH",
      nextBestAction: outreachAllowed
        ? "Evaluar reactivación consentida de baja frecuencia"
        : "Mantener sin contacto y reconocerlo si regresa",
      rationale: `Lleva ${daysSinceLastActivity} días sin actividad. ${contactRule}`,
    },
  };

  return {
    engineVersion: CUSTOMER_LIFECYCLE_ENGINE_VERSION,
    stage,
    daysSinceLastActivity,
    outreachAllowed,
    ...byStage[stage],
  };
}
