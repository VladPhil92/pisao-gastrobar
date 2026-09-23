"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  Send,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { whatsappLink } from "@/lib/site-config";
import {
  getBehaviorSessionId,
  trackBehavior,
} from "@/lib/analytics/behavioral-client";
import { useCartStore } from "@/lib/cart/store";
import type { ConversationalProposal } from "@/lib/ai/conversational-commerce";
import type {
  HospitalityAnalysis,
  HospitalityProfile,
} from "@/lib/ai/hospitality-brain";
import {
  loadHospitalityProfile,
  saveHospitalityProfile,
} from "@/lib/ai/hospitality-profile-client";
import {
  loadConciergeIdentity,
  type ConciergeIdentity,
} from "@/lib/ai/concierge-identity-client";
import type { ReservationDraft } from "@/lib/reservas/conversation";
import type { ReservationAvailability } from "@/lib/reservas/availability";
import type { ConciergeActionPlan } from "@/lib/ai/action-runtime";
import { TurnstileGate } from "@/components/security/TurnstileGate";

type TransactionCommandClient = {
  id: string;
  type: "cart.commit" | "reservation.commit";
  label: string;
  confirmationToken: string;
  expiresAt: string;
};

type ReservationState = {
  draft: ReservationDraft;
  availability: ReservationAvailability | null;
  availabilityError: string | null;
  canSubmit: boolean;
};

type HospitalityState = {
  analysis: HospitalityAnalysis;
  profile: HospitalityProfile;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  proposal?: ConversationalProposal | null;
  reservation?: ReservationState | null;
  hospitality?: HospitalityState | null;
  action?: ConciergeActionPlan | null;
  commands?: TransactionCommandClient[];
};

const quickPrompts = [
  "Cuádrame una mesa",
  "Somos 4, tenemos $180.000 y queremos compartir sin alcohol",
  "Recomiéndame algo bien PISÁO",
  "Quiero pedir a domicilio",
];

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "¡Qué bueno tenerte por acá! ¿Vienes buscando mesa, algo rico para comer o quieres que te recomiende qué pedir?",
  },
];

function hospitalityHeadline(analysis?: HospitalityAnalysis) {
  if (!analysis) return "Hospitalidad caribeña, a la orden";

  if (analysis.visitStage === "in_restaurant") return "Tu anfitrión mientras estás en PISÁO";

  switch (analysis.guestState) {
    case "ready_to_book":
      return "Te cuadramos la reserva";
    case "ready_to_order":
      return "Vamos armando tu pedido";
    case "deciding":
      return "Te ayudo a escoger";
    case "celebrating":
      return "Armemos un buen plan";
    case "needs_help":
      return "Vamos a resolverlo";
    default:
      return "Hospitalidad caribeña, a la orden";
  }
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function proposalItemCount(proposal: ConversationalProposal) {
  return proposal.items.reduce((sum, item) => sum + item.quantity, 0);
}

function reservationKey(draft: ReservationDraft) {
  return [draft.fecha, draft.hora, draft.telefono, draft.personas].join("|");
}

function commandFor(
  message: Message,
  type: TransactionCommandClient["type"],
) {
  return message.commands?.find((command) => command.type === type) ?? null;
}

export function PisaoConcierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [commandSubmittingId, setCommandSubmittingId] = useState<string | null>(null);
  const [createdReservations, setCreatedReservations] = useState<Record<string, string>>({});
  const [addedProposals, setAddedProposals] = useState<Record<string, boolean>>({});
  const [hospitalityProfile, setHospitalityProfile] =
    useState<HospitalityProfile | null>(null);
  const [conciergeIdentity, setConciergeIdentity] =
    useState<ConciergeIdentity | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const addItems = useCartStore((state) => state.addItems);
  const openCart = useCartStore((state) => state.open);

  useEffect(() => {
    setHospitalityProfile(loadHospitalityProfile());
    setConciergeIdentity(loadConciergeIdentity());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, reservationSubmitting]);

  const latestHospitality = [...messages]
    .reverse()
    .find((message) => message.hospitality)?.hospitality?.analysis;

  async function sendMessage(raw: string) {
    const content = raw.trim();
    if (!content || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
          guestProfile: hospitalityProfile,
          guestKey: conciergeIdentity?.guestKey,
          sessionKey: conciergeIdentity?.sessionKey,
          behaviorSessionId: getBehaviorSessionId() ?? undefined,
        }),
      });

      const payload = (await response.json()) as {
        text?: string;
        error?: string;
        proposal?: ConversationalProposal | null;
        reservation?: ReservationState | null;
        hospitality?: HospitalityState | null;
        action?: ConciergeActionPlan | null;
        commands?: TransactionCommandClient[];
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error || "No fue posible responder.");
      }

      if (payload.proposal) {
        trackBehavior("concierge_proposal_view", {
          surface: "concierge",
          intent: payload.proposal.intent,
          diners: payload.proposal.diners,
          budgetTier: Math.min(500_000, payload.proposal.perPerson),
          itemCount: proposalItemCount(payload.proposal),
        });
      }

      if (payload.reservation?.canSubmit && payload.reservation.draft.personas) {
        trackBehavior("concierge_reservation_ready", {
          surface: "concierge",
          diners: payload.reservation.draft.personas,
        });
      }

      if (payload.hospitality?.profile) {
        setHospitalityProfile(payload.hospitality.profile);
        saveHospitalityProfile(payload.hospitality.profile);
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.text!,
          proposal: payload.proposal,
          reservation: payload.reservation,
          hospitality: payload.hospitality,
          action: payload.action,
          commands: payload.commands,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible responder.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `${message} Si quieres, puedes continuar de inmediato con nuestro equipo por WhatsApp.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function executeTransactionCommand(
    command: TransactionCommandClient,
    message: Message,
  ) {
    if (!conciergeIdentity?.sessionKey || commandSubmittingId) return;

    if (turnstileRequired && !turnstileToken) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "La verificación de seguridad todavía no está lista. Intenta confirmar nuevamente en un momento.",
        },
      ]);
      return;
    }

    setCommandSubmittingId(command.id);

    try {
      const response = await fetch("/api/ai/commands/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken
            ? { "X-Turnstile-Token": turnstileToken }
            : {}),
        },
        body: JSON.stringify({
          commandId: command.id,
          confirmationToken: command.confirmationToken,
          sessionKey: conciergeIdentity.sessionKey,
        }),
      });

      const payload = (await response.json()) as {
        command?: { id: string; type: string; status: string };
        cart?: {
          proposalId: string;
          total: number;
          items: Array<{
            productoId: string;
            nombre: string;
            slug: string;
            precio: number;
            imagenUrl?: string | null;
            categoriaSlug?: string | null;
            cantidad: number;
          }>;
        };
        reserva?: {
          id: string;
          estado: string;
          fecha: string;
          hora: string;
          personas: number;
          mesas?: string[];
        };
        error?: string;
        alternatives?: string[];
      };

      if (!response.ok) {
        const alternatives = payload.alternatives?.length
          ? ` Horas disponibles cercanas: ${payload.alternatives.join(", ")}.`
          : "";
        throw new Error(
          `${payload.error || "No fue posible confirmar la acción."}${alternatives}`,
        );
      }

      if (command.type === "cart.commit" && payload.cart) {
        addItems(
          payload.cart.items.map((entry) => ({
            item: {
              productoId: entry.productoId,
              nombre: entry.nombre,
              slug: entry.slug,
              precio: entry.precio,
              imagenUrl: entry.imagenUrl ?? undefined,
              categoriaSlug: entry.categoriaSlug ?? undefined,
            },
            cantidad: entry.cantidad,
          })),
        );

        const proposalId = message.proposal?.id ?? payload.cart.proposalId;
        setAddedProposals((current) => ({
          ...current,
          [proposalId]: true,
        }));
        trackBehavior("concierge_action_executed", {
          surface: "concierge",
          action: "cart.add_proposal",
        });
        openCart();
      }

      if (
        command.type === "reservation.commit" &&
        payload.reserva &&
        message.reservation
      ) {
        const draft = message.reservation.draft;
        setCreatedReservations((current) => ({
          ...current,
          [reservationKey(draft)]: payload.reserva!.id,
        }));

        trackBehavior("reservation_submit_success", {
          surface: "concierge",
          diners: payload.reserva.personas,
        });
        trackBehavior("concierge_reservation_submit_success", {
          surface: "concierge",
          diners: payload.reserva.personas,
        });

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              `Reserva confirmada para ${payload.reserva!.personas} persona${payload.reserva!.personas === 1 ? "" : "s"} el ${payload.reserva!.fecha} a las ${payload.reserva!.hora}. ${payload.reserva!.mesas?.length ? `Mesa(s) asignada(s): ${payload.reserva!.mesas.join(", ")}. ` : ""}Código: ${payload.reserva!.id.slice(-8).toUpperCase()}.`,
          },
        ]);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "No fue posible ejecutar la acción. Puedes continuar por WhatsApp.",
        },
      ]);
    } finally {
      setTurnstileToken(null);
      setTurnstileResetKey((current) => current + 1);
      setCommandSubmittingId(null);
    }
  }

  async function confirmReservation(state: ReservationState) {
    const { draft } = state;
    if (
      !state.canSubmit ||
      !draft.nombre ||
      !draft.telefono ||
      !draft.fecha ||
      !draft.hora ||
      !draft.personas ||
      reservationSubmitting
    ) {
      return;
    }

    const key = reservationKey(draft);
    if (createdReservations[key]) return;

    if (turnstileRequired && !turnstileToken) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "La verificación de seguridad todavía no está lista. Intenta confirmar nuevamente en un momento.",
        },
      ]);
      return;
    }

    setReservationSubmitting(true);

    try {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken
            ? { "X-Turnstile-Token": turnstileToken }
            : {}),
        },
        body: JSON.stringify({
          nombre: draft.nombre,
          telefono: draft.telefono,
          email: draft.email ?? "",
          fecha: draft.fecha,
          hora: draft.hora,
          personas: draft.personas,
          notas: draft.notas,
        }),
      });

      const payload = (await response.json()) as {
        reserva?: { id: string; estado: string; mesas?: string[] };
        error?: string;
        alternatives?: string[];
      };

      if (!response.ok || !payload.reserva) {
        const alternatives = payload.alternatives?.length
          ? ` Horas disponibles cercanas: ${payload.alternatives.join(", ")}.`
          : "";
        throw new Error(`${payload.error || "No fue posible registrar la reserva."}${alternatives}`);
      }

      setCreatedReservations((current) => ({
        ...current,
        [key]: payload.reserva!.id,
      }));

      trackBehavior("reservation_submit_success", {
        surface: "concierge",
        diners: draft.personas,
      });
      trackBehavior("concierge_reservation_submit_success", {
        surface: "concierge",
        diners: draft.personas,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            `Reserva confirmada para ${draft.personas} persona${draft.personas === 1 ? "" : "s"} el ${draft.fecha} a las ${draft.hora}. ${payload.reserva!.mesas?.length ? `Mesa(s) asignada(s): ${payload.reserva!.mesas.join(", ")}. ` : ""}El cupo ya fue descontado automáticamente del calendario de PISÁO. Código: ${payload.reserva!.id.slice(-8).toUpperCase()}.`,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "No fue posible registrar la solicitud. Puedes continuar por WhatsApp.",
        },
      ]);
    } finally {
      setTurnstileToken(null);
      setTurnstileResetKey((current) => current + 1);
      setReservationSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function addProposalToTable(proposal: ConversationalProposal) {
    if (addedProposals[proposal.id]) return;

    addItems(
      proposal.items.map((entry) => ({
        item: {
          productoId: entry.product.id,
          nombre: entry.product.nombre,
          slug: entry.product.slug,
          precio: entry.product.precio,
          imagenUrl: entry.product.imagenUrl,
          categoriaSlug: entry.product.categoriaSlug,
        },
        cantidad: entry.quantity,
      })),
    );

    setAddedProposals((current) => ({ ...current, [proposal.id]: true }));
    trackBehavior("concierge_proposal_add", {
      surface: "concierge",
      intent: proposal.intent,
      diners: proposal.diners,
      budgetTier: Math.min(500_000, proposal.perPerson),
      itemCount: proposalItemCount(proposal),
    });
    openCart();
  }

  const openConcierge = () => {
    trackBehavior("concierge_open", { surface: "concierge" });
    setOpen(true);
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          aria-label="Asistente de PISÁO"
          className="border-pisao-gold/20 bg-pisao-carbon shadow-pisao-carbon/80 flex h-[min(760px,84svh)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border shadow-2xl"
        >
          <header className="from-pisao-gold/18 border-pisao-gold/15 flex items-center gap-3 border-b bg-linear-to-r to-transparent px-4 py-4">
            <div className="bg-pisao-gold text-pisao-carbon flex size-10 items-center justify-center rounded-full">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-pisao-cream text-sm font-semibold">PISÁO Concierge</p>
              <p className="text-pisao-cream-muted mt-0.5 text-xs">
                {hospitalityHeadline(latestHospitality)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-pisao-cream-muted hover:text-pisao-cream rounded-full p-2 transition"
              aria-label="Cerrar asistente"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={message.role === "user" ? "max-w-[86%]" : "w-full max-w-[94%]"}>
                  <div
                    className={
                      message.role === "user"
                        ? "bg-pisao-gold text-pisao-carbon rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed"
                        : "bg-pisao-noche text-pisao-cream border-pisao-gold/10 rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
                    }
                  >
                    {message.content}
                  </div>

                  {message.role === "assistant" && message.reservation && (
                    <div className="border-pisao-gold/20 bg-pisao-noche mt-2 overflow-hidden rounded-2xl border">
                      <div className="border-pisao-gold/10 border-b px-4 py-3">
                        <p className="text-pisao-gold text-[9px] font-bold tracking-[.18em] uppercase">
                          Reserva
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <p className="text-pisao-cream flex items-center gap-1.5">
                            <CalendarDays className="text-pisao-gold size-3.5" />
                            {message.reservation.draft.fecha ?? "Fecha pendiente"}
                          </p>
                          <p className="text-pisao-cream">
                            {message.reservation.draft.hora ?? "Hora pendiente"}
                          </p>
                          <p className="text-pisao-cream flex items-center gap-1.5">
                            <Users className="text-pisao-gold size-3.5" />
                            {message.reservation.draft.personas
                              ? `${message.reservation.draft.personas} personas`
                              : "Personas pendientes"}
                          </p>
                          <p className="text-pisao-cream truncate">
                            {message.reservation.draft.nombre ?? "Nombre pendiente"}
                          </p>
                        </div>
                      </div>

                      {message.reservation.availability &&
                        !message.reservation.availability.available && (
                          <div className="border-pisao-gold/10 border-b px-4 py-3">
                            <p className="text-pisao-cream-muted text-[10px]">
                              Prueba una hora cercana:
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.reservation.availability.alternatives.map((hora) => (
                                <button
                                  key={hora}
                                  type="button"
                                  onClick={() => void sendMessage(`Prefiero las ${hora}`)}
                                  className="border-pisao-gold/25 text-pisao-gold hover:bg-pisao-gold/10 rounded-lg border px-2.5 py-1.5 text-xs"
                                >
                                  {hora}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="p-3">
                        {message.reservation.canSubmit ? (
                          <button
                            type="button"
                            onClick={() => {
                              const command = commandFor(
                                message,
                                "reservation.commit",
                              );
                              if (command) {
                                void executeTransactionCommand(command, message);
                              } else {
                                void confirmReservation(message.reservation!);
                              }
                            }}
                            disabled={
                              reservationSubmitting ||
                              Boolean(commandSubmittingId) ||
                              Boolean(
                                createdReservations[
                                  reservationKey(message.reservation.draft)
                                ],
                              )
                            }
                            className="bg-pisao-gold text-pisao-carbon disabled:bg-pisao-green/20 disabled:text-pisao-cream flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition disabled:cursor-default"
                          >
                            {reservationSubmitting ||
                            commandSubmittingId ===
                              commandFor(message, "reservation.commit")?.id ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : createdReservations[
                                reservationKey(message.reservation.draft)
                              ] ? (
                              <Check className="size-4" />
                            ) : (
                              <CalendarDays className="size-4" />
                            )}
                            {createdReservations[
                              reservationKey(message.reservation.draft)
                            ]
                              ? "Reserva confirmada"
                              : "Confirmar reserva"}
                          </button>
                        ) : (
                          <a
                            href={whatsappLink(
                              "Hola PISÁO, necesito ayuda para confirmar una reserva.",
                            )}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              trackBehavior("whatsapp_intent", {
                                surface: "concierge",
                              });
                              trackBehavior("concierge_handoff_whatsapp", {
                                surface: "concierge",
                              });
                            }}
                            className="border-pisao-gold/25 text-pisao-gold flex w-full items-center justify-center rounded-xl border px-4 py-3 text-xs font-semibold"
                          >
                            Continuar por WhatsApp
                          </a>
                        )}
                        <p className="text-pisao-cream-muted/70 mt-2 text-center text-[9px]">
                          El sistema vuelve a validar capacidad y confirma automáticamente si el cupo sigue disponible.
                        </p>
                      </div>
                    </div>
                  )}

                  {message.role === "assistant" &&
                    message.action?.type === "human.handoff" && (
                      <div className="border-pisao-gold/20 bg-pisao-noche mt-2 rounded-2xl border p-3">
                        <a
                          href={whatsappLink(
                            "Hola PISÁO, el Concierge me indicó continuar con una persona.",
                          )}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            trackBehavior("concierge_action_executed", {
                              surface: "concierge",
                              action: "human.handoff",
                            });
                            trackBehavior("concierge_handoff_whatsapp", {
                              surface: "concierge",
                            });
                          }}
                          className="border-pisao-gold/25 text-pisao-gold flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold"
                        >
                          <MessageCircle className="size-4" />
                          {message.action.label}
                        </a>
                      </div>
                    )}

                  {message.role === "assistant" && message.proposal && (
                    <div className="border-pisao-gold/20 bg-pisao-noche/95 mt-2 overflow-hidden rounded-2xl border">
                      <div className="border-pisao-gold/10 flex items-start justify-between gap-3 border-b px-4 py-3">
                        <div>
                          <p className="text-pisao-gold text-[9px] font-bold tracking-[.18em] uppercase">
                            Mesa propuesta · {message.proposal.intentLabel}
                          </p>
                          <p className="text-pisao-cream mt-1 text-sm font-semibold">
                            {message.proposal.diners} personas
                          </p>
                        </div>
                        <p className="text-pisao-gold text-sm font-bold">
                          {money(message.proposal.total)}
                        </p>
                      </div>

                      <div className="divide-pisao-gold/10 divide-y">
                        {message.proposal.items.map((entry) => (
                          <div
                            key={`${message.proposal!.id}-${entry.product.id}-${entry.role}`}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <Link
                              href={`/menu/${entry.product.slug}`}
                              className="bg-pisao-carbon relative size-11 shrink-0 overflow-hidden rounded-xl border border-pisao-gold/10"
                            >
                              {entry.product.imagenUrl ? (
                                <Image
                                  src={entry.product.imagenUrl}
                                  alt={entry.product.nombre}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-pisao-gold flex h-full items-center justify-center text-xs font-bold">
                                  P
                                </span>
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-pisao-cream truncate text-xs font-semibold">
                                {entry.quantity}× {entry.product.nombre}
                              </p>
                              <p className="text-pisao-cream-muted mt-0.5 text-[9px] uppercase">
                                {entry.roleLabel}
                              </p>
                            </div>
                            <p className="text-pisao-gold shrink-0 text-[11px] font-semibold">
                              {money(entry.product.precio * entry.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="border-pisao-gold/10 border-t p-3">
                        <button
                          type="button"
                          onClick={() => {
                            const command = commandFor(message, "cart.commit");
                            if (command) {
                              void executeTransactionCommand(command, message);
                            } else {
                              addProposalToTable(message.proposal!);
                            }
                          }}
                          disabled={
                            Boolean(commandSubmittingId) ||
                            Boolean(addedProposals[message.proposal.id])
                          }
                          className="bg-pisao-gold text-pisao-carbon disabled:bg-pisao-green/20 disabled:text-pisao-cream flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold"
                        >
                          {commandSubmittingId ===
                          commandFor(message, "cart.commit")?.id ? (
                            <>
                              <LoaderCircle className="size-4 animate-spin" /> Confirmando…
                            </>
                          ) : addedProposals[message.proposal.id] ? (
                            <>
                              <Check className="size-4" /> Añadida a Mesa Visual
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="size-4" /> Añadir propuesta completa
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="grid gap-2 pt-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="border-pisao-gold/20 text-pisao-cream hover:border-pisao-gold/50 hover:bg-pisao-gold/5 flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="text-pisao-gold size-4 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-pisao-noche border-pisao-gold/10 text-pisao-cream-muted flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
                  <LoaderCircle className="size-4 animate-spin" />
                  Ya te ayudo…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-pisao-gold/10 border-t px-4 pt-3">
            <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
              <Link
                href="/menu"
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center"
              >
                Ver menú
              </Link>
              <Link
                href="/reservas"
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center"
              >
                Reservar
              </Link>
              <a
                href={whatsappLink("Hola PISÁO, necesito ayuda con mi visita o pedido.")}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackBehavior("whatsapp_intent", { surface: "concierge" });
                  trackBehavior("concierge_handoff_whatsapp", {
                    surface: "concierge",
                  });
                }}
                className="border-pisao-gold/20 text-pisao-cream hover:bg-pisao-gold/10 rounded-lg border px-2 py-2 text-center"
              >
                WhatsApp
              </a>
            </div>

            <TurnstileGate
              action="concierge_command"
              resetKey={turnstileResetKey}
              onTokenChange={setTurnstileToken}
              className="mb-2 min-h-0"
            />

            <form onSubmit={handleSubmit} className="flex gap-2 pb-3">
              <label htmlFor="pisao-ai-input" className="sr-only">
                Escribe tu mensaje
              </label>
              <input
                id="pisao-ai-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1600}
                placeholder="Ej. Reserva mañana 7 pm para 4…"
                className="border-pisao-gold/15 bg-pisao-noche text-pisao-cream placeholder:text-pisao-cream-muted/60 focus:border-pisao-gold min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="bg-pisao-gold text-pisao-carbon disabled:bg-pisao-gold/30 flex size-11 shrink-0 items-center justify-center rounded-xl"
                aria-label="Enviar mensaje"
              >
                <Send className="size-4" />
              </button>
            </form>
            <p className="text-pisao-cream-muted/70 pb-3 text-center text-[9px]">
              Disponibilidad y precios se validan contra los sistemas de PISÁO antes de registrar acciones.
            </p>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={openConcierge}
          className="bg-pisao-gold text-pisao-carbon shadow-pisao-carbon/70 group flex items-center gap-3 rounded-full px-4 py-3 font-semibold shadow-2xl transition hover:-translate-y-0.5 hover:scale-[1.02]"
          aria-label="Abrir asistente de PISÁO"
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-black/10">
            <Sparkles className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-[#c79a3a]" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-bold">PISÁO Concierge</span>
            <span className="block text-[10px] font-medium opacity-70">
              Caribe · Mesa · Carta
            </span>
          </span>
          <MessageCircle className="size-4 sm:hidden" />
        </button>
      )}
    </div>
  );
}
