import { createHash } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { recordIntegrationEvidence } from "@/lib/integrations/production-certification";
import {
  kevInboundEnabled,
  verifyKevInboundRequest,
} from "@/lib/governance/kev-inbound-security";

export const runtime = "nodejs";

const advisorySchema = z.object({
  idempotency_key: z.string().min(8).max(128),
  title: z.string().min(8).max(180),
  rationale: z.string().min(12).max(2000),
  recommended_action: z.string().min(8).max(2000),
  objective_metric: z.string().min(2).max(96),
  priority_score: z.number().int().min(1).max(100).default(50),
  risk_level: z.enum(["LOW", "MEDIUM"]).default("MEDIUM"),
  evidence: z
    .record(
      z.string().min(1).max(64),
      z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
    )
    .default({}),
});

export async function POST(request: Request) {
  if (!kevInboundEnabled()) {
    return Response.json(
      { error: "Kev advisory ingress is disabled." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const verified = verifyKevInboundRequest({
    rawBody,
    timestampHeader: request.headers.get("x-kev-timestamp"),
    signatureHeader: request.headers.get("x-kev-signature"),
  });

  if (!verified) {
    return Response.json({ error: "Invalid Kev signature." }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = advisorySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid advisory payload." },
      { status: 422 },
    );
  }

  const advisory = parsed.data;
  if (JSON.stringify(advisory.evidence).length > 5000) {
    return Response.json(
      { error: "Advisory evidence is too large." },
      { status: 413 },
    );
  }

  const fingerprint = createHash("sha256")
    .update("kev-advisory:" + advisory.idempotency_key)
    .digest("hex");

  const action = await prisma.revenueAction.upsert({
    where: { fingerprint },
    update: {},
    create: {
      fingerprint,
      engineVersion: "kev_governance_v1",
      type: "KEV_ADVISORY",
      status: "PENDING",
      riskLevel: advisory.risk_level,
      executionMode: "MANUAL",
      priorityScore: advisory.priority_score,
      title: advisory.title,
      rationale: advisory.rationale,
      recommendedAction: advisory.recommended_action,
      objectiveMetric: advisory.objective_metric,
      evidence: {
        ...advisory.evidence,
        source: "KEV",
      },
      payload: {
        source: "KEV",
        ingressVersion: "kev_advisory_v1",
      },
    },
    select: {
      id: true,
      status: true,
      type: true,
      priorityScore: true,
      createdAt: true,
    },
  });

  void recordIntegrationEvidence({
    integration: "KEV",
    event: "advisory_ingress",
    status: "SUCCESS",
    detail: {
      actionId: action.id,
      priorityScore: action.priorityScore,
    },
  });

  return Response.json(
    {
      accepted: true,
      action,
      approvalRequired: true,
    },
    { status: 202 },
  );
}
