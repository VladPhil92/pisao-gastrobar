import type { ConversationalProposal } from "@/lib/ai/conversational-commerce";
import type { ReservationDraft } from "@/lib/reservas/conversation";
import type { ReservationAvailability } from "@/lib/reservas/availability";

export type ConciergeActionType =
  | "cart.add_proposal"
  | "reservation.confirm"
  | "human.handoff";

export type ConciergeActionExecution = "client_auto" | "user_tap";

export type ConciergeActionPlan = {
  type: ConciergeActionType;
  execution: ConciergeActionExecution;
  label: string;
  reason: string;
};

type ReservationActionState = {
  draft: ReservationDraft;
  availability: ReservationAvailability | null;
  availabilityError: string | null;
  canSubmit: boolean;
} | null;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function explicitlyRequestsCart(text: string) {
  return (
    /\b(agrega|agregalo|anade|anadelo|mete|pon|lleva|pasalo|sumalo)\b.*\b(carrito|mesa visual|pedido)\b/.test(
      text,
    ) ||
    /\b(agrega|anade|mete|pon)\b.*\b(propuesta|mesa|plan)\b/.test(text)
  );
}

function explicitlyConfirmsReservation(text: string) {
  return (
    /\bconfirma(?:r|me|la|lo)?\b.*\breserva/.test(text) ||
    /\breserva\b.*\bconfirma(?:r|me|la|lo)?\b/.test(text) ||
    /\b(haz|hacer|dejame|dejala|dejalo)\b.*\b(la|esa|esta)?\s*reserva\b/.test(text) ||
    /\breservame\s+ya\b/.test(text)
  );
}

function explicitlyRequestsHuman(text: string) {
  return (
    /\b(hablar|habla|contactar|contactame|pasame|comunicar|comunicarme)\b.*\b(persona|humano|asesor|equipo|whatsapp)\b/.test(
      text,
    ) ||
    /\b(persona|humano|asesor)\b.*\b(hablar|contactar|pasame)\b/.test(text)
  );
}

export function buildConciergeAction(params: {
  latestUserMessage: string;
  proposal: ConversationalProposal | null;
  reservation: ReservationActionState;
  requiresHumanValidation?: boolean;
  oversizedGroup?: boolean;
  availabilityError?: string | null;
}): ConciergeActionPlan | null {
  const text = normalize(params.latestUserMessage);

  if (
    explicitlyRequestsHuman(text) ||
    params.requiresHumanValidation ||
    params.oversizedGroup ||
    Boolean(params.availabilityError)
  ) {
    return {
      type: "human.handoff",
      execution: "user_tap",
      label: "Continuar con una persona",
      reason: explicitlyRequestsHuman(text)
        ? "El huésped pidió atención humana."
        : "La solicitud requiere validación humana o coordinación especial.",
    };
  }

  if (
    params.reservation?.canSubmit &&
    explicitlyConfirmsReservation(text)
  ) {
    return {
      type: "reservation.confirm",
      execution: "user_tap",
      label: "Confirmar reserva",
      reason:
        "El huésped dio una orden explícita de confirmar una reserva cuyos datos y disponibilidad ya fueron validados.",
    };
  }

  if (params.proposal && explicitlyRequestsCart(text)) {
    return {
      type: "cart.add_proposal",
      execution: "user_tap",
      label: "Confirmar en Mesa Visual",
      reason:
        "El huésped dio una orden explícita de añadir la propuesta calculada al carrito.",
    };
  }

  return null;
}

export function actionContextForModel(action: ConciergeActionPlan | null) {
  if (!action) {
    return [
      "ACTION RUNTIME",
      "No hay una acción transaccional autorizada en este turno.",
      "No afirmes que modificaste carrito, reserva o pedido.",
    ].join("\n");
  }

  return [
    "ACTION RUNTIME",
    `Acción: ${action.type}`,
    `Ejecución: ${action.execution}`,
    `Motivo: ${action.reason}`,
    "La interfaz exigirá una confirmación explícita antes de ejecutar cualquier escritura. No declares que la acción ya fue ejecutada.",
  ].join("\n");
}
