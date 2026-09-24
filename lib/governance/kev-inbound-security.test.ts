import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.KEV_GOVERNANCE_INBOUND_SECRET =
  "test-secret-with-at-least-thirty-two-characters";

import { verifyKevInboundRequest } from "@/lib/governance/kev-inbound-security";

function signature(timestamp: number, body: string) {
  return (
    "sha256=" +
    createHmac(
      "sha256",
      process.env.KEV_GOVERNANCE_INBOUND_SECRET!,
    )
      .update(String(timestamp) + "." + body)
      .digest("hex")
  );
}

test("accepts a valid Kev advisory signature", () => {
  const now = 1_800_000_000;
  const body = JSON.stringify({ hello: "pisao" });

  assert.equal(
    verifyKevInboundRequest({
      rawBody: body,
      timestampHeader: String(now),
      signatureHeader: signature(now, body),
      nowSeconds: now,
    }),
    true,
  );
});

test("rejects stale or modified requests", () => {
  const now = 1_800_000_000;
  const oldTimestamp = now - 600;
  const body = JSON.stringify({ hello: "pisao" });

  assert.equal(
    verifyKevInboundRequest({
      rawBody: body,
      timestampHeader: String(oldTimestamp),
      signatureHeader: signature(oldTimestamp, body),
      nowSeconds: now,
    }),
    false,
  );

  assert.equal(
    verifyKevInboundRequest({
      rawBody: body + " ",
      timestampHeader: String(now),
      signatureHeader: signature(now, body),
      nowSeconds: now,
    }),
    false,
  );
});
