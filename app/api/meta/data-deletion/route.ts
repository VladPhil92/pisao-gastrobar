import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

type MetaSignedPayload = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64");
}

function verifySignedRequest(
  signedRequest: string,
  appSecret: string,
): MetaSignedPayload | null {
  const [encodedSignature, encodedPayload] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload) return null;

  let payload: MetaSignedPayload;
  try {
    payload = JSON.parse(
      decodeBase64Url(encodedPayload).toString("utf8"),
    ) as MetaSignedPayload;
  } catch {
    return null;
  }

  if (
    payload.algorithm &&
    payload.algorithm.toUpperCase() !== "HMAC-SHA256"
  ) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();
  const actual = decodeBase64Url(encodedSignature);

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  return payload;
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_META_APP_SECRET?.trim();
  if (!appSecret) {
    return Response.json(
      { error: "Meta App Secret no configurado." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");

  if (typeof signedRequest !== "string" || !signedRequest) {
    return Response.json(
      { error: "signed_request requerido." },
      { status: 400 },
    );
  }

  const payload = verifySignedRequest(signedRequest, appSecret);
  if (!payload?.user_id) {
    return Response.json(
      { error: "Solicitud de Meta inválida." },
      { status: 400 },
    );
  }

  const providerUserIdHash = crypto
    .createHash("sha256")
    .update(payload.user_id)
    .digest("hex");
  const confirmationCode = crypto.randomBytes(16).toString("hex");

  // PISÁO no persiste Facebook user_id ni perfiles personales de Facebook.
  // Se registra únicamente una evidencia irreidentificable de la solicitud.
  await prisma.metaDataDeletionRequest.create({
    data: {
      providerUserIdHash,
      confirmationCode,
      status: "COMPLETED_NO_PERSISTED_META_PROFILE",
      completedAt: new Date(),
    },
  });

  return Response.json({
    url: `${siteConfig.url}/eliminacion-datos?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
