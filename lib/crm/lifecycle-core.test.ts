import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOMER_LIFECYCLE_ENGINE_VERSION,
  classifyCustomerLifecycle,
} from "./lifecycle-core";

const now = new Date("2026-09-24T12:00:00-05:00");

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 86_400_000);
}

test("classifies first-party customer lifecycle deterministically", () => {
  assert.equal(
    classifyCustomerLifecycle(
      {
        deliveredOrders: 0,
        loyaltyPoints: 0,
        lastActivityAt: daysAgo(2),
        marketingConsent: false,
        hasContact: true,
      },
      now,
    ).stage,
    "PROSPECT",
  );

  assert.equal(
    classifyCustomerLifecycle(
      {
        deliveredOrders: 1,
        loyaltyPoints: 42,
        lastActivityAt: daysAgo(10),
        marketingConsent: true,
        hasContact: true,
      },
      now,
    ).stage,
    "NEW_CUSTOMER",
  );

  assert.equal(
    classifyCustomerLifecycle(
      {
        deliveredOrders: 3,
        loyaltyPoints: 210,
        lastActivityAt: daysAgo(20),
        marketingConsent: true,
        hasContact: true,
      },
      now,
    ).stage,
    "ACTIVE",
  );

  const loyal = classifyCustomerLifecycle(
    {
      deliveredOrders: 7,
      loyaltyPoints: 880,
      lastActivityAt: daysAgo(12),
      marketingConsent: true,
      hasContact: true,
    },
    now,
  );
  assert.equal(loyal.stage, "LOYAL");
  assert.equal(loyal.engineVersion, CUSTOMER_LIFECYCLE_ENGINE_VERSION);
});

test("recency takes precedence over purchase frequency", () => {
  const atRisk = classifyCustomerLifecycle(
    {
      deliveredOrders: 8,
      loyaltyPoints: 1200,
      lastActivityAt: daysAgo(60),
      marketingConsent: true,
      hasContact: true,
    },
    now,
  );
  assert.equal(atRisk.stage, "AT_RISK");
  assert.equal(atRisk.priority, "HIGH");

  const dormant = classifyCustomerLifecycle(
    {
      deliveredOrders: 12,
      loyaltyPoints: 2200,
      lastActivityAt: daysAgo(120),
      marketingConsent: true,
      hasContact: true,
    },
    now,
  );
  assert.equal(dormant.stage, "DORMANT");
});

test("never treats a customer as contactable without consent and contact data", () => {
  const noConsent = classifyCustomerLifecycle(
    {
      deliveredOrders: 2,
      loyaltyPoints: 120,
      lastActivityAt: daysAgo(70),
      marketingConsent: false,
      hasContact: true,
    },
    now,
  );
  assert.equal(noConsent.outreachAllowed, false);
  assert.match(noConsent.rationale, /No habilitar contacto saliente/);

  const noContact = classifyCustomerLifecycle(
    {
      deliveredOrders: 2,
      loyaltyPoints: 120,
      lastActivityAt: daysAgo(70),
      marketingConsent: true,
      hasContact: false,
    },
    now,
  );
  assert.equal(noContact.outreachAllowed, false);
});

test("only marks consented at-risk customers as reactivation-ready", () => {
  const result = classifyCustomerLifecycle(
    {
      deliveredOrders: 4,
      loyaltyPoints: 430,
      lastActivityAt: daysAgo(55),
      marketingConsent: true,
      hasContact: true,
    },
    now,
  );

  assert.equal(result.stage, "AT_RISK");
  assert.equal(result.outreachAllowed, true);
  assert.equal(result.nextBestAction, "Preparar reactivación consentida");
});
