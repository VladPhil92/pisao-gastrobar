import { prisma } from "@/lib/prisma";
import {
  MAX_AUTOMATIC_RESERVATION_PEOPLE,
  MAX_COMBINED_TABLES,
  RESERVABLE_TABLE_SEATS,
} from "@/lib/reservas/policy";
import { kevGovernanceEnabled } from "@/lib/governance/kev-bridge";
import { transactionCommandHealth } from "@/lib/ai/transaction-command-bus";
import { turnstileHealth } from "@/lib/security/turnstile";
import { observabilityHealth } from "@/lib/observability/sentry-transport";
import { cloudflareProxyTrusted } from "@/lib/security/rate-limit";
import { edgeOriginHealth } from "@/lib/security/edge-origin";

export const dynamic = "force-dynamic";

const EXPECTED_TABLE_CODES = Array.from({ length: 8 }, (_, index) => `T${index + 1}`);

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const tables = await prisma.mesaReservable.findMany({
      select: {
        codigo: true,
        capacidad: true,
        activa: true,
      },
      orderBy: { codigo: "asc" },
    });

    const inventoryReady =
      tables.length === EXPECTED_TABLE_CODES.length &&
      EXPECTED_TABLE_CODES.every((code) =>
        tables.some(
          (table) =>
            table.codigo === code &&
            table.capacidad === RESERVABLE_TABLE_SEATS,
        ),
      );

    const payload = {
      status: inventoryReady ? "ok" : "degraded",
      app: "pisao-gastrobar",
      database: "available",
      reservations: {
        inventory: inventoryReady ? "ready" : "invalid",
        tables: tables.length,
        activeTables: tables.filter((table) => table.activa).length,
        seatsPerTable: RESERVABLE_TABLE_SEATS,
        maxCombinedTables: MAX_COMBINED_TABLES,
        maxAutomaticGroup: MAX_AUTOMATIC_RESERVATION_PEOPLE,
      },
      payments: {
        activeMethod: "QR_TRANSFERENCIA",
        availableMethods:
          process.env.CRYPTO_PAYMENTS_ENABLED === "false"
            ? ["QR_TRANSFERENCIA"]
            : ["QR_TRANSFERENCIA", "CRIPTO"],
        receiptStorage: "postgresql",
        cardAndPse:
          process.env.CARD_PAYMENTS_ENABLED === "true" ? "enabled" : "disabled",
        crypto:
          process.env.CRYPTO_PAYMENTS_ENABLED === "false"
            ? "disabled"
            : "enabled_manual_onchain_precheck",
        onchainPrecheck:
          process.env.CRYPTO_PAYMENTS_ENABLED === "false"
            ? "disabled"
            : "enabled",
        cryptoGatewayWebhook: "disabled",
        adminNotification: process.env.WHATSAPP_CLOUD_API_TOKEN &&
          process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
          ? "whatsapp_cloud"
          : process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_URL
            ? "webhook"
            : "click_to_chat",
      },
      intelligence: {
        revenueAttribution: {
          mode: "server_resolved",
          source: "first_party_behavior",
          windowHours: 12,
          priceIntegrity: "server_catalog_revalidation",
        },
        revenueActionEngine: {
          mode: "human_governed",
          engineVersion: "revenue_action_engine_v2",
          lifecycle: "observe_propose_approve_execute_measure",
          autonomousSensitiveMutations: false,
        },
        revenueExperimentation: {
          mode: "controlled_session_assignment",
          engineVersion: "revenue_experimentation_v3",
          unit: "first_party_session",
          split: "50_50",
          minimumPerArm: 30,
          maxConcurrentConciergeExperiments: 1,
          primaryMetric: "paid_conversion_rate",
        },
      },
      ai: {
        mode: process.env.OPENAI_API_KEY ? "openai" : "fallback",
        model: process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna",
        transactionCommands: transactionCommandHealth(),
      },
      security: {
        cloudflare: {
          clientIpHeader: cloudflareProxyTrusted()
            ? "cf-connecting-ip"
            : "x-forwarded-for",
          proxyTrust: cloudflareProxyTrusted() ? "enabled" : "disabled",
          origin: edgeOriginHealth(),
          turnstile: turnstileHealth(),
        },
      },
      observability: observabilityHealth(),
      governance: {
        kev: {
          mode: "observe_only",
          bridge: kevGovernanceEnabled() ? "enabled" : "disabled",
          mutationAuthority: false,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return Response.json(payload, {
      status: inventoryReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[PISAO HEALTH] Database unavailable", error);

    return Response.json(
      {
        status: "degraded",
        app: "pisao-gastrobar",
        database: "unavailable",
        reservations: { inventory: "unknown" },
        payments: {
          activeMethod: "QR_TRANSFERENCIA",
          availableMethods:
            process.env.CRYPTO_PAYMENTS_ENABLED === "false"
              ? ["QR_TRANSFERENCIA"]
              : ["QR_TRANSFERENCIA", "CRIPTO"],
          receiptStorage: "unknown",
          cardAndPse:
            process.env.CARD_PAYMENTS_ENABLED === "true" ? "enabled" : "disabled",
          crypto:
            process.env.CRYPTO_PAYMENTS_ENABLED === "false"
              ? "disabled"
              : "enabled_manual_onchain_precheck",
          onchainPrecheck:
            process.env.CRYPTO_PAYMENTS_ENABLED === "false"
              ? "disabled"
              : "enabled",
          cryptoGatewayWebhook: "disabled",
          adminNotification: process.env.WHATSAPP_CLOUD_API_TOKEN &&
            process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID
            ? "whatsapp_cloud"
            : process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_URL
              ? "webhook"
              : "click_to_chat",
        },
        intelligence: {
          revenueAttribution: {
            mode: "server_resolved",
            source: "first_party_behavior",
            windowHours: 12,
            priceIntegrity: "server_catalog_revalidation",
          },
          revenueActionEngine: {
            mode: "human_governed",
            engineVersion: "revenue_action_engine_v2",
            lifecycle: "observe_propose_approve_execute_measure",
            autonomousSensitiveMutations: false,
          },
          revenueExperimentation: {
            mode: "controlled_session_assignment",
            engineVersion: "revenue_experimentation_v3",
            unit: "first_party_session",
            split: "50_50",
            minimumPerArm: 30,
            maxConcurrentConciergeExperiments: 1,
            primaryMetric: "paid_conversion_rate",
          },
        },
        ai: {
          mode: process.env.OPENAI_API_KEY ? "openai" : "fallback",
          model: process.env.PISAO_AI_MODEL ?? "gpt-5.6-luna",
          transactionCommands: transactionCommandHealth(),
        },
        security: {
          cloudflare: {
            clientIpHeader: cloudflareProxyTrusted()
            ? "cf-connecting-ip"
            : "x-forwarded-for",
          proxyTrust: cloudflareProxyTrusted() ? "enabled" : "disabled",
          origin: edgeOriginHealth(),
          turnstile: turnstileHealth(),
          },
        },
        observability: observabilityHealth(),
        governance: {
          kev: {
            mode: "observe_only",
            bridge: kevGovernanceEnabled() ? "enabled" : "disabled",
            mutationAuthority: false,
          },
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
