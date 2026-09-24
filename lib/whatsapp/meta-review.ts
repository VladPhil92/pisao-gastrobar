import "server-only";

import { prisma } from "@/lib/prisma";
import { getWhatsAppIntegrationSummary } from "@/lib/whatsapp/integration-store";
import {
  getEmbeddedSignupConfigId,
  getMetaReviewLifecycle,
  getWhatsAppRuntimeState,
} from "@/lib/whatsapp/meta-config";

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

export async function getMetaAppReviewReadiness() {
  const [
    lifecycle,
    configId,
    runtime,
    integration,
    lastInbound,
    lastAiReply,
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
  ]);

  const accessVerified =
    lifecycle.accessVerificationStatus === "VERIFIED";
  const configReady = Boolean(configId);
  const integrationActive = integration?.status === "ACTIVE";
  const probeReady = runtime.lastProbeStatus === "SUCCESS";
  const liveMessagingEvidence = Boolean(
    lastInbound?.processedAt && lastAiReply?.lastAiMessageAt,
  );

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
        "Mostrar conexión ACTIVE en PISÁO.",
      ],
      state: integrationActive
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
      state: liveMessagingEvidence
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
      id: "live-messaging",
      label: "Evidencia inbound + respuesta IA",
      ok: liveMessagingEvidence,
      detail: liveMessagingEvidence ? "DISPONIBLE" : "PENDIENTE",
    },
  ];

  const readyForSubmission =
    accessVerified &&
    configReady &&
    integrationActive &&
    probeReady &&
    liveMessagingEvidence;

  return {
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
