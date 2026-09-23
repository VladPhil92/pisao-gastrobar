import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBuffer() {
  const raw = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY_MISSING");

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) return base64;

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY_INVALID");
}

export function encryptWhatsAppToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decryptWhatsAppToken(params: {
  ciphertext: string;
  iv: string;
  tag: string;
}) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBuffer(),
    Buffer.from(params.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(params.tag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(params.ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
