export const CONCIERGE_API_PATH = "/api/ai/concierge";
export const CONCIERGE_CLIENT_TIMEOUT_MS = 18_000;
export const CONCIERGE_MAX_ATTEMPTS = 3;

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 500, 502, 503, 504]);

export type ConciergeTransportFailureKind =
  | "network"
  | "timeout"
  | "http_retryable"
  | "invalid_response"
  | "unknown";

export function isRetryableConciergeStatus(status: number) {
  return RETRYABLE_HTTP_STATUS.has(status);
}

export function conciergeRetryDelayMs(attempt: number) {
  if (attempt <= 1) return 250;
  if (attempt === 2) return 700;
  return 1_200;
}

export function classifyConciergeTransportFailure(params: {
  error?: unknown;
  status?: number | null;
  timedOut?: boolean;
  invalidResponse?: boolean;
}): ConciergeTransportFailureKind {
  if (params.timedOut) return "timeout";
  if (params.invalidResponse) return "invalid_response";
  if (
    typeof params.status === "number" &&
    isRetryableConciergeStatus(params.status)
  ) {
    return "http_retryable";
  }
  if (params.error instanceof TypeError) return "network";
  if (
    params.error instanceof DOMException &&
    params.error.name === "AbortError"
  ) {
    return "timeout";
  }
  return "unknown";
}

export function conciergeFallbackText() {
  return "Estoy teniendo una dificultad momentánea para conectarme. Ya intenté reconectar automáticamente. Puedes seguir viendo la carta o reservar mientras recupero la conexión; si necesitas atención inmediata, también puedes continuar por WhatsApp.";
}
