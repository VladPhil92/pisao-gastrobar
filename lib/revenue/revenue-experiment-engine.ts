import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  assignExperimentArm,
  calculateExperimentResult,
  type ExperimentArm,
} from "@/lib/revenue/revenue-experiment-core";

const SESSION_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STOP_WORDS = new Set([
  "para",
  "con",
  "del",
  "las",
  "los",
  "una",
  "uno",
  "ale",
  "pale",
]);

function meaningfulTokens(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function isPairingRelevant(
  text: string,
  productAName: string,
  productBName: string,
) {
  const normalized = normalize(text);
  const namedTokens = [
    ...meaningfulTokens(productAName),
    ...meaningfulTokens(productBName),
  ];

  if (namedTokens.some((token) => normalized.includes(token))) return true;

  return /(recomiend|acompan|bebida|tomar|marid|combina|que pido|armame|plan para|para compartir)/.test(
    normalized,
  );
}

export async function syncRevenueExperiments() {
  const actions = await prisma.revenueAction.findMany({
    where: {
      status: "EXECUTED",
      type: "CONCIERGE_PAIRING",
    },
    orderBy: [{ priorityScore: "desc" }, { executedAt: "desc" }],
    take: 20,
    select: {
      id: true,
      title: true,
      payload: true,
    },
  });

  let created = 0;

  for (const action of actions) {
    const productAName = jsonString(action.payload, "productAName");
    const productBName = jsonString(action.payload, "productBName");
    if (!productAName || !productBName) continue;

    const key = `pairing_${action.id}`.slice(0, 64);
    const existing = await prisma.revenueExperiment.findUnique({
      where: { key },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.revenueExperiment.create({
      data: {
        key,
        actionId: action.id,
        surface: "CONCIERGE",
        primaryMetric: "paid_conversion_rate",
        treatmentPct: 50,
        minAssignmentsPerArm: 30,
      },
    });
    created += 1;
  }

  return { eligibleActions: actions.length, created };
}

export async function getRevenueExperimentCenter() {
  const experiments = await prisma.revenueExperiment.findMany({
    orderBy: [
      { status: "asc" },
      { startedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 40,
    select: {
      id: true,
      key: true,
      status: true,
      surface: true,
      primaryMetric: true,
      treatmentPct: true,
      minAssignmentsPerArm: true,
      startedAt: true,
      endedAt: true,
      measuredAt: true,
      result: true,
      createdAt: true,
      startedBy: { select: { nombre: true } },
      endedBy: { select: { nombre: true } },
      action: {
        select: {
          id: true,
          title: true,
          rationale: true,
          priorityScore: true,
          payload: true,
        },
      },
      assignments: {
        select: {
          arm: true,
          eligibleAt: true,
          exposedAt: true,
        },
      },
    },
  });

  return {
    experiments,
    summary: {
      drafts: experiments.filter((item) => item.status === "DRAFT").length,
      running: experiments.filter((item) => item.status === "RUNNING").length,
      paused: experiments.filter((item) => item.status === "PAUSED").length,
      completed: experiments.filter((item) => item.status === "COMPLETED").length,
    },
  };
}

export async function startRevenueExperiment(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const experiment = await tx.revenueExperiment.findUnique({
      where: { id },
    });

    if (!experiment || !["DRAFT", "PAUSED"].includes(experiment.status)) {
      throw new Error("EXPERIMENT_NOT_STARTABLE");
    }

    const conflict = await tx.revenueExperiment.findFirst({
      where: {
        surface: experiment.surface,
        status: "RUNNING",
        NOT: { id },
      },
      select: { id: true },
    });

    if (conflict) throw new Error("EXPERIMENT_ALREADY_RUNNING");

    return tx.revenueExperiment.update({
      where: { id },
      data: {
        status: "RUNNING",
        startedAt: experiment.startedAt ?? new Date(),
        startedById: experiment.startedById ?? userId,
        endedAt: null,
        endedById: null,
      },
    });
  });
}

export async function pauseRevenueExperiment(id: string) {
  const result = await prisma.revenueExperiment.updateMany({
    where: { id, status: "RUNNING" },
    data: { status: "PAUSED" },
  });

  if (result.count !== 1) throw new Error("EXPERIMENT_NOT_RUNNING");

  return prisma.revenueExperiment.findUniqueOrThrow({ where: { id } });
}

export async function completeRevenueExperiment(id: string, userId: string) {
  await measureRevenueExperiment(id);

  const result = await prisma.revenueExperiment.updateMany({
    where: { id, status: { in: ["RUNNING", "PAUSED"] } },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      endedById: userId,
    },
  });

  if (result.count !== 1) throw new Error("EXPERIMENT_NOT_COMPLETABLE");

  return prisma.revenueExperiment.findUniqueOrThrow({ where: { id } });
}

export async function measureRevenueExperiment(id: string) {
  const experiment = await prisma.revenueExperiment.findUnique({
    where: { id },
    include: {
      assignments: {
        select: {
          sessionId: true,
          arm: true,
          assignedAt: true,
          eligibleAt: true,
          exposedAt: true,
        },
      },
      action: {
        select: { payload: true },
      },
    },
  });

  if (!experiment) throw new Error("EXPERIMENT_NOT_FOUND");

  const sessionIds = [...new Set(experiment.assignments.map((item) => item.sessionId))];
  const assignmentBySession = new Map(
    experiment.assignments.map((item) => [item.sessionId, item]),
  );

  const productAId = jsonString(experiment.action.payload, "productAId");
  const productBId = jsonString(experiment.action.payload, "productBId");

  const attributions = sessionIds.length
    ? await prisma.revenueAttribution.findMany({
        where: {
          sessionId: { in: sessionIds },
          pedido: {
            createdAt: {
              gte: experiment.startedAt ?? experiment.createdAt,
              ...(experiment.endedAt ? { lte: experiment.endedAt } : {}),
            },
            pago: { is: { estado: "APROBADO" } },
          },
        },
        select: {
          sessionId: true,
          pedido: {
            select: {
              createdAt: true,
              total: true,
              items: {
                select: { productoId: true },
              },
            },
          },
        },
      })
    : [];

  const paidOrders = attributions
    .filter((item) => {
      const assignment = assignmentBySession.get(item.sessionId);
      return assignment && item.pedido.createdAt >= assignment.assignedAt;
    })
    .map((item) => {
      const productIds = new Set(item.pedido.items.map((entry) => entry.productoId));
      return {
        sessionId: item.sessionId,
        total: Number(item.pedido.total),
        containsTargetPair: Boolean(
          productAId &&
            productBId &&
            productIds.has(productAId) &&
            productIds.has(productBId),
        ),
      };
    });

  const result = calculateExperimentResult({
    assignments: experiment.assignments
      .filter(
        (assignment): assignment is typeof assignment & {
          arm: ExperimentArm;
        } =>
          assignment.arm === "CONTROL" ||
          assignment.arm === "TREATMENT",
      )
      .map((assignment) => ({
        sessionId: assignment.sessionId,
        arm: assignment.arm,
      })),
    paidOrders,
    minAssignmentsPerArm: experiment.minAssignmentsPerArm,
  });

  const eligibleControl = experiment.assignments.filter(
    (item) => item.arm === "CONTROL" && item.eligibleAt,
  ).length;
  const eligibleTreatment = experiment.assignments.filter(
    (item) => item.arm === "TREATMENT" && item.eligibleAt,
  ).length;
  const exposedTreatment = experiment.assignments.filter(
    (item) => item.arm === "TREATMENT" && item.exposedAt,
  ).length;

  const storedResult = {
    ...result,
    design: "deterministic_session_randomization_intention_to_treat",
    confidenceMethod: "normal_approximation_95pct_ci",
    eligibleControl,
    eligibleTreatment,
    exposedTreatment,
    caveat:
      "Randomized session assignment supports causal interpretation only when instrumentation, exposure integrity and interference assumptions hold. AOV remains secondary and descriptive.",
  };

  await prisma.revenueExperiment.update({
    where: { id },
    data: {
      measuredAt: new Date(),
      result: storedResult as Prisma.InputJsonValue,
    },
  });

  return storedResult;
}

export async function measureRunningRevenueExperiments() {
  const experiments = await prisma.revenueExperiment.findMany({
    where: { status: { in: ["RUNNING", "PAUSED", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true },
  });

  const results = [];
  for (const experiment of experiments) {
    results.push({
      id: experiment.id,
      result: await measureRevenueExperiment(experiment.id),
    });
  }

  return { measured: results.length, results };
}

export type ConciergeExperimentContext = {
  instructions: string;
  experiment: null | {
    id: string;
    key: string;
    arm: ExperimentArm;
    eligible: boolean;
    exposed: boolean;
    nextBestAction: null | {
      type: "PAIRING";
      productAName: string;
      productBName: string;
    };
  };
};

export async function getConciergeExperimentContext(params: {
  behaviorSessionId: unknown;
  latestUserMessage: string;
}): Promise<ConciergeExperimentContext> {
  if (
    typeof params.behaviorSessionId !== "string" ||
    !SESSION_PATTERN.test(params.behaviorSessionId)
  ) {
    return {
      instructions:
        "No hay una sesión first-party válida para experimentación en este turno.",
      experiment: null,
    };
  }

  const experiment = await prisma.revenueExperiment.findFirst({
    where: {
      status: "RUNNING",
      surface: "CONCIERGE",
      action: {
        is: {
          status: "EXECUTED",
          type: "CONCIERGE_PAIRING",
        },
      },
    },
    orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      key: true,
      treatmentPct: true,
      action: {
        select: {
          payload: true,
          evidence: true,
        },
      },
    },
  });

  if (!experiment) {
    return {
      instructions: "No hay un experimento Concierge activo.",
      experiment: null,
    };
  }

  const calculatedArm = assignExperimentArm(
    experiment.key,
    params.behaviorSessionId,
    experiment.treatmentPct,
  );

  const assignment = await prisma.revenueExperimentAssignment.upsert({
    where: {
      experimentId_sessionId: {
        experimentId: experiment.id,
        sessionId: params.behaviorSessionId,
      },
    },
    update: { lastSeenAt: new Date() },
    create: {
      experimentId: experiment.id,
      sessionId: params.behaviorSessionId,
      arm: calculatedArm,
    },
  });

  const productAName = jsonString(experiment.action.payload, "productAName");
  const productBName = jsonString(experiment.action.payload, "productBName");

  if (!productAName || !productBName) {
    return {
      instructions:
        "El experimento activo no tiene un payload comercial válido; no apliques tratamiento.",
      experiment: {
        id: experiment.id,
        key: experiment.key,
        arm: assignment.arm as ExperimentArm,
        eligible: false,
        exposed: false,
        nextBestAction: null,
      },
    };
  }

  const eligible = isPairingRelevant(
    params.latestUserMessage,
    productAName,
    productBName,
  );

  if (eligible) {
    await prisma.revenueExperimentAssignment.update({
      where: { id: assignment.id },
      data: {
        eligibleAt: assignment.eligibleAt ?? new Date(),
        eligibilityCount: { increment: 1 },
        ...(assignment.arm === "TREATMENT"
          ? {
              exposedAt: assignment.exposedAt ?? new Date(),
              exposureCount: { increment: 1 },
            }
          : {}),
      },
    });
  }

  if (assignment.arm === "CONTROL") {
    return {
      instructions: eligible
        ? [
            "EXPERIMENTO CONTROL ACTIVO.",
            `La sesión es elegible para la hipótesis de afinidad ${productAName} + ${productBName}, pero pertenece al grupo CONTROL.`,
            "No introduzcas esa combinación por la regla experimental. Responde con el comportamiento normal del Concierge y con otros datos aprobados.",
          ].join("\n")
        : "EXPERIMENTO CONTROL ACTIVO. Mantén el comportamiento normal; la regla experimental no es relevante en este turno.",
      experiment: {
        id: experiment.id,
        key: experiment.key,
        arm: "CONTROL",
        eligible,
        exposed: false,
        nextBestAction: null,
      },
    };
  }

  if (!eligible) {
    return {
      instructions:
        "EXPERIMENTO TREATMENT ACTIVO, pero la regla experimental no es relevante para la intención de este turno. No la fuerces.",
      experiment: {
        id: experiment.id,
        key: experiment.key,
        arm: "TREATMENT",
        eligible: false,
        exposed: false,
        nextBestAction: null,
      },
    };
  }

  return {
    instructions: [
      "NEXT BEST ACTION EXPERIMENTAL AUTORIZADA.",
      `Puedes sugerir de forma natural ${productAName} + ${productBName} porque la afinidad fue observada en pedidos pagados y la acción fue previamente aprobada por administración.`,
      "La sugerencia debe ser contextual, opcional y breve. No inventes descuento, disponibilidad, urgencia ni causalidad.",
    ].join("\n"),
    experiment: {
      id: experiment.id,
      key: experiment.key,
      arm: "TREATMENT",
      eligible: true,
      exposed: true,
      nextBestAction: {
        type: "PAIRING",
        productAName,
        productBName,
      },
    },
  };
}
