import { createHash } from "node:crypto";

export type PaymentEvidence = {
  bytes: Uint8Array;
  arrayBuffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
  sha256: string;
};

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return (cleaned || "comprobante").slice(0, 180);
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function hasAsciiAt(bytes: Uint8Array, offset: number, text: string) {
  return [...text].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

function fileSignatureMatches(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  }

  if (mimeType === "image/png") {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (mimeType === "image/webp") {
    return hasAsciiAt(bytes, 0, "RIFF") && hasAsciiAt(bytes, 8, "WEBP");
  }

  if (mimeType === "application/pdf") {
    return hasAsciiAt(bytes, 0, "%PDF-");
  }

  return false;
}

/**
 * Normaliza y valida la evidencia antes de persistirla.
 * El archivo se guarda en PostgreSQL porque el filesystem del runtime de Render
 * es efímero. Cuando el volumen lo justifique, esta misma frontera puede migrarse
 * a object storage sin cambiar el contrato de la ruta de pago.
 */
export async function prepararComprobantePago(
  file: File,
): Promise<PaymentEvidence> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (!fileSignatureMatches(bytes, file.type)) {
    throw new Error("INVALID_PAYMENT_EVIDENCE_SIGNATURE");
  }

  return {
    bytes,
    arrayBuffer,
    fileName: sanitizeFileName(file.name),
    mimeType: file.type,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
