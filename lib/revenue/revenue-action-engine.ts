import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  buildRevenueActionCandidates,
  type RevenueActionInputs,
} from "@/lib/revenue/revenue-action-core";

const DAY_MS = 86_400_000;
const ENGINE_VERSION = "revenue_action_engine_v2";

function currentBucket() {
  return String(Math.floor(Date.now() / (7 * DAY_MS)));
}

function fingerprint(key: string) {
  return createHash("sha256")
    .update(`${ENGINE_VERSION}:${currentBucket()}:${key}`)
    .digest("hex");
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function jsonString(
  value: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const item = jsonObject(value)[key];
  return typeof item === "string" ? item : null;
}

function jsonNumber(
  value: Prisma.JsonValue | null | undefined,
  key: string,
) {
  const item = jsonObject(value)[key];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

async function collectInputs(): Promise<RevenueActionInputs> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  const [orders, reservations] = await Promise.all([
    prisma.pedido.findMany({
      where: { createdAt: { gte: since30 } },
      select: {
        id: true,
        total: true,
        pago: { select: { estado: true } },
        attribution: { select: { assists: true } },
        items: {
          select: {
            cantidad: true,
            subtotal: true,
            productoId: true,
            producto: {
              select: {
                id: true,
                nombre: true,
                slug: true,
                destacado: true,
              },
            },
          },
        },
      },
    }),
    prisma.reserva.findMany({
      where: { createdAt: { gte: since30 } },
      select: { estado: true },
    }),
  ]);

  const paymentStarted = orders.filter((order) => order.pago).length;
  const paidOrders = orders.filter((order) => order.pago?.estado === "APROBADO");
  const trackedPaidOrders = paidOrders.filter((order) => order.attribution);
  const assistedPaidOrders = trackedPaidOrders.filter(
    (order) => (order.attribution?.assists.length ?? 0) > 0,
  );
  const directTrackedOrders = trackedPaidOrders.filter(
    (order) => (order.attribution?.assists.length ?? 0) === 0,
  );

  const assistedRevenue = assistedPaidOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const directRevenue = directTrackedOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );

  const products = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      units: number;
      revenue: number;
      featured: boolean;
    }
  >();

  const pairs = new Map<
    string,
    {
      productAId: string;
      productAName: string;
      productBId: string;
      productBName: string;
      orders: number;
    }
  >();

  for (const order of paidOrders) {
    for (const item of order.items) {
      const current = products.get(item.productoId) ?? {
        id: item.producto.id,
        name: item.producto.nombre,
        slug: item.producto.slug,
        units: 0,
        revenue: 0,
        featured: item.producto.destacado,
      };
      current.units += item.cantidad;
      current.revenue += Number(item.subtotal);
      products.set(item.productoId, current);
    }

    const uniqueProducts = [
      ...new Map(
        order.items.map((item) => [
          item.productoId,
          {
            id: item.productoId,
            name: item.producto.nombre,
          },
        ]),
      ).values(),
    ].sort((a, b) => a.id.localeCompare(b.id));

    for (let a = 0; a < uniqueProducts.length; a += 1) {
      for (let b = a + 1; b < uniqueProducts.length; b += 1) {
        const first = uniqueProducts[a];
        const second = uniqueProducts[b];
        const key = `${first.id}:${second.id}`;
        const current = pairs.get(key) ?? {
          productAId: first.id,
          productAName: first.name,
          productBId: second.id,
          productBName: second.name,
          orders: 0,
        };
        current.orders += 1;
        pairs.set(key, current);
      }
    }
  }

  const reservationRequested = reservations.length;
  const reservationConfirmed = reservations.filter((reservation) =>
    ["CONFIRMADA", "COMPLETADA"].includes(reservation.estado),
  ).length;

  return {
    paidOrders: paidOrders.length,
    paymentStarted,
    paymentApprovalRate: paymentStarted
      ? Math.round((paidOrders.length / paymentStarted) * 100)
      : 0,
    attributionCoveragePct: paidOrders.length
      ? Math.round((trackedPaidOrders.length / paidOrders.length) * 100)
      : 0,
    reservationRequested,
    reservationConfirmationRate: reservationRequested
      ? Math.round((reservationConfirmed / reservationRequested) * 100)
      : 0,
    assistedOrders: assistedPaidOrders.length,
    assistedAverageTicket: assistedPaidOrders.length
      ? Math.round(assistedRevenue / assistedPaidOrders.length)
      : 0,
    directTrackedOrders: directTrackedOrders.length,
    directTrackedAverageTicket: directTrackedOrders.length
      ? Math.round(directRevenue / directTrackedOrders.length)
      : 0,
    products: [...products.values()],
    pairs: [...pairs.values()],
  };
}

export async function syncRevenueActions() {
  const inputs = await collectInputs();
  const candidates = buildRevenueActionCandidates(inputs);

  const actions = [];
  for (const candidate of candidates) {
    const action = await prisma.revenueAction.upsert({
      where: { fingerprint: fingerprint(candidate.fingerprintKey) },
      update: {
        priorityScore: candidate.priorityScore,
        rationale: candidate.rationale,
        recommendedAction: candidate.recommendedAction,
        evidence: candidate.evidence as Prisma.InputJsonValue,
        payload: candidate.payload
          ? (candidate.payload as Prisma.InputJsonValue)
          : undefined,
      },
      create: {
        fingerprint: fingerprint(candidate.fingerprintKey),
        type: candidate.type,
        riskLevel: candidate.riskLevel,
        executionMode: candidate.executionMode,
        priorityScore: candidate.priorityScore,
        title: candidate.title,
        rationale: candidate.rationale,
        recommendedAction: candidate.recommendedAction,
        objectiveMetric: candidate.objectiveMetric,
        evidence: candidate.evidence as Prisma.InputJsonValue,
        payload: candidate.payload
          ? (candidate.payload as Prisma.InputJsonValue)
          : undefined,
      },
    });
    actions.push(action);
  }

  return { inputs, candidates: candidates.length, actions };
}

export async function getRevenueActionCenter() {
  const actions = await prisma.revenueAction.findMany({
    orderBy: [{ status: "asc" }, { priorityScore: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      type: true,
      status: true,
      riskLevel: true,
      executionMode: true,
      priorityScore: true,
      title: true,
      rationale: true,
      recommendedAction: true,
      objectiveMetric: true,
      evidence: true,
      payload: true,
      approvedAt: true,
      rejectedAt: true,
      executedAt: true,
      measurementStartedAt: true,
      measurementWindowDays: true,
      measuredAt: true,
      outcome: true,
      createdAt: true,
      decidedBy: { select: { nombre: true } },
      executedBy: { select: { nombre: true } },
    },
  });

  return {
    actions,
    summary: {
      pending: actions.filter((action) => action.status === "PENDING").length,
      approved: actions.filter((action) => action.status === "APPROVED").length,
      executed: actions.filter((action) => action.status === "EXECUTED").length,
      rejected: actions.filter((action) => action.status === "REJECTED").length,
    },
  };
}

export async function approveRevenueAction(id: string, userId: string) {
  const result = await prisma.revenueAction.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "APPROVED",
      decidedById: userId,
      approvedAt: new Date(),
      rejectedAt: null,
    },
  });

  if (result.count !== 1) {
    throw new Error("ACTION_NOT_PENDING");
  }

  return prisma.revenueAction.findUniqueOrThrow({ where: { id } });
}

export async function rejectRevenueAction(id: string, userId: string) {
  const result = await prisma.revenueAction.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "REJECTED",
      decidedById: userId,
      rejectedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    throw new Error("ACTION_NOT_PENDING");
  }

  return prisma.revenueAction.findUniqueOrThrow({ where: { id } });
}

export async function executeRevenueAction(id: string, userId: string) {
  const action = await prisma.revenueAction.findUnique({ where: { id } });
  if (!action || action.status !== "APPROVED") {
    throw new Error("ACTION_NOT_APPROVED");
  }

  if (action.type === "FEATURE_PRODUCT") {
    const productId = jsonString(action.payload, "productId");
    if (!productId) throw new Error("INVALID_ACTION_PAYLOAD");

    await prisma.$transaction([
      prisma.producto.update({
        where: { id: productId },
        data: { destacado: true },
      }),
      prisma.revenueAction.update({
        where: { id },
        data: {
          status: "EXECUTED",
          executedById: userId,
          executedAt: new Date(),
          measurementStartedAt: new Date(),
        },
      }),
    ]);
  } else {
    // CONCIERGE_PAIRING becomes active because the Concierge reads EXECUTED
    // actions directly. Manual actions are marked executed only after the
    // administrator confirms the operational step was performed.
    await prisma.revenueAction.update({
      where: { id },
      data: {
        status: "EXECUTED",
        executedById: userId,
        executedAt: new Date(),
        measurementStartedAt: new Date(),
      },
    });
  }

  return prisma.revenueAction.findUniqueOrThrow({ where: { id } });
}

export async function getActiveRevenuePlaybook() {
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const actions = await prisma.revenueAction.findMany({
    where: {
      status: "EXECUTED",
      type: "CONCIERGE_PAIRING",
      executedAt: { gte: since30 },
    },
    orderBy: [{ priorityScore: "desc" }, { executedAt: "desc" }],
    take: 3,
    select: {
      payload: true,
      evidence: true,
    },
  });

  const pairings = actions
    .map((action) => {
      const productAName = jsonString(action.payload, "productAName");
      const productBName = jsonString(action.payload, "productBName");
      const pairOrders = jsonNumber(action.evidence, "pairOrders30d");
      if (!productAName || !productBName) return null;
      return {
        productAName,
        productBName,
        pairOrders: pairOrders ?? 0,
      };
    })
    .filter(
      (
        item,
      ): item is {
        productAName: string;
        productBName: string;
        pairOrders: number;
      } => Boolean(item),
    );

  if (!pairings.length) {
    return "No hay reglas comerciales aprobadas y ejecutadas activas.";
  }

  return [
    "REGLAS COMERCIALES APROBADAS POR ADMINISTRACIÓN",
    ...pairings.map(
      (pairing) =>
        `- Afinidad observada: ${pairing.productAName} + ${pairing.productBName} (${pairing.pairOrders} pedidos pagados en la línea base). Puedes sugerir la combinación únicamente cuando encaje con la intención del cliente. No inventes descuento, disponibilidad ni causalidad.`,
    ),
  ].join("\n");
}

export async function measureRevenueActions() {
  const actions = await prisma.revenueAction.findMany({
    where: {
      status: "EXECUTED",
      measurementStartedAt: { not: null },
    },
    orderBy: { executedAt: "desc" },
    take: 30,
  });

  let measured = 0;

  for (const action of actions) {
    const since = action.measurementStartedAt;
    if (!since) continue;
    const observedDays = Math.max(
      1 / 24,
      (Date.now() - since.getTime()) / DAY_MS,
    );

    if (action.type === "FEATURE_PRODUCT") {
      const productId = jsonString(action.payload, "productId");
      if (!productId) continue;

      const orders = await prisma.pedido.findMany({
        where: {
          createdAt: { gte: since },
          pago: { is: { estado: "APROBADO" } },
          items: { some: { productoId } },
        },
        select: {
          total: true,
          items: {
            where: { productoId },
            select: { cantidad: true, subtotal: true },
          },
        },
      });

      const units = orders.reduce(
        (sum, order) =>
          sum + order.items.reduce((itemSum, item) => itemSum + item.cantidad, 0),
        0,
      );
      const productRevenue = orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum, item) => itemSum + Number(item.subtotal),
            0,
          ),
        0,
      );
      const baselineDailyUnits =
        jsonNumber(action.evidence, "baselineDailyUnits") ?? 0;

      await prisma.revenueAction.update({
        where: { id: action.id },
        data: {
          measuredAt: new Date(),
          outcome: {
            interpretation: "observed_after_execution_not_causal",
            observedDays: Number(observedDays.toFixed(2)),
            paidOrdersContainingProduct: orders.length,
            units,
            productRevenue: Math.round(productRevenue),
            observedDailyUnits: Number((units / observedDays).toFixed(3)),
            baselineDailyUnits,
          },
        },
      });
      measured += 1;
    }

    if (action.type === "CONCIERGE_PAIRING") {
      const productAId = jsonString(action.payload, "productAId");
      const productBId = jsonString(action.payload, "productBId");
      if (!productAId || !productBId) continue;

      const orders = await prisma.pedido.findMany({
        where: {
          createdAt: { gte: since },
          pago: { is: { estado: "APROBADO" } },
          AND: [
            { items: { some: { productoId: productAId } } },
            { items: { some: { productoId: productBId } } },
          ],
        },
        select: {
          total: true,
          attribution: { select: { assists: true } },
        },
      });

      const conciergeAssisted = orders.filter((order) =>
        order.attribution?.assists.includes("CONCIERGE"),
      ).length;
      const baselineDailyPairOrders =
        jsonNumber(action.evidence, "baselineDailyPairOrders") ?? 0;

      await prisma.revenueAction.update({
        where: { id: action.id },
        data: {
          measuredAt: new Date(),
          outcome: {
            interpretation: "observed_after_execution_not_causal",
            observedDays: Number(observedDays.toFixed(2)),
            paidPairOrders: orders.length,
            conciergeAssistedPairOrders: conciergeAssisted,
            observedDailyPairOrders: Number(
              (orders.length / observedDays).toFixed(3),
            ),
            baselineDailyPairOrders,
          },
        },
      });
      measured += 1;
    }
  }

  return { measured };
}
