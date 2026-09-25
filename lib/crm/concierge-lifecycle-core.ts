import type { CustomerLifecycleStage } from "@/lib/crm/lifecycle-core";

export const CONCIERGE_LIFECYCLE_VERSION = "concierge_lifecycle_v17";

export type ConciergeFavorite = {
  name: string;
  units: number;
};

export type ConciergeLifecycleInput = {
  authenticated: boolean;
  stage: CustomerLifecycleStage;
  deliveredOrders: number;
  loyaltyPoints: number;
  favorites: ConciergeFavorite[];
};

export type ConciergeLifecycleGuidance = {
  version: typeof CONCIERGE_LIFECYCLE_VERSION;
  mode:
    | "ANONYMOUS"
    | "FIRST_PURCHASE"
    | "RETURNING"
    | "LOYALTY"
    | "RETURN_RECOVERY";
  context: string;
};

function safeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function favoriteLine(favorites: ConciergeFavorite[]) {
  const safe = favorites
    .filter((item) => item.name.trim() && safeInteger(item.units) > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 4);

  if (!safe.length) {
    return "Favoritos históricos verificables: sin señal suficiente.";
  }

  return `Favoritos históricos verificables: ${safe
    .map((item) => `${item.name} (${safeInteger(item.units)} uds.)`)
    .join(", ")}. Son señales históricas, no disponibilidad actual.`;
}

export function buildConciergeLifecycleGuidance(
  input: ConciergeLifecycleInput,
): ConciergeLifecycleGuidance {
  if (!input.authenticated) {
    return {
      version: CONCIERGE_LIFECYCLE_VERSION,
      mode: "ANONYMOUS",
      context:
        "No hay una cuenta PISÁO autenticada para este turno. No asumas historial, puntos, preferencias ni relación previa.",
    };
  }

  const deliveredOrders = safeInteger(input.deliveredOrders);
  const loyaltyPoints = safeInteger(input.loyaltyPoints);
  const favorites = favoriteLine(input.favorites);

  let mode: ConciergeLifecycleGuidance["mode"];
  let relationshipRule: string;

  switch (input.stage) {
    case "PROSPECT":
      mode = "FIRST_PURCHASE";
      relationshipRule =
        "No existe una compra entregada verificada. Facilita la primera experiencia sin insinuar que ya conoces sus gustos.";
      break;
    case "NEW_CUSTOMER":
      mode = "RETURNING";
      relationshipRule =
        "Existe una primera compra entregada. Si el usuario pide ayuda para elegir o repetir, puedes usar señales históricas verificadas con discreción.";
      break;
    case "ACTIVE":
      mode = "RETURNING";
      relationshipRule =
        "Es un cliente recurrente. Puedes priorizar opciones históricamente relevantes cuando encajen con su intención actual.";
      break;
    case "LOYAL":
      mode = "LOYALTY";
      relationshipRule =
        "Existe recurrencia alta. Reconoce la relación únicamente de forma natural y útil; nunca prometas beneficios no configurados.";
      break;
    case "AT_RISK":
    case "DORMANT":
      mode = "RETURN_RECOVERY";
      relationshipRule =
        "Tiene historial de compra pero no actividad reciente. Trátalo como un regreso normal: no menciones inactividad, riesgo, dormancia, retención ni segmentación. Puedes facilitar volver a pedir algo conocido si sigue disponible.";
      break;
  }

  return {
    version: CONCIERGE_LIFECYCLE_VERSION,
    mode,
    context: [
      "CUSTOMER LIFECYCLE PERSONALIZATION — ONSITE ONLY",
      `Pedidos pagados y entregados verificados: ${deliveredOrders}.`,
      `Saldo PISÁO Points: ${loyaltyPoints}. El canje automático NO está habilitado.`,
      favorites,
      `Regla de relación: ${relationshipRule}`,
      "Gobierno:",
      "- Este contexto existe porque la persona inició sesión y está interactuando dentro de PISÁO; no autoriza contacto saliente.",
      "- No reveles etiquetas internas de ciclo de vida, scores, días de inactividad, consentimiento de marketing ni lógica de segmentación.",
      "- No digas que vigilamos, rastreamos o perfilamos al cliente.",
      "- No inventes descuentos, regalos, privilegios, disponibilidad, precios ni redención de puntos.",
      "- Antes de sugerir un favorito histórico, verifica que aparezca disponible en la carta actual.",
      "- No infieras alergias, salud, religión, origen, situación económica ni otros atributos sensibles desde el historial.",
      "- La intención explícita del cliente y las reglas comerciales aprobadas tienen prioridad sobre esta personalización.",
    ].join("\n"),
  };
}
