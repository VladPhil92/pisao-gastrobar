import { auth } from "@/lib/auth";
import { captureServerError } from "@/lib/observability/sentry-transport";
import { saveWhatsAppIntegration } from "@/lib/whatsapp/integration-store";

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: { message?: string; code?: number };
};

type MetaPhoneNumber = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  code_verification_status?: string;
  quality_rating?: string;
  platform_type?: string;
  throughput?: { level?: string };
};

type MetaPhoneNumbersResponse = {
  data?: MetaPhoneNumber[];
  error?: { message?: string; code?: number };
};

type MetaSuccessResponse = {
  success?: boolean;
  error?: { message?: string; code?: number };
};

function graphVersion() {
  return process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v25.0";
}

async function exchangeCode(code: string) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim();
  const appSecret = process.env.WHATSAPP_META_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error("META_EMBEDDED_SIGNUP_CREDENTIALS_UNCONFIGURED");
  }

  const url = new URL(
    `https://graph.facebook.com/${graphVersion()}/oauth/access_token`,
  );
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json()) as MetaTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error?.message ||
        `META_TOKEN_EXCHANGE_FAILED_${response.status}`,
    );
  }

  return payload.access_token;
}

async function listPhoneNumbers(wabaId: string, accessToken: string) {
  const url = new URL(
    `https://graph.facebook.com/${graphVersion()}/${wabaId}/phone_numbers`,
  );
  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput",
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json()) as MetaPhoneNumbersResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `META_PHONE_DISCOVERY_FAILED_${response.status}`,
    );
  }

  return payload.data ?? [];
}

async function subscribeWaba(wabaId: string, accessToken: string) {
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const payload = (await response.json()) as MetaSuccessResponse;

  if (!response.ok || payload.success !== true) {
    throw new Error(
      payload.error?.message ||
        `META_WABA_SUBSCRIPTION_FAILED_${response.status}`,
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(role ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      code?: unknown;
      wabaId?: unknown;
      phoneNumberId?: unknown;
    };

    const code = typeof body.code === "string" ? body.code.trim() : "";
    const wabaId =
      typeof body.wabaId === "string" ? body.wabaId.trim() : "";
    const requestedPhoneNumberId =
      typeof body.phoneNumberId === "string"
        ? body.phoneNumberId.trim()
        : "";

    if (!code || !wabaId) {
      return Response.json(
        { error: "Faltan el código de autorización o el WABA ID." },
        { status: 400 },
      );
    }

    const accessToken = await exchangeCode(code);
    const phoneNumbers = await listPhoneNumbers(wabaId, accessToken);

    const selected =
      (requestedPhoneNumberId
        ? phoneNumbers.find((item) => item.id === requestedPhoneNumberId)
        : null) ??
      (phoneNumbers.length === 1 ? phoneNumbers[0] : null);

    if (!selected?.id) {
      return Response.json(
        {
          error:
            "Meta autorizó la WABA, pero no fue posible determinar un único número. Reintenta el onboarding seleccionando el número correcto.",
          phoneCount: phoneNumbers.length,
        },
        { status: 409 },
      );
    }

    // Coexistence ya registra/vincula el número durante Embedded Signup.
    // Deliberadamente NO llamamos /{phone-number-id}/register.
    await subscribeWaba(wabaId, accessToken);

    const integration = await saveWhatsAppIntegration({
      wabaId,
      phoneNumberId: selected.id,
      displayPhoneNumber: selected.display_phone_number ?? null,
      verifiedName: selected.verified_name ?? null,
      accessToken,
      status: "ACTIVE",
      coexistence: true,
    });

    return Response.json({
      ok: true,
      integration: {
        id: integration.id,
        wabaId: integration.wabaId,
        phoneNumberId: integration.phoneNumberId,
        displayPhoneNumber: integration.displayPhoneNumber,
        verifiedName: integration.verifiedName,
        coexistence: integration.coexistence,
        status: integration.status,
      },
    });
  } catch (error) {
    void captureServerError(error, {
      surface: "whatsapp_embedded_signup",
      code: "WHATSAPP_EMBEDDED_SIGNUP_FAILED",
    });

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible completar Embedded Signup.",
      },
      { status: 503 },
    );
  }
}
