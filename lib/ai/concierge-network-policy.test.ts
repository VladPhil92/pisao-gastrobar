import assert from "node:assert/strict";
import test from "node:test";
import {
  CONCIERGE_MAX_ATTEMPTS,
  classifyConciergeTransportFailure,
  conciergeFallbackText,
  conciergeRetryDelayMs,
  isRetryableConciergeStatus,
} from "@/lib/ai/concierge-network-policy";

test("retries only transient gateway and server statuses", () => {
  for (const status of [408, 425, 500, 502, 503, 504]) {
    assert.equal(isRetryableConciergeStatus(status), true, `${status} should retry`);
  }

  for (const status of [400, 401, 403, 404, 409, 422, 429]) {
    assert.equal(isRetryableConciergeStatus(status), false, `${status} must not retry`);
  }
});

test("classifies browser transport failures without leaking raw messages", () => {
  assert.equal(
    classifyConciergeTransportFailure({ error: new TypeError("Failed to fetch") }),
    "network",
  );
  assert.equal(
    classifyConciergeTransportFailure({ status: 503 }),
    "http_retryable",
  );
  assert.equal(
    classifyConciergeTransportFailure({ timedOut: true }),
    "timeout",
  );
  assert.equal(
    classifyConciergeTransportFailure({ invalidResponse: true }),
    "invalid_response",
  );

  assert.equal(CONCIERGE_MAX_ATTEMPTS, 3);
  assert.equal(conciergeRetryDelayMs(1), 250);
  assert.equal(conciergeRetryDelayMs(2), 700);
  assert.doesNotMatch(conciergeFallbackText(), /failed to fetch|timeout|500|502|503/i);
});
