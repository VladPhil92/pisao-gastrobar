import "server-only";

import { prisma } from "@/lib/prisma";
import {
  deriveCertificationState,
  deriveOverallCertification,
  type CertificationState,
} from "@/lib/integrations/certification-core";
import {
  getEmbeddedSignupConfigId,
  getWhatsAppRuntimeState,
} from "@/lib/whatsapp/meta-config";
import {
  publicWebCertified,
  publicWebEvidence,
  type PublicWebProbe,
} from "@/lib/integrations/public-web-certification-core";

type EvidenceDetail = Record<string, string | number | boolean | null>;

export async function recordIntegrationEvidence(params: {
  integration: "KEV" | "CRYPTO";
  event: string;
  status: "SUCCESS" | "REJECTED" | "UNAVAILABLE" | "FAILED";
  detail?: EvidenceDetail;
}) {
  try {
    await prisma.integrationEvidence.create({
      data: {
        integration: params.integration,
        event: params.event.slice(0, 64),
        status: params.status,
        detail: params.detail ?? undefined,
      },
    });
    return true;
  } catch (error) {
    console.warn("[PISAO CERTIFICATION] Evidence persistence failed", {
      integration: params.integration,
      event: params.event,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}

function evidenceWindowDays() {
  const parsed = Number(process.env.PRODUCTION_CERTIFICATION_WINDOW_DAYS ?? "30");
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(365, Math.max(1, Math.round(parsed)));
}

function iso(value?: Date | null) {
  return value?.toISOString() ?? null;
}

function configuredKevBridge() {
  const url = process.env.KEV_GOVERNANCE_BRIDGE_URL?.trim() ?? "";
  const secret = process.env.KEV_GOVERNANCE_BRIDGE_SECRET?.trim() ?? "";
  return url.startsWith("https://") && secret.length >= 32;
}

function publicBaseUrl() {
  const configured = process.env.PISAO_PUBLIC_URL?.trim();
  return configured || "https://pisaogastrobar.com";
}

async function probePublicWeb(): Promise<PublicWebProbe> {
  const baseUrl = publicBaseUrl().replace(/\/$/, "");
  const configured = baseUrl.startsWith("https://");

  if (!configured) {
    return {
      configured: false,
      homeOk: false,
      currentRelease: false,
      legacyReleaseAbsent: false,
      healthOk: false,
      databaseOk: false,
      imageOk: false,
      imageBytes: 0,
      securityHeadersOk: false,
    };
  }

  try {
    const [homeResponse, healthResponse, imageResponse] = await Promise.all([
      fetch(`${baseUrl}/`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
        headers: { "User-Agent": "PISAO-Certification/3.0" },
      }),
      fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
        headers: { "User-Agent": "PISAO-Certification/3.0" },
      }),
      fetch(`${baseUrl}/api/media/pisao-experience`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": "PISAO-Certification/3.0" },
      }),
    ]);

    const [homeHtml, healthPayload, imageBytes] = await Promise.all([
      homeResponse.text(),
      healthResponse.json().catch(() => null) as Promise<{
        status?: string;
        database?: string;
      } | null>,
      imageResponse.arrayBuffer(),
    ]);

    const contentType = imageResponse.headers.get("content-type") ?? "";
    const securityHeadersOk =
      homeResponse.headers.get("x-content-type-options") === "nosniff" &&
      Boolean(homeResponse.headers.get("strict-transport-security")) &&
      Boolean(homeResponse.headers.get("content-security-policy"));

    return {
      configured,
      homeOk: homeResponse.ok,
      currentRelease:
        homeHtml.includes("Patacones · Cerveza artesanal · Terraza") &&
        homeHtml.includes("Así se vive PISÁO"),
      legacyReleaseAbsent: !homeHtml.includes(
        "Modo Plan · Mesa Visual · Concierge",
      ),
      healthOk: healthResponse.ok && healthPayload?.status === "ok",
      databaseOk: healthPayload?.database === "available",
      imageOk: imageResponse.ok && contentType.startsWith("image/"),
      imageBytes: imageBytes.byteLength,
      securityHeadersOk,
    };
  } catch {
    return {
      configured,
      homeOk: false,
      currentRelease: false,
      legacyReleaseAbsent: false,
      healthOk: false,
      databaseOk: false,
      imageOk: false,
      imageBytes: 0,
      securityHeadersOk: false,
    };
  }
}

export type ProductionCertificationGate = {
  id: "PUBLIC_WEB" | "OPENAI" | "WHATSAPP" | "PAYMENT_ALERTS" | "KEV" | "CRYPTO";
  label: string;
  state: CertificationState;
  configured: boolean;
  evidenceAt: string | null;
  evidence: string;
  nextAction: string;
  checks: Array<{
    label: string;
    ok: boolean;
  }>;
};

export async function getProductionCertificationSummary() {
  const windowDays = evidenceWindowDays();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [
    lastAiSuccess,
    lastAiRun,
    whatsappIntegration,
    lastWhatsappWebhook,
    lastWhatsappConversation,
    lastPaymentAlert,
    lastKevSuccess,
    lastKevAttempt,
    lastCryptoReconciliation,
    lastApprovedCrypto,
  ] = await Promise.all([
    prisma.aiConciergeRun.findFirst({
      where: {
        createdAt: { gte: since },
        fallback: false,
        outcome: "model_response",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, model: true, agent: true },
    }),
    prisma.aiConciergeRun.findFirst({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, outcome: true, fallback: true },
    }),
    prisma.whatsAppIntegration.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        coexistence: true,
        displayPhoneNumber: true,
        lastVerifiedAt: true,
        updatedAt: true,
      },
    }),
    prisma.whatsAppWebhookEvent.findFirst({
      where: {
        field: "messages",
        processedAt: { not: null },
        receivedAt: { gte: since },
      },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, processedAt: true },
    }),
    prisma.whatsAppConversation.findFirst({
      where: {
        lastInboundAt: { gte: since },
        lastAiMessageAt: { gte: since },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        updatedAt: true,
        lastInboundAt: true,
        lastAiMessageAt: true,
      },
    }),
    prisma.paymentAdminNotification.findFirst({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        provider: true,
        attempts: true,
        createdAt: true,
        deliveredAt: true,
      },
    }),
    prisma.integrationEvidence.findFirst({
      where: {
        integration: "KEV",
        status: "SUCCESS",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, event: true, detail: true },
    }),
    prisma.integrationEvidence.findFirst({
      where: {
        integration: "KEV",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true, event: true },
    }),
    prisma.integrationEvidence.findFirst({
      where: {
        integration: "CRYPTO",
        event: "reconciliation_run",
        status: "SUCCESS",
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, detail: true },
    }),
    prisma.pago.findFirst({
      where: {
        metodo: "CRIPTO",
        estado: "APROBADO",
        txHash: { not: null },
        verificadoEn: { not: null },
      },
      orderBy: { verificadoEn: "desc" },
      select: {
        verificadoEn: true,
        criptoMoneda: true,
        confirmacionesOnchain: true,
      },
    }),
  ]);

  const [embeddedConfigId, whatsappRuntime, publicWeb] = await Promise.all([
    getEmbeddedSignupConfigId(),
    getWhatsAppRuntimeState(),
    probePublicWeb(),
  ]);

  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const openAiEvidence = Boolean(lastAiSuccess);

  const whatsappServerConfig = Boolean(
    process.env.NEXT_PUBLIC_META_APP_ID?.trim() &&
      embeddedConfigId &&
      process.env.WHATSAPP_META_APP_SECRET?.trim() &&
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() &&
      process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim(),
  );
  const whatsappWebhookEnabled = whatsappRuntime.enabled;
  const whatsappProbePassed =
    whatsappRuntime.lastProbeStatus === "SUCCESS";
  const whatsappIntegrationActive =
    whatsappIntegration?.status === "ACTIVE";
  const whatsappConfigured =
    whatsappServerConfig &&
    whatsappIntegrationActive &&
    whatsappProbePassed &&
    whatsappWebhookEnabled;
  const whatsappEvidence = Boolean(
    lastWhatsappWebhook?.processedAt &&
      lastWhatsappConversation?.lastInboundAt &&
      lastWhatsappConversation?.lastAiMessageAt,
  );

  const paymentAlertChannelConfigured = Boolean(
    (process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM_EMAIL?.trim() &&
      process.env.PAYMENT_ADMIN_NOTIFY_EMAIL?.trim()) ||
      (process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
        process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()) ||
      process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_URL?.trim(),
  );
  const paymentRetryConfigured =
    (process.env.PAYMENT_NOTIFICATION_RETRY_SECRET?.trim().length ?? 0) >= 32;
  const paymentAlertsConfigured =
    paymentAlertChannelConfigured && paymentRetryConfigured;
  const paymentAlertEvidence = lastPaymentAlert?.status === "DELIVERED";

  const kevConfigured = configuredKevBridge();
  const kevEvidence = Boolean(lastKevSuccess);

  const cryptoEnabled = process.env.CRYPTO_PAYMENTS_ENABLED !== "false";
  const cryptoSchedulerConfigured = Boolean(
    process.env.CRYPTO_RECONCILIATION_SECRET?.trim() &&
      (process.env.CRYPTO_RECONCILIATION_SECRET?.trim().length ?? 0) >= 32,
  );
  const cryptoConfigured = cryptoEnabled && cryptoSchedulerConfigured;
  const cryptoSchedulerEvidence = Boolean(lastCryptoReconciliation);
  const cryptoPaymentEvidence = Boolean(lastApprovedCrypto?.verificadoEn);
  const cryptoEvidence = cryptoSchedulerEvidence && cryptoPaymentEvidence;

  const publicWebIsCertified = publicWebCertified(publicWeb);

  const gates: ProductionCertificationGate[] = [
    {
      id: "PUBLIC_WEB",
      label: "Web pública · Production Smoke",
      state: deriveCertificationState(publicWeb.configured, publicWebIsCertified),
      configured: publicWeb.configured,
      evidenceAt: publicWebIsCertified ? new Date().toISOString() : null,
      evidence: publicWebEvidence(publicWeb),
      nextAction: !publicWeb.configured
        ? "Configura PISAO_PUBLIC_URL con un dominio HTTPS."
        : !publicWeb.homeOk
          ? "Revisa dominio, SSL, Cloudflare y estado del servicio en Render."
          : !publicWeb.currentRelease || !publicWeb.legacyReleaseAbsent
            ? "El dominio no está sirviendo el release esperado; revisa caché/CDN y deployment activo."
            : !publicWeb.imageOk || publicWeb.imageBytes < 50_000
              ? "Corrige la entrega de /api/media/pisao-experience hasta que responda una imagen válida."
              : !publicWeb.healthOk || !publicWeb.databaseOk
                ? "Revisa /api/health y la conexión productiva con PostgreSQL."
                : !publicWeb.securityHeadersOk
                  ? "Restaura los headers de seguridad del dominio público."
                  : "Sin acción inmediata; superficie pública certificada en vivo.",
      checks: [
        { label: "Dominio público HTTPS", ok: publicWeb.configured },
        { label: "Home responde 200", ok: publicWeb.homeOk },
        { label: "Release actual visible", ok: publicWeb.currentRelease },
        { label: "Copy legacy ausente", ok: publicWeb.legacyReleaseAbsent },
        { label: "Health + base de datos", ok: publicWeb.healthOk && publicWeb.databaseOk },
        {
          label: "Fotografía crítica entregada",
          ok: publicWeb.imageOk && publicWeb.imageBytes >= 50_000,
        },
        { label: "Headers de seguridad", ok: publicWeb.securityHeadersOk },
      ],
    },
    {
      id: "OPENAI",
      label: "PISÁO Concierge · OpenAI",
      state: deriveCertificationState(openAiConfigured, openAiEvidence),
      configured: openAiConfigured,
      evidenceAt: iso(lastAiSuccess?.createdAt),
      evidence: lastAiSuccess
        ? `Respuesta real con ${lastAiSuccess.model} / ${lastAiSuccess.agent}.`
        : lastAiRun
          ? `Última ejecución: ${lastAiRun.outcome}${lastAiRun.fallback ? " (fallback)" : ""}.`
          : "Todavía no hay una ejecución real registrada dentro de la ventana.",
      nextAction: !openAiConfigured
        ? "Configura OPENAI_API_KEY en Render."
        : !openAiEvidence
          ? "Abre pisaogastrobar.com y envía un mensaje real al Concierge."
          : "Sin acción inmediata; el canal tiene evidencia reciente.",
      checks: [
        { label: "API key configurada", ok: openAiConfigured },
        { label: "Respuesta de modelo registrada", ok: openAiEvidence },
      ],
    },
    {
      id: "WHATSAPP",
      label: "WhatsApp · Coexistence",
      state: deriveCertificationState(whatsappConfigured, whatsappEvidence),
      configured: whatsappConfigured,
      evidenceAt: iso(
        lastWhatsappConversation?.lastAiMessageAt ??
          lastWhatsappWebhook?.processedAt,
      ),
      evidence: whatsappEvidence
        ? "Existe inbound procesado y respuesta IA registrada."
        : whatsappIntegration
          ? `Integración guardada en estado ${whatsappIntegration.status}; falta tráfico end-to-end.`
          : "No existe todavía una integración productiva guardada.",
      nextAction: !whatsappServerConfig
        ? "Completa las credenciales de Meta en Render."
        : !whatsappIntegrationActive
          ? "Entra a /admin/whatsapp y completa Embedded Signup con el número correcto."
          : !whatsappProbePassed
            ? "Ejecuta Verificar conexión desde /admin/whatsapp."
            : !whatsappWebhookEnabled
              ? "Activa el Concierge desde /admin/whatsapp cuando la verificación esté en verde."
              : !whatsappEvidence
              ? "Envía un WhatsApp desde un teléfono externo y confirma que el Concierge responda."
              : "Sin acción inmediata; Coexistence tiene evidencia end-to-end.",
      checks: [
        { label: "Credenciales servidor completas", ok: whatsappServerConfig },
        { label: "Integración Meta ACTIVE", ok: whatsappIntegrationActive },
        { label: "Conexión verificada contra Meta", ok: whatsappProbePassed },
        { label: "Runtime WhatsApp habilitado", ok: whatsappWebhookEnabled },
        { label: "Inbound procesado", ok: Boolean(lastWhatsappWebhook?.processedAt) },
        {
          label: "Respuesta IA por WhatsApp",
          ok: Boolean(lastWhatsappConversation?.lastAiMessageAt),
        },
      ],
    },
    {
      id: "PAYMENT_ALERTS",
      label: "Alertas de pago · Outbox",
      state: deriveCertificationState(
        paymentAlertsConfigured,
        paymentAlertEvidence,
      ),
      configured: paymentAlertsConfigured,
      evidenceAt: iso(lastPaymentAlert?.deliveredAt ?? lastPaymentAlert?.createdAt),
      evidence: paymentAlertEvidence
        ? `Última alerta entregada por ${lastPaymentAlert?.provider ?? "canal automático"} tras ${lastPaymentAlert?.attempts ?? 0} intento(s).`
        : lastPaymentAlert
          ? `Última alerta en estado ${lastPaymentAlert.status}; todavía no existe entrega certificada.`
          : "La outbox está lista, pero aún no existe una alerta originada por un comprobante real.",
      nextAction: !paymentAlertChannelConfigured
        ? "Configura al menos un canal automático: Resend, WhatsApp Cloud o webhook."
        : !paymentRetryConfigured
          ? "Configura PAYMENT_NOTIFICATION_RETRY_SECRET y activa el worker programado."
          : !paymentAlertEvidence
            ? "Carga un comprobante real o controlado y verifica que la alerta quede DELIVERED."
            : "Sin acción inmediata; las alertas administrativas tienen evidencia reciente.",
      checks: [
        { label: "Canal automático configurado", ok: paymentAlertChannelConfigured },
        { label: "Worker de reintentos protegido", ok: paymentRetryConfigured },
        { label: "Entrega persistida", ok: paymentAlertEvidence },
      ],
    },
    {
      id: "KEV",
      label: "KEV · Governance Bridge",
      state: deriveCertificationState(kevConfigured, kevEvidence),
      configured: kevConfigured,
      evidenceAt: iso(lastKevSuccess?.createdAt),
      evidence: lastKevSuccess
        ? `KEV aceptó el evento ${lastKevSuccess.event}.`
        : lastKevAttempt
          ? `Último intento: ${lastKevAttempt.status} / ${lastKevAttempt.event}.`
          : "Aún no existe evidencia persistente de una entrega aceptada por KEV.",
      nextAction: !kevConfigured
        ? "Configura KEV_GOVERNANCE_BRIDGE_URL y KEV_GOVERNANCE_BRIDGE_SECRET."
        : !kevEvidence
          ? "Genera una interacción real del Concierge, reserva u operación para producir un evento de gobernanza."
          : "Sin acción inmediata; KEV está recibiendo eventos firmados.",
      checks: [
        { label: "Bridge HTTPS + secreto configurados", ok: kevConfigured },
        { label: "Evento aceptado por KEV", ok: kevEvidence },
      ],
    },
    {
      id: "CRYPTO",
      label: "Pagos cripto · Reconciliación",
      state: deriveCertificationState(cryptoConfigured, cryptoEvidence),
      configured: cryptoConfigured,
      evidenceAt: iso(
        lastApprovedCrypto?.verificadoEn ?? lastCryptoReconciliation?.createdAt,
      ),
      evidence: cryptoPaymentEvidence
        ? `Pago ${lastApprovedCrypto?.criptoMoneda ?? "cripto"} aprobado con evidencia on-chain.`
        : cryptoSchedulerEvidence
          ? "El reconciliador ya está ejecutándose; todavía falta certificar un pago real aprobado."
          : "Aún no existe evidencia persistente de una ejecución del reconciliador.",
      nextAction: !cryptoConfigured
        ? "Configura y habilita el reconciliador cripto."
        : !cryptoSchedulerEvidence
          ? "Espera la próxima ejecución programada del cron; quedará registrada automáticamente."
          : !cryptoPaymentEvidence
            ? "Realiza un pago real pequeño —preferiblemente USDT BEP-20— y completa la aprobación administrativa."
            : "Sin acción inmediata; el rail cripto está certificado end-to-end.",
      checks: [
        { label: "Pagos cripto habilitados", ok: cryptoEnabled },
        { label: "Scheduler configurado", ok: cryptoSchedulerConfigured },
        { label: "Cron ejecutado con éxito", ok: cryptoSchedulerEvidence },
        { label: "Pago real aprobado", ok: cryptoPaymentEvidence },
      ],
    },
  ];

  return {
    engineVersion: "production_certification_v3",
    windowDays,
    overall: deriveOverallCertification(gates.map((gate) => gate.state)),
    certifiedCount: gates.filter((gate) => gate.state === "CERTIFIED").length,
    totalGates: gates.length,
    gates,
    generatedAt: new Date().toISOString(),
  };
}
