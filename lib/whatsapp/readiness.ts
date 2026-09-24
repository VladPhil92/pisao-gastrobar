import "server-only";

import { prisma } from "@/lib/prisma";
import { getWhatsAppIntegrationCredentials } from "@/lib/whatsapp/integration-store";
import {
  getEmbeddedSignupConfigId,
  recordWhatsAppProbe,
} from "@/lib/whatsapp/meta-config";
import {
  META_REVIEW_EVENTS,
  recordMetaReviewEvidence,
} from "@/lib/whatsapp/meta-review-evidence";

export type WhatsAppReadinessCheck = {
  id:
    | "APP_ID"
    | "APP_SECRET"
    | "WEBHOOK_TOKEN"
    | "TOKEN_VAULT"
    | "CONFIG_ID"
    | "INTEGRATION"
    | "META_GRAPH";
  label: string;
  ok: boolean;
};

export type WhatsAppReadinessResult = {
  ok: boolean;
  code: string;
  checks: WhatsAppReadinessCheck[];
  verifiedAt: string | null;
  integration: {
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    phoneNumberId: string;
    wabaId: string;
  } | null;
};

type MetaPhoneResponse = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  platform_type?: string;
  error?: {
    code?: number;
    message?: string;
  };
};

function graphVersion() {
  return process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v25.0";
}

function baseChecks(configId: string | null): WhatsAppReadinessCheck[] {
  return [
    {
      id: "APP_ID",
      label: "Meta App ID configurado",
      ok: Boolean(process.env.NEXT_PUBLIC_META_APP_ID?.trim()),
    },
    {
      id: "APP_SECRET",
      label: "Meta App Secret disponible en servidor",
      ok: Boolean(process.env.WHATSAPP_META_APP_SECRET?.trim()),
    },
    {
      id: "WEBHOOK_TOKEN",
      label: "Token de verificación del webhook configurado",
      ok: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()),
    },
    {
      id: "TOKEN_VAULT",
      label: "Token Vault AES-256 configurado",
      ok: Boolean(process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim()),
    },
    {
      id: "CONFIG_ID",
      label: "Embedded Signup Configuration ID configurado",
      ok: Boolean(configId),
    },
  ];
}

async function persistProbe(
  result: WhatsAppReadinessResult,
  updatedByUserId?: string | null,
) {
  await recordWhatsAppProbe({
    ok: result.ok,
    code: result.code,
    updatedByUserId,
  });
  return result;
}

export async function probeWhatsAppIntegration(
  updatedByUserId?: string | null,
): Promise<WhatsAppReadinessResult> {
  const configId = await getEmbeddedSignupConfigId();
  const checks = baseChecks(configId);

  if (checks.some((check) => !check.ok)) {
    return persistProbe(
      {
        ok: false,
        code: "SERVER_CONFIG_INCOMPLETE",
        checks: [
          ...checks,
          { id: "INTEGRATION", label: "Integración Meta guardada", ok: false },
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: null,
      },
      updatedByUserId,
    );
  }

  let integration: Awaited<
    ReturnType<typeof getWhatsAppIntegrationCredentials>
  >;
  try {
    integration = await getWhatsAppIntegrationCredentials();
  } catch {
    return persistProbe(
      {
        ok: false,
        code: "TOKEN_VAULT_ERROR",
        checks: [
          ...checks,
          { id: "INTEGRATION", label: "Integración Meta guardada", ok: false },
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: null,
      },
      updatedByUserId,
    );
  }

  const integrationOk = Boolean(
    integration?.id &&
      integration?.status === "ACTIVE" &&
      integration?.token &&
      integration?.phoneNumberId &&
      integration?.wabaId,
  );

  checks.push({
    id: "INTEGRATION",
    label: "Integración Meta ACTIVE guardada",
    ok: integrationOk,
  });

  if (!integration || !integrationOk) {
    return persistProbe(
      {
        ok: false,
        code: "NO_ACTIVE_INTEGRATION",
        checks: [
          ...checks,
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: null,
      },
      updatedByUserId,
    );
  }

  const url = new URL(
    `https://graph.facebook.com/${graphVersion()}/${integration.phoneNumberId}`,
  );
  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,quality_rating,platform_type",
  );

  let response: Response;
  let payload: MetaPhoneResponse;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${integration.token}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    payload = (await response.json()) as MetaPhoneResponse;
  } catch {
    return persistProbe(
      {
        ok: false,
        code: "META_UNREACHABLE",
        checks: [
          ...checks,
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: {
          displayPhoneNumber: integration.displayPhoneNumber,
          verifiedName: integration.verifiedName,
          phoneNumberId: integration.phoneNumberId,
          wabaId: integration.wabaId,
        },
      },
      updatedByUserId,
    );
  }

  if (!response.ok || !payload.id) {
    const invalidToken = payload.error?.code === 190;
    if (invalidToken) {
      await prisma.whatsAppIntegration.update({
        where: { id: integration.id },
        data: { status: "NEEDS_REAUTH" },
      });
    }

    return persistProbe(
      {
        ok: false,
        code: invalidToken ? "META_TOKEN_REJECTED" : "META_GRAPH_REJECTED",
        checks: [
          ...checks,
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: {
          displayPhoneNumber: integration.displayPhoneNumber,
          verifiedName: integration.verifiedName,
          phoneNumberId: integration.phoneNumberId,
          wabaId: integration.wabaId,
        },
      },
      updatedByUserId,
    );
  }

  if (payload.id !== integration.phoneNumberId) {
    return persistProbe(
      {
        ok: false,
        code: "META_PHONE_MISMATCH",
        checks: [
          ...checks,
          { id: "META_GRAPH", label: "Token validado contra Meta", ok: false },
        ],
        verifiedAt: null,
        integration: {
          displayPhoneNumber: integration.displayPhoneNumber,
          verifiedName: integration.verifiedName,
          phoneNumberId: integration.phoneNumberId,
          wabaId: integration.wabaId,
        },
      },
      updatedByUserId,
    );
  }

  const verifiedAt = new Date();
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: {
      status: "ACTIVE",
      lastVerifiedAt: verifiedAt,
      displayPhoneNumber:
        payload.display_phone_number?.slice(0, 32) ??
        integration.displayPhoneNumber,
      verifiedName:
        payload.verified_name?.slice(0, 128) ?? integration.verifiedName,
    },
  });

  checks.push({
    id: "META_GRAPH",
    label: "Token y Phone Number ID validados contra Meta",
    ok: true,
  });

  await recordMetaReviewEvidence({
    event: META_REVIEW_EVENTS.wabaProbeVerified,
    detail: {
      graphAccepted: true,
      integrationActive: true,
      coexistence: integration.coexistence,
      verifiedNamePresent: Boolean(payload.verified_name),
      qualityRatingPresent: Boolean(payload.quality_rating),
    },
    dedupeMinutes: 30,
  });

  return persistProbe(
    {
      ok: true,
      code: "META_CONNECTION_VERIFIED",
      checks,
      verifiedAt: verifiedAt.toISOString(),
      integration: {
        displayPhoneNumber:
          payload.display_phone_number ?? integration.displayPhoneNumber,
        verifiedName: payload.verified_name ?? integration.verifiedName,
        phoneNumberId: integration.phoneNumberId,
        wabaId: integration.wabaId,
      },
    },
    updatedByUserId,
  );
}
