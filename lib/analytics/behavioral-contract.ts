import { z } from "zod";

export const BEHAVIOR_EVENT_NAMES = [
  "page_view",
  "menu_view",
  "category_filter",
  "product_view",
  "cart_add",
  "plan_open",
  "plan_config_change",
  "plan_proposal_add",
  "visual_table_open",
  "visual_table_suggestion_add",
  "cart_review",
  "checkout_start",
  "checkout_step",
  "checkout_complete",
  "reservation_start",
  "reservation_submit_success",
  "reservation_availability_check",
  "reservation_availability_unavailable",
  "whatsapp_intent",
  "concierge_open",
  "concierge_proposal_view",
  "concierge_proposal_add",
  "concierge_nba_view",
  "concierge_nba_add",
  "concierge_reservation_ready",
  "concierge_reservation_submit_success",
  "concierge_handoff_whatsapp",
  "concierge_action_executed",
] as const;

export const BEHAVIOR_SURFACES = [
  "site",
  "home",
  "menu",
  "product",
  "plan",
  "table",
  "checkout",
  "reservation",
  "concierge",
  "contact",
  "events",
  "gallery",
  "account",
] as const;

const slugSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const behaviorEventSchema = z
  .object({
    eventName: z.enum(BEHAVIOR_EVENT_NAMES),
    sessionId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    pathname: z.string().min(1).max(180).startsWith("/"),
    surface: z.enum(BEHAVIOR_SURFACES).optional(),
    productSlug: slugSchema.optional(),
    categorySlug: slugSchema.optional(),
    intent: z
      .enum([
        "rapido",
        "compartir",
        "completa",
        "bandit_exploit",
        "bandit_explore",
        "bandit_holdout",
      ])
      .optional(),
    step: z.enum(["entrega", "metodo", "pago", "confirmacion"]).optional(),
    paymentMethod: z.enum(["QR_TRANSFERENCIA", "CRIPTO", "TARJETA"]).optional(),
    deviceClass: z.enum(["mobile", "tablet", "desktop"]).optional(),
    budgetTier: z.number().int().min(0).max(500_000).optional(),
    diners: z.number().int().min(1).max(30).optional(),
    itemCount: z.number().int().min(0).max(100).optional(),
    action: z.enum(["cart.add_proposal", "reservation.confirm", "human.handoff"]).optional(),
  })
  .strict();

export type BehaviorEventPayload = z.infer<typeof behaviorEventSchema>;
export type BehaviorEventName = BehaviorEventPayload["eventName"];
export type BehaviorSurface = NonNullable<BehaviorEventPayload["surface"]>;

export type BehaviorDimensions = Omit<
  BehaviorEventPayload,
  "eventName" | "sessionId" | "pathname" | "deviceClass"
>;
