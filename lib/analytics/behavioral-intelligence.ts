import { prisma } from "@/lib/prisma";
import { summarizeContextualCommerceLearning } from "@/lib/revenue/contextual-learning-core";
import {
  CLOSED_LOOP_MIN_EXPOSURES,
  closedLoopAdjustment,
} from "@/lib/revenue/closed-loop-recommendation-core";

const DAY_MS = 86_400_000;

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function distinctSessions(
  events: Array<{ sessionId: string; tipo: string }>,
  tipo?: string,
) {
  return new Set(
    events
      .filter((event) => !tipo || event.tipo === tipo)
      .map((event) => event.sessionId),
  ).size;
}

export async function getBehavioralIntelligence() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);

  try {
    const [events, paidOrders] = await Promise.all([
      prisma.eventoAnalitico.findMany({
        where: { createdAt: { gte: since30 } },
        select: {
          tipo: true,
          sessionId: true,
          pathname: true,
          surface: true,
          productSlug: true,
          categorySlug: true,
          intent: true,
          step: true,
          paymentMethod: true,
          deviceClass: true,
          budgetTier: true,
          diners: true,
          itemCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pedido.findMany({
        where: {
          createdAt: { gte: since30 },
        },
        select: {
          id: true,
          createdAt: true,
          pago: { select: { estado: true } },
          attribution: { select: { sessionId: true } },
          items: {
            select: {
              cantidad: true,
              subtotal: true,
              producto: { select: { slug: true } },
            },
          },
        },
      }),
    ]);

    const contextualLearning = summarizeContextualCommerceLearning(
      events.map((event) => ({
        tipo: event.tipo,
        sessionId: event.sessionId,
        productSlug: event.productSlug,
        createdAt: event.createdAt,
      })),
      paidOrders
        .filter((order) => order.pago?.estado === "APROBADO")
        .map((order) => ({
        id: order.id,
        sessionId: order.attribution?.sessionId ?? null,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          productSlug: item.producto.slug,
          quantity: item.cantidad,
          subtotalCop: Number(item.subtotal),
        })),
      })),
    );

    const closedLoopProducts = contextualLearning.products
      .map((product) => ({
        ...product,
        ranking: closedLoopAdjustment(product),
      }))
      .filter((product) => product.ranking.eligible);

    const sessions = distinctSessions(events);
    const events7 = events.filter((event) => event.createdAt >= since7);
    const sessions7 = distinctSessions(events7);

    const funnelDefinitions = [
      { event: null, label: "Sesión pública" },
      { event: "menu_view", label: "Abrió la carta" },
      { event: "product_view", label: "Vio un producto" },
      { event: "cart_add", label: "Agregó a la mesa" },
      { event: "checkout_start", label: "Inició checkout" },
      { event: "checkout_complete", label: "Creó pedido" },
    ] as const;

    const funnel = funnelDefinitions.map((definition, index) => {
      const value = definition.event
        ? distinctSessions(events, definition.event)
        : sessions;
      const previousDefinition = funnelDefinitions[index - 1];
      const previous = previousDefinition
        ? previousDefinition.event
          ? distinctSessions(events, previousDefinition.event)
          : sessions
        : sessions;

      return {
        label: definition.label,
        value,
        rate: pct(value, sessions),
        stepRate: index === 0 ? 100 : pct(value, previous),
      };
    });

    const productMap = new Map<
      string,
      { slug: string; views: number; adds: number; sessions: Set<string> }
    >();

    for (const event of events) {
      if (!event.productSlug) continue;
      if (
        !["product_view", "cart_add", "visual_table_suggestion_add"].includes(
          event.tipo,
        )
      )
        continue;

      const current = productMap.get(event.productSlug) ?? {
        slug: event.productSlug,
        views: 0,
        adds: 0,
        sessions: new Set<string>(),
      };

      if (event.tipo === "product_view") current.views += 1;
      if (["cart_add", "visual_table_suggestion_add"].includes(event.tipo)) {
        current.adds += 1;
      }
      current.sessions.add(event.sessionId);
      productMap.set(event.productSlug, current);
    }

    const productInterest = [...productMap.values()]
      .map((product) => ({
        slug: product.slug,
        views: product.views,
        adds: product.adds,
        sessions: product.sessions.size,
        addRate: pct(product.adds, product.views),
      }))
      .sort((a, b) => b.views + b.adds * 2 - (a.views + a.adds * 2))
      .slice(0, 8);

    const categoryMap = new Map<
      string,
      { slug: string; filters: number; adds: number; sessions: Set<string> }
    >();

    for (const event of events) {
      if (!event.categorySlug) continue;
      if (!['category_filter', 'cart_add'].includes(event.tipo)) continue;

      const current = categoryMap.get(event.categorySlug) ?? {
        slug: event.categorySlug,
        filters: 0,
        adds: 0,
        sessions: new Set<string>(),
      };

      if (event.tipo === "category_filter") current.filters += 1;
      if (event.tipo === "cart_add") current.adds += 1;
      current.sessions.add(event.sessionId);
      categoryMap.set(event.categorySlug, current);
    }

    const categoryInterest = [...categoryMap.values()]
      .map((category) => ({
        slug: category.slug,
        filters: category.filters,
        adds: category.adds,
        sessions: category.sessions.size,
      }))
      .sort((a, b) => b.filters + b.adds * 2 - (a.filters + a.adds * 2))
      .slice(0, 8);

    const planOpenSessions = distinctSessions(events, "plan_open");
    const planProposalSessions = distinctSessions(events, "plan_proposal_add");
    const tableOpenSessions = distinctSessions(events, "visual_table_open");
    const tableSuggestionSessions = distinctSessions(
      events,
      "visual_table_suggestion_add",
    );
    const reservationStartSessions = distinctSessions(events, "reservation_start");
    const reservationSuccessSessions = distinctSessions(
      events,
      "reservation_submit_success",
    );
    const whatsappSessions = distinctSessions(events, "whatsapp_intent");
    const conciergeSessions = distinctSessions(events, "concierge_open");

    const deviceMap = new Map<string, Set<string>>();
    for (const event of events) {
      const device = event.deviceClass ?? "unknown";
      const set = deviceMap.get(device) ?? new Set<string>();
      set.add(event.sessionId);
      deviceMap.set(device, set);
    }
    const devices = [...deviceMap.entries()]
      .map(([device, set]) => ({
        device,
        sessions: set.size,
        share: pct(set.size, sessions),
      }))
      .sort((a, b) => b.sessions - a.sessions);

    const signals: Array<{
      tone: "positive" | "attention" | "neutral";
      title: string;
      detail: string;
    }> = [];

    if (sessions >= 5) {
      let biggestDrop:
        | { from: string; to: string; previous: number; current: number; loss: number }
        | undefined;

      for (let index = 1; index < funnel.length; index += 1) {
        const previous = funnel[index - 1];
        const current = funnel[index];
        if (previous.value < 3) continue;
        const loss = previous.value - current.value;
        if (!biggestDrop || loss > biggestDrop.loss) {
          biggestDrop = {
            from: previous.label,
            to: current.label,
            previous: previous.value,
            current: current.value,
            loss,
          };
        }
      }

      if (biggestDrop && biggestDrop.loss > 0) {
        signals.push({
          tone: "attention",
          title: `Mayor fuga: ${biggestDrop.from} → ${biggestDrop.to}`,
          detail: `${biggestDrop.loss} sesiones no avanzaron a la siguiente señal observable en la ventana analizada.`,
        });
      }
    }

    const menuSessions = distinctSessions(events, "menu_view");
    if (menuSessions >= 5 && planOpenSessions > 0) {
      signals.push({
        tone: planProposalSessions > 0 ? "positive" : "neutral",
        title: "Modo Plan ya tiene adopción observable",
        detail: `${pct(planOpenSessions, menuSessions)}% de las sesiones que abrieron la carta también abrieron Modo Plan; ${planProposalSessions} sesiones llevaron una propuesta a la mesa.`,
      });
    }

    if (reservationStartSessions >= 3) {
      signals.push({
        tone:
          reservationSuccessSessions / reservationStartSessions >= 0.6
            ? "positive"
            : "attention",
        title: "Embudo de reserva medible",
        detail: `${reservationSuccessSessions} de ${reservationStartSessions} sesiones que iniciaron el formulario completaron una solicitud.`,
      });
    }

    if (contextualLearning.exposures >= 5) {
      signals.push({
        tone:
          contextualLearning.addRatePct >= 30
            ? "positive"
            : contextualLearning.addRatePct < 10
              ? "attention"
              : "neutral",
        title: "Contextual Commerce V19 ya es medible",
        detail:
          `${contextualLearning.accepted} de ${contextualLearning.exposures} exposiciones terminaron en un agregado explícito (${contextualLearning.addRatePct}%). ${contextualLearning.matchedPaidOrders} pedido(s) pago(s) incluyeron el mismo producto sugerido dentro de la ventana first-party. Es una asociación observada, no una atribución causal.`,
      });
    }

    if (signals.length === 0) {
      signals.push({
        tone: "neutral",
        title: "La línea base se está formando",
        detail:
          "V9 solo emitirá conclusiones cuando exista volumen suficiente. Los primeros eventos sirven para construir una referencia real de comportamiento.",
      });
    }

    return {
      connected: true as const,
      windowDays: 30,
      sessions,
      sessions7,
      totalEvents: events.length,
      events7: events7.length,
      averageEventsPerSession: sessions
        ? Math.round((events.length / sessions) * 10) / 10
        : 0,
      latestEventAt: events.at(-1)?.createdAt ?? null,
      funnel,
      productInterest,
      categoryInterest,
      contextualLearning,
      closedLoop: {
        minExposures: CLOSED_LOOP_MIN_EXPOSURES,
        eligibleProducts: closedLoopProducts.length,
        positiveProducts: closedLoopProducts.filter(
          (product) => product.ranking.adjustment > 0,
        ).length,
        negativeProducts: closedLoopProducts.filter(
          (product) => product.ranking.adjustment < 0,
        ).length,
      },
      devices,
      assists: {
        planOpenSessions,
        planProposalSessions,
        tableOpenSessions,
        tableSuggestionSessions,
        conciergeSessions,
        whatsappSessions,
        reservationStartSessions,
        reservationSuccessSessions,
      },
      signals,
    };
  } catch {
    return {
      connected: false as const,
      windowDays: 30,
      sessions: 0,
      sessions7: 0,
      totalEvents: 0,
      events7: 0,
      averageEventsPerSession: 0,
      latestEventAt: null,
      funnel: [],
      productInterest: [],
      categoryInterest: [],
      contextualLearning: summarizeContextualCommerceLearning([], []),
      closedLoop: {
        minExposures: CLOSED_LOOP_MIN_EXPOSURES,
        eligibleProducts: 0,
        positiveProducts: 0,
        negativeProducts: 0,
      },
      devices: [],
      assists: {
        planOpenSessions: 0,
        planProposalSessions: 0,
        tableOpenSessions: 0,
        tableSuggestionSessions: 0,
        conciergeSessions: 0,
        whatsappSessions: 0,
        reservationStartSessions: 0,
        reservationSuccessSessions: 0,
      },
      signals: [],
    };
  }
}
