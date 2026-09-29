"use client";

import { useEffect } from "react";
import {
  CONCIERGE_API_PATH,
  CONCIERGE_CLIENT_TIMEOUT_MS,
  CONCIERGE_MAX_ATTEMPTS,
  classifyConciergeTransportFailure,
  conciergeFallbackText,
  conciergeRetryDelayMs,
  isRetryableConciergeStatus,
  type ConciergeTransportFailureKind,
} from "@/lib/ai/concierge-network-policy";

type ClientFailureReport = {
  requestId: string;
  attempts: number;
  kind: ConciergeTransportFailureKind;
  status: number | null;
  elapsedMs: number;
  online: boolean;
  visibility: DocumentVisibilityState;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createRequestId() {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `concierge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function isConciergeRequest(input: RequestInfo | URL) {
  try {
    const raw = input instanceof Request ? input.url : input.toString();
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin && url.pathname === CONCIERGE_API_PATH;
  } catch {
    return false;
  }
}

async function hasValidConciergePayload(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return false;

  try {
    const payload = (await response.clone().json()) as { text?: unknown };
    return typeof payload.text === "string" && payload.text.trim().length > 0;
  } catch {
    return false;
  }
}

function syntheticFallbackResponse(requestId: string) {
  return new Response(
    JSON.stringify({
      text: conciergeFallbackText(),
      fallback: true,
      transportFallback: true,
      clientRequestId: requestId,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-PISAO-Concierge-Fallback": "client-transport",
      },
    },
  );
}

export function ConciergeNetworkGuard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    async function reportClientFailure(report: ClientFailureReport) {
      try {
        await originalFetch("/api/ai/concierge/client-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
          cache: "no-store",
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // Observability must never become another customer-facing failure.
      }
    }

    const guardedFetch: typeof window.fetch = async (input, init) => {
      if (!isConciergeRequest(input)) {
        return originalFetch(input, init);
      }

      const baseRequest = new Request(input, init);
      const requestId = createRequestId();
      const overallStartedAt = performance.now();
      let lastStatus: number | null = null;
      let lastError: unknown;
      let lastTimedOut = false;
      let lastInvalidResponse = false;
      let attempts = 0;

      for (let attempt = 1; attempt <= CONCIERGE_MAX_ATTEMPTS; attempt += 1) {
        attempts = attempt;
        const controller = new AbortController();
        let timedOut = false;
        const timeoutId = window.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, CONCIERGE_CLIENT_TIMEOUT_MS);

        const headers = new Headers(baseRequest.headers);
        headers.set("X-PISAO-Client-Request-Id", requestId);
        headers.set("X-PISAO-Client-Attempt", String(attempt));

        try {
          const attemptRequest = new Request(baseRequest.clone(), {
            headers,
            signal: controller.signal,
            cache: "no-store",
          });
          const response = await originalFetch(attemptRequest);

          if (response.ok) {
            if (await hasValidConciergePayload(response)) {
              return response;
            }

            lastStatus = response.status;
            lastInvalidResponse = true;
            lastTimedOut = false;
            lastError = undefined;
            void response.body?.cancel().catch(() => undefined);
          } else if (!isRetryableConciergeStatus(response.status)) {
            return response;
          } else {
            lastStatus = response.status;
            lastInvalidResponse = false;
            lastTimedOut = false;
            lastError = undefined;
            void response.body?.cancel().catch(() => undefined);
          }

          if (attempt < CONCIERGE_MAX_ATTEMPTS) {
            await sleep(conciergeRetryDelayMs(attempt));
          }
        } catch (error) {
          lastError = error;
          lastInvalidResponse = false;
          lastTimedOut = timedOut;

          // A timeout already consumed the full provider window. Do not make the
          // visitor wait through multiple long timeouts; fail over immediately.
          if (timedOut) break;

          if (attempt < CONCIERGE_MAX_ATTEMPTS) {
            await sleep(conciergeRetryDelayMs(attempt));
          }
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      const kind = classifyConciergeTransportFailure({
        error: lastError,
        status: lastStatus,
        timedOut: lastTimedOut,
        invalidResponse: lastInvalidResponse,
      });
      const elapsedMs = Math.max(0, Math.round(performance.now() - overallStartedAt));

      void reportClientFailure({
        requestId,
        attempts,
        kind,
        status: lastStatus,
        elapsedMs,
        online: navigator.onLine,
        visibility: document.visibilityState,
      });

      return syntheticFallbackResponse(requestId);
    };

    window.fetch = guardedFetch;

    return () => {
      if (window.fetch === guardedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  return null;
}
