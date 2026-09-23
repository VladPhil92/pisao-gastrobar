import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  assignRevenuePolicyArm,
  calculateRevenuePolicyHealth,
  selectAdaptivePairingCandidate,
  type RevenuePolicyArm,
} from "@/lib/revenue/revenue-policy-core";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";
import {
  calculateOrderContribution,
  calculatePairEconomics,
} from "@/lib/revenue/profit-core";

const SESSION_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const GUARDRAIL_INTERVAL_MS = 15 * 60 * 1000;
const MAX_ACTIVE_POLICIES = 3;

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function jsonString(value: Prisma.JsonValue | null | undefined, key: string) {
  const item = jsonObject(value)[key];
  return typeof item === "string" ? item : null;
}

function jsonNumber(value: Prisma.JsonValue | null | undefined, key: string) {
  const item = jsonObject(value)[key];
  return typeof item === "number" && Number.isFinite(item) ? item : null;
}

function jsonBoolean(value: Prisma.JsonValue | null | undefined, key: string) {
  const item = jsonObject(value)[key];
  return typeof item === "boolean" ? item : null;
}

export async function syncAdaptiveRevenuePolicies() {
  const experiments = await prisma.revenueExperiment.findMany({
    where: {
      status: "COMPLETED",
      action: {
        is: {
          status: "EXECUTED",
          type: "CONCIERGE_PAIRING",
        },
      },
    },
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      result: true,
      action: {
        select: {
          id: true,
          priorityScore: true,
          payload: true,
        },
      },
      policies: {
        select: { id: true },
        take: 1,
      },
    },
  });

  let created = 0;
  let eligible = 0;

  for (const experiment of experiments) {
    if (
      jsonBoolean(experiment.result, "sampleReady") !== true ||
      jsonString(experiment.result, "interpretation") !==
        "TREATMENT_OBSERVED_HIGHER"
    ) {
      continue;
    }

    const productAName = jsonString(experiment.action.payload, "productAName");
    const productBName = jsonString(experiment.action.payload, "productBName");
    if (!productAName || !productBName) continue;

    eligible += 1;
    if (experiment.policies.length) continue;

    await prisma.revenuePolicy.create({
      data: {
        key: `adaptive_${experiment.id}`.slice(0, 64),
        actionId: experiment.action.id,
        experimentId: experiment.id,
        priorityScore: experiment.action.priorityScore,
        trafficPct: 90,
        minServeAssignments: 40,
        minHoldoutAssignments: 20,
        rollbackMarginPctPoints: 2,
      },
    });
    created += 1;
  }

  return { eligibleExperiments: eligible, created };
}

export async function getAdaptiveRevenuePolicyCenter() {
  const policies = await prisma.revenuePolicy.findMany({
    orderBy: [
      { status: "asc" },
      { priorityScore: "desc" },
      { createdAt: "desc" },
    ],
    take: 50,
    select: {
      id: true,
      key: true,
      engineVersion: true,
      status: true,
      surface: true,
      trafficPct: true,
      priorityScore: true,
      minServeAssignments: true,
      minHoldoutAssignments: true,
      rollbackMarginPctPoints: true,
      activatedAt: true,
      pausedAt: true,
      rolledBackAt: true,
      rollbackReason: true,
      lastMeasuredAt: true,
      lastGuardrailCheckAt: true,
      outcome: true,
      createdAt: true,
      activatedBy: { select: { nombre: true } },
      rolledBackBy: { select: { nombre: true } },
      action: {
        select: {
          id: true,
          title: true,
          rationale: true,
          recommendedAction: true,
          payload: true,
        },
      },
      experiment: {
        select: {
          id: true,
          result: true,
          endedAt: true,
        },
      },
      assignments: {
        select: {
          arm: true,
          servedAt: true,
        },
      },
    },
  });

  return {
    policies,
    summary: {
      drafts: policies.filter((item) => item.status === "DRAFT").length,
      active: policies.filter((item) => item.status === "ACTIVE").length,
      paused: policies.filter((item) => item.status === "PAUSED").length,
      rolledBack: policies.filter((item) => item.status === "ROLLED_BACK").length,
    },
  };
}

export async function activateAdaptiveRevenuePolicy(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const policy = await tx.revenuePolicy.findUnique({
      where: { id },
      include: { action: { select: { payload: true } } },
    });
    if (!policy || !["DRAFT", "PAUSED"].includes(policy.status)) {
      throw new Error("POLICY_NOT_ACTIVATABLE");
    }

    const productAId = jsonString(policy.action.payload, "productAId");
    const productBId = jsonString(policy.action.payload, "productBId");
    if (!productAId || !productBId) {
      throw new Error("POLICY_INVALID_PRODUCTS");
    }

    const products = await tx.producto.findMany({
      where: { id: { in: [productAId, productBId] } },
      select: {
        id: true,
        disponible: true,
        inventarioBajo: true,
      },
    });
    if (
      products.length !== 2 ||
      products.some((product) => !product.disponible || product.inventarioBajo)
    ) {
      throw new Error("POLICY_PRODUCT_UNAVAILABLE_OR_LOW");
    }

    const activeCount = await tx.revenuePolicy.count({
      where: { status: "ACTIVE" },
    });
    if (activeCount >= MAX_ACTIVE_POLICIES) {
      throw new Error("POLICY_ACTIVE_LIMIT");
    }

    return tx.revenuePolicy.update({
      where: { id },
      data: {
        status: "ACTIVE",
        activatedAt: policy.activatedAt ?? new Date(),
        activatedById: policy.activatedById ?? userId,
        pausedAt: null,
        rollbackReason: null,
      },
    });
  });
}

export async function pauseAdaptiveRevenuePolicy(id: string) {
  const result = await prisma.revenuePolicy.updateMany({
    where: { id, status: "ACTIVE" },
    data: {
      status: "PAUSED",
      pausedAt: new Date(),
    },
  });

  if (result.count !== 1) throw new Error("POLICY_NOT_ACTIVE");
  return prisma.revenuePolicy.findUniqueOrThrow({ where: { id } });
}

export async function rollbackAdaptiveRevenuePolicy(
  id: string,
  userId: string,
  reason = "manual_admin_rollback",
) {
  const result = await prisma.revenuePolicy.updateMany({
    where: { id, status: { in: ["ACTIVE", "PAUSED"] } },
    data: {
      status: "ROLLED_BACK",
      rolledBackAt: new Date(),
      rolledBackById: userId,
      rollbackReason: reason.slice(0, 180),
    },
  });

  if (result.count !== 1) throw new Error("POLICY_NOT_ROLLBACKABLE");
  return prisma.revenuePolicy.findUniqueOrThrow({ where: { id } });
}

export async function measureAdaptiveRevenuePolicy(id: string) {
  const policy = await prisma.revenuePolicy.findUnique({
    where: { id },
    include: {
      assignments: {
        select: {
          sessionId: true,
          arm: true,
          assignedAt: true,
          servedAt: true,
        },
      },
      action: { select: { payload: true } },
    },
  });

  if (!policy) throw new Error("POLICY_NOT_FOUND");

  const sessionIds = [...new Set(policy.assignments.map((item) => item.sessionId))];
  const assignmentBySession = new Map(
    policy.assignments.map((item) => [item.sessionId, item]),
  );
  const productAId = jsonString(policy.action.payload, "productAId");
  const productBId = jsonString(policy.action.payload, "productBId");

  const attributions = sessionIds.length
    ? await prisma.revenueAttribution.findMany({
        where: {
          sessionId: { in: sessionIds },
          pedido: {
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
                select: {
                  productoId: true,
                  cantidad: true,
                  subtotal: true,
                  costoUnitarioSnapshot: true,
                },
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
      const economics = calculateOrderContribution(
        item.pedido.items.map((entry) => ({
          subtotal: Number(entry.subtotal),
          quantity: entry.cantidad,
          unitCostSnapshot:
            entry.costoUnitarioSnapshot === null
              ? null
              : Number(entry.costoUnitarioSnapshot),
        })),
      );

      return {
        sessionId: item.sessionId,
        total: Number(item.pedido.total),
        contribution: economics.contribution,
        containsTargetPair: Boolean(
          productAId &&
            productBId &&
            productIds.has(productAId) &&
            productIds.has(productBId),
        ),
      };
    });

  const result = calculateRevenuePolicyHealth({
    assignments: policy.assignments
      .filter(
        (assignment): assignment is typeof assignment & {
          arm: RevenuePolicyArm;
        } => assignment.arm === "SERVE" || assignment.arm === "HOLDOUT",
      )
      .map((assignment) => ({
        sessionId: assignment.sessionId,
        arm: assignment.arm,
      })),
    paidOrders,
    minServeAssignments: policy.minServeAssignments,
    minHoldoutAssignments: policy.minHoldoutAssignments,
    rollbackMarginPctPoints: policy.rollbackMarginPctPoints,
  });

  const storedOutcome = {
    ...result,
    design: "eligible_session_stable_holdout_monitoring",
    confidenceMethod: "normal_approximation_95pct_ci",
    servedExposures: policy.assignments.filter(
      (assignment) => assignment.arm === "SERVE" && assignment.servedAt,
    ).length,
    caveat:
      "Continuous holdout monitoring is a production safety signal. Adaptive selection and changing traffic composition can limit causal interpretation relative to the original controlled experiment.",
  };

  const now = new Date();
  await prisma.revenuePolicy.update({
    where: { id },
    data: {
      lastMeasuredAt: now,
      lastGuardrailCheckAt: now,
      outcome: storedOutcome as Prisma.InputJsonValue,
    },
  });

  let autoRolledBack = false;
  if (policy.status === "ACTIVE" && result.guardrail === "AUTO_ROLLBACK") {
    const rollback = await prisma.revenuePolicy.updateMany({
      where: { id, status: "ACTIVE" },
      data: {
        status: "ROLLED_BACK",
        rolledBackAt: now,
        rollbackReason:
          "auto_guardrail_conversion_harm_beyond_95pct_ci_margin",
      },
    });
    autoRolledBack = rollback.count === 1;

    if (autoRolledBack) {
      void emitKevGovernanceEvent("pisao.revenue.policy_auto_rolled_back", {
        source: "profit_aware_revenue_v5",
        policy_ref: policy.key,
        guardrail: result.guardrail,
        conversion_lift_pp: result.observedConversionLiftPctPoints,
        ci_low_pp: result.conversionDifference95CiPctPoints?.[0] ?? null,
        ci_high_pp: result.conversionDifference95CiPctPoints?.[1] ?? null,
      });
    }
  }

  return { result: storedOutcome, autoRolledBack };
}

export async function measureActiveRevenuePolicies() {
  const policies = await prisma.revenuePolicy.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true },
  });

  const results = [];
  for (const policy of policies) {
    results.push({
      id: policy.id,
      ...(await measureAdaptiveRevenuePolicy(policy.id)),
    });
  }

  return { measured: results.length, results };
}

async function evaluateGuardrailIfDue(policy: {
  id: string;
  lastGuardrailCheckAt: Date | null;
}) {
  const cutoff = new Date(Date.now() - GUARDRAIL_INTERVAL_MS);
  if (policy.lastGuardrailCheckAt && policy.lastGuardrailCheckAt > cutoff) {
    return { checked: false, autoRolledBack: false };
  }

  const claim = await prisma.revenuePolicy.updateMany({
    where: {
      id: policy.id,
      status: "ACTIVE",
      OR: [
        { lastGuardrailCheckAt: null },
        { lastGuardrailCheckAt: { lte: cutoff } },
      ],
    },
    data: { lastGuardrailCheckAt: new Date() },
  });

  if (claim.count !== 1) {
    return { checked: false, autoRolledBack: false };
  }

  const measured = await measureAdaptiveRevenuePolicy(policy.id);
  return { checked: true, autoRolledBack: measured.autoRolledBack };
}

export type AdaptiveRevenueContext = {
  instructions: string;
  policy: null | {
    id: string;
    key: string;
    arm: RevenuePolicyArm;
    served: boolean;
    productAName: string;
    productBName: string;
    costCoverage: "COMPLETE" | "PARTIAL";
    contributionMarginPct: number | null;
  };
};

export async function getAdaptiveRevenueContext(params: {
  behaviorSessionId: unknown;
  latestUserMessage: string;
  suppress?: boolean;
}): Promise<AdaptiveRevenueContext> {
  if (params.suppress) {
    return {
      instructions:
        "La capa adaptativa se suprime en este turno para evitar solapamiento con un experimento controlado elegible.",
      policy: null,
    };
  }

  if (
    typeof params.behaviorSessionId !== "string" ||
    !SESSION_PATTERN.test(params.behaviorSessionId)
  ) {
    return {
      instructions:
        "No hay sesión first-party válida para la política adaptativa.",
      policy: null,
    };
  }

  const policies = await prisma.revenuePolicy.findMany({
    where: {
      status: "ACTIVE",
      surface: "CONCIERGE",
      action: {
        is: {
          status: "EXECUTED",
          type: "CONCIERGE_PAIRING",
        },
      },
    },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "asc" }],
    take: MAX_ACTIVE_POLICIES,
    select: {
      id: true,
      key: true,
      trafficPct: true,
      priorityScore: true,
      lastGuardrailCheckAt: true,
      action: { select: { payload: true } },
      experiment: { select: { result: true } },
    },
  });

  const productIds = [
    ...new Set(
      policies.flatMap((policy) =>
        [
          jsonString(policy.action.payload, "productAId"),
          jsonString(policy.action.payload, "productBId"),
        ].filter((value): value is string => Boolean(value)),
      ),
    ),
  ];

  const products = productIds.length
    ? await prisma.producto.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          precio: true,
          costoUnitario: true,
          disponible: true,
          inventarioBajo: true,
        },
      })
    : [];
  const productById = new Map(products.map((product) => [product.id, product]));

  const candidates = policies
    .map((policy) => {
      const productAId = jsonString(policy.action.payload, "productAId");
      const productBId = jsonString(policy.action.payload, "productBId");
      const productAName = jsonString(policy.action.payload, "productAName");
      const productBName = jsonString(policy.action.payload, "productBName");
      if (!productAId || !productBId || !productAName || !productBName) {
        return null;
      }

      const productA = productById.get(productAId);
      const productB = productById.get(productBId);
      if (!productA || !productB) return null;

      const economics = calculatePairEconomics(
        {
          price: Number(productA.precio),
          cost:
            productA.costoUnitario === null
              ? null
              : Number(productA.costoUnitario),
          available: productA.disponible,
          lowInventory: productA.inventarioBajo,
        },
        {
          price: Number(productB.precio),
          cost:
            productB.costoUnitario === null
              ? null
              : Number(productB.costoUnitario),
          available: productB.disponible,
          lowInventory: productB.inventarioBajo,
        },
      );

      if (!economics.promotable) return null;

      return {
        id: policy.id,
        priorityScore: policy.priorityScore,
        observedLiftPctPoints:
          jsonNumber(
            policy.experiment.result,
            "observedConversionLiftPctPoints",
          ) ?? 0,
        productAName,
        productBName,
        profitabilityAdjustment: economics.profitabilityAdjustment,
        contributionMarginPct: economics.contributionMarginPct,
        costCoverage: economics.costCoverage,
        policy,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        priorityScore: number;
        observedLiftPctPoints: number;
        productAName: string;
        productBName: string;
        profitabilityAdjustment: number;
        contributionMarginPct: number | null;
        costCoverage: "COMPLETE" | "PARTIAL";
        policy: (typeof policies)[number];
      } => Boolean(item),
    );

  const selected = selectAdaptivePairingCandidate(
    params.latestUserMessage,
    candidates.map(
      ({
        policy: _policy,
        contributionMarginPct: _margin,
        costCoverage: _coverage,
        ...candidate
      }) => candidate,
    ),
  );

  if (!selected) {
    return {
      instructions:
        "No hay una política adaptativa relevante para la intención de este turno.",
      policy: null,
    };
  }

  const selectedPolicy = candidates.find(
    (candidate) => candidate.id === selected.candidate.id,
  );
  if (!selectedPolicy) {
    return { instructions: "Sin política adaptativa aplicable.", policy: null };
  }

  const guardrail = await evaluateGuardrailIfDue(selectedPolicy.policy);
  if (guardrail.autoRolledBack) {
    return {
      instructions:
        "La política candidata fue retirada automáticamente por guardrail de conversión. No la apliques.",
      policy: null,
    };
  }

  const stillActive = await prisma.revenuePolicy.findUnique({
    where: { id: selectedPolicy.id },
    select: { status: true },
  });
  if (stillActive?.status !== "ACTIVE") {
    return {
      instructions:
        "La política candidata ya no está activa. Mantén el comportamiento normal.",
      policy: null,
    };
  }

  const calculatedArm = assignRevenuePolicyArm(
    selectedPolicy.policy.key,
    params.behaviorSessionId,
    selectedPolicy.policy.trafficPct,
  );

  const assignment = await prisma.revenuePolicyAssignment.upsert({
    where: {
      policyId_sessionId: {
        policyId: selectedPolicy.id,
        sessionId: params.behaviorSessionId,
      },
    },
    update: { lastSeenAt: new Date() },
    create: {
      policyId: selectedPolicy.id,
      sessionId: params.behaviorSessionId,
      arm: calculatedArm,
    },
  });

  if (assignment.arm === "HOLDOUT") {
    return {
      instructions: [
        "ADAPTIVE HOLDOUT ACTIVO.",
        `La intención es compatible con ${selectedPolicy.productAName} + ${selectedPolicy.productBName}, pero esta sesión pertenece al holdout de seguridad.`,
        "No introduzcas esa combinación por la política adaptativa. Usa el comportamiento normal del Concierge.",
      ].join("\n"),
      policy: {
        id: selectedPolicy.id,
        key: selectedPolicy.policy.key,
        arm: "HOLDOUT",
        served: false,
        productAName: selectedPolicy.productAName,
        productBName: selectedPolicy.productBName,
        costCoverage: selectedPolicy.costCoverage,
        contributionMarginPct: selectedPolicy.contributionMarginPct,
      },
    };
  }

  await prisma.revenuePolicyAssignment.update({
    where: { id: assignment.id },
    data: {
      servedAt: assignment.servedAt ?? new Date(),
      exposureCount: { increment: 1 },
    },
  });

  return {
    instructions: [
      "NEXT BEST ACTION ADAPTATIVA AUTORIZADA.",
      `Puedes sugerir de forma natural ${selectedPolicy.productAName} + ${selectedPolicy.productBName}. Esta política proviene de un experimento controlado previamente concluido con señal favorable y conserva holdout de seguridad en producción.`,
      "La sugerencia debe ser contextual, opcional y breve. No inventes descuento, disponibilidad, urgencia ni causalidad.",
    ].join("\n"),
    policy: {
      id: selectedPolicy.id,
      key: selectedPolicy.policy.key,
      arm: "SERVE",
      served: true,
      productAName: selectedPolicy.productAName,
      productBName: selectedPolicy.productBName,
      costCoverage: selectedPolicy.costCoverage,
      contributionMarginPct: selectedPolicy.contributionMarginPct,
    },
  };
}
