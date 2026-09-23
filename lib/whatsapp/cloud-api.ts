import "server-only";

import { getWhatsAppIntegrationCredentials } from "@/lib/whatsapp/integration-store";

type WhatsAppTextSendResult = {
  messageId: string | null;
  phoneNumberId: string;
};

type CloudApiPayload = {
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    code?: number;
  };
};

async function config(preferredPhoneNumberId?: string) {
  const stored = await getWhatsAppIntegrationCredentials(
    preferredPhoneNumberId,
  );

  if (stored?.token && stored.phoneNumberId) {
    return {
      token: stored.token,
      phoneNumberId: stored.phoneNumberId,
      version:
        process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v25.0",
    };
  }

  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId =
    preferredPhoneNumberId ||
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  const version =
    process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v25.0";

  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_CLOUD_API_UNCONFIGURED");
  }

  return { token, phoneNumberId, version };
}

export async function whatsappCloudConfigured() {
  try {
    await config();
    return true;
  } catch {
    return false;
  }
}

export async function sendWhatsAppText(params: {
  to: string;
  body: string;
  phoneNumberId?: string;
}): Promise<WhatsAppTextSendResult> {
  const { token, phoneNumberId, version } = await config(params.phoneNumberId);
  const body = params.body.trim().slice(0, 4096);

  if (!body) {
    throw new Error("WHATSAPP_EMPTY_OUTBOUND_MESSAGE");
  }

  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to.replace(/\D/g, ""),
        type: "text",
        text: {
          preview_url: true,
          body,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  const payload = (await response.json()) as CloudApiPayload;

  if (!response.ok) {
    const detail =
      payload.error?.message || `WhatsApp Cloud API HTTP ${response.status}`;
    throw new Error(`WHATSAPP_CLOUD_SEND_FAILED: ${detail}`);
  }

  return {
    messageId: payload.messages?.[0]?.id ?? null,
    phoneNumberId,
  };
}
