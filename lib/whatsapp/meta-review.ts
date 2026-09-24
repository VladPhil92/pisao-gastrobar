import "server-only";

import { prisma } from "@/lib/prisma";
import { getWhatsAppIntegrationSummary } from "@/lib/whatsapp/integration-store";
import {
  getEmbeddedSignupConfigId,
  getMetaReviewLifecycle,
  getWhatsAppRuntimeState,
} from "@/lib/whatsapp/meta-config";
import {
  getMetaReviewEvidenceLedger,
  latestMetaReviewEvidenceByEvent,
  META_REVIEW_EVENTS,
} from "@/lib/whatsapp/meta-review-evidence";

export type MetaReviewPermission = {
  id:
    | "business_management"
    | "manage_app_solution"
    | "whatsapp_business_management"
    | "whatsapp_business_messaging";
  label: string;
  purpose: string;
  evidence: string[];
  state: "WAITING_EXTERNAL" | "READY_TO_RECORD" | "EVIDENCE_AVAILABLE";
};

const evidenceLabels: Record<string, string> = {
  [META_REVIEW_EVENTS.embeddedSignupCompleted]:
    "Embedded Signup completado",
  [META_REVIEW_EVENTS.wabaProbeVerified]:
    "WABA validada contra Meta Graph",
  [META_REVIEW_EVENTS.inboundProcessed]:
    "Webhook inbound procesado",
  [META_REVIEW_EVENTS.aiOutboundSent]:
    "Respuesta IA aceptada por Cloud API",
  [META_REVIEW_EVENTS.reviewSnapshot]:
    "Snapshot de App Review",
};

function ageHours(iso: string) {
  return Math.max(
    0,
    Math.round(((Date.now() - new Date(iso).getTime()) / 3_600_000) * 10) / 10,
  );
}

export async function getMetaAppReviewReadiness() {
  const [
    lifecycle,
    configId,
    runtime,
    integration,
    lastInbound,
    lastAiReply,
    latestEvidence,
    ledger,
  ] = await Promise.all([
    getMetaReviewLifecycle(),
    getEmbeddedSignupConfigId(),
    getWhatsAppRuntimeState(),
    getWhatsAppIntegrationSummary(),
    prisma.whatsAppWebhookEvent.findFirst({
      where: { field: "messages", processedAt: { not: null } },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, processedAt: true },
    }),
    prisma.whatsAppConversation.findFirst({
      where: { lastAiMessageAt: { not: null } },
      orderBy: { lastAiMessageAt: "desc" },
      select: { lastAiMessageAt: true },
    }),
    latestMetaReviewEvidenceByEvent(),
    getMetaReviewEvidenceLedger(),
  ]);

  const accessVerified =
    lifecycle.accessVerificationStatus === "VERIFIED";
  const configReady = Boolean(configId);
  const integrationActive = integration?.status === "ACTIVE";
  const probeReady = runtime.lastProbeStatus === "SUCCESS";

  const embeddedEvidence = Boolean(
    latestEvidence[META_REVIEW_EVENTS.embeddedSignupCompleted],
  );
  const probeEvidence = Boolean(
    latestEvidence[META_REVIEW_EVENTS.wabaProbeVerified],
  );
  const inboundEvidence = Boolean(
    latestEvidence[META_REVIEW_EVENTS.inboundProcessed],
  );
  const outboundEvidence = Boolean(
    latestEvidence[META_REVIEW_EVENTS.aiOutboundSent],
  );

  const automatedManagementEvidence =
    embeddedEvidence && probeEvidence;
  const automatedMessagingEvidence =
    inboundEvidence && outboundEvidence;

  const legacyMessagingSignal = Boolean(
    lastInbound?.processedAt && lastAiReply?.lastAiMessageAt,
  );
  const liveMessagingEvidence =
    automatedMessagingEvidence || legacyMessagingSignal;

  const permissions: MetaReviewPermission[] = [
    {
      id: "business_management",
      label: "Business Management",
      purpose:
        "Permite seleccionar y autorizar el Business Portfolio usado por la integración.",
      evidence: [
        "Mostrar el Business Portfolio autorizado.",
        "Mostrar la pantalla de autorización dentro del flujo de Meta.",
      ],
      state: accessVerified ? "READY_TO_RECORD" : "WAITING_EXTERNAL",
    },
    {
      id: "manage_app_solution",
      label: "Manage App Solution",
      purpose:
        "Permite administrar la solución tecnológica asociada al negocio y la app.",
      evidence: [
        "Mostrar PISÁO Concierge como aplicación asignada.",
        "Mostrar el uso de la app para administrar la solución.",
      ],
      state: accessVerified ? "READY_TO_RECORD" : "WAITING_EXTERNAL",
    },
    {
      id: "whatsapp_business_management",
      label: "WhatsApp Business Management",
      purpose:
        "Permite vincular y administrar la WABA y sus activos mediante Embedded Signup.",
      evidence: [
        "Mostrar la WABA seleccionada.",
        "Mostrar WABA ID y Phone Number ID guardados tras Embedded Signup.",
        "Mostrar conexión ACTIVE y probe exitoso en PISÁO.",
      ],
      state: automatedManagementEvidence
        ? "EVIDENCE_AVAILABLE"
        : accessVerified
          ? "READY_TO_RECORD"
          : "WAITING_EXTERNAL",
    },
    {
      id: "whatsapp_business_messaging",
      label: "WhatsApp Business Messaging",
      purpose:
        "Permite recibir mensajes del cliente y responder desde PISÁO Concierge.",
      evidence: [
        "Mostrar mensaje entrante real.",
        "Mostrar webhook procesado.",
        "Mostrar respuesta del Concierge recibida en WhatsApp.",
      ],
      state: automatedMessagingEvidence
        ? "EVIDENCE_AVAILABLE"
        : integrationActive && probeReady
          ? "READY_TO_RECORD"
          : "WAITING_EXTERNAL",
    },
  ];

  const checklist = [
    {
      id: "access-verification",
      label: "Access Verification",
      ok: accessVerified,
      detail: lifecycle.accessVerificationStatus,
    },
    {
      id: "embedded-signup-config",
      label: "Embedded Signup Configuration ID",
      ok: configReady,
      detail: configReady ? "CONFIGURADO" : "PENDIENTE",
    },
    {
      id: "waba-integration",
      label: "WABA / Phone Number ID guardados",
      ok: integrationActive,
      detail: integrationActive ? "ACTIVE" : integration?.status ?? "PENDIENTE",
    },
    {
      id: "meta-probe",
      label: "Conexión validada contra Meta",
      ok: probeReady,
      detail: runtime.lastProbeStatus ?? "SIN EJECUTAR",
    },
    {
      id: "management-evidence",
      label: "Evidencia automática de WABA",
      ok: automatedManagementEvidence,
      detail: automatedManagementEvidence
        ? "EMBEDDED SIGNUP + GRAPH PROBE"
        : "PENDIENTE",
    },
    {
      id: "live-messaging",
      label: "Evidencia inbound + respuesta IA",
      ok: automatedMessagingEvidence,
      detail: automatedMessagingEvidence
        ? "LEDGER AUTOMÁTICO"
        : liveMessagingEvidence
          ? "SEÑAL HISTÓRICA; FALTA LEDGER V9"
          : "PENDIENTE",
    },
  ];

  const readyForSubmission =
    accessVerified &&
    configReady &&
    integrationActive &&
    probeReady &&
    automatedManagementEvidence &&
    automatedMessagingEvidence;

  return {
    engineVersion: "meta_review_evidence_v9",
    lifecycle: {
      accessVerificationStatus: lifecycle.accessVerificationStatus,
      accessVerificationUpdatedAt:
        lifecycle.accessVerificationUpdatedAt?.toISOString() ?? null,
      appReviewStatus: lifecycle.appReviewStatus,
      appReviewUpdatedAt:
        lifecycle.appReviewUpdatedAt?.toISOString() ?? null,
    },
    readyForSubmission,
    checklist,
    permissions,
    automatedEvidence: ledger.map((item) => ({
      id: item.id,
      event: item.event,
      label: evidenceLabels[item.event] ?? item.event,
      status: item.status,
      capturedAt: item.createdAt,
      ageHours: ageHours(item.createdAt),
      detail: item.detail,
    })),
    evidenceCoverage: {
      embeddedSignup: embeddedEvidence,
      graphProbe: probeEvidence,
      inbound: inboundEvidence,
      aiOutbound: outboundEvidence,
      strictE2E:
        automatedManagementEvidence && automatedMessagingEvidence,
    },
    publicUrls: {
      service: "https://pisaogastrobar.com/concierge",
      privacy: "https://pisaogastrobar.com/privacidad",
      terms: "https://pisaogastrobar.com/legal",
      deletion: "https://pisaogastrobar.com/eliminacion-datos",
      deletionCallback:
        "https://pisaogastrobar.com/api/meta/data-deletion",
      webhook: "https://pisaogastrobar.com/api/whatsapp/webhook",
    },
  };
}
