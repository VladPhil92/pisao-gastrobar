import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { behaviorEventSchema } from "@/lib/analytics/behavioral-contract";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|headless/i;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 120;

type RateEntry = { count: number; resetAt: number };
const globalForRate = globalThis as unknown as {
  pisaoBehaviorRate?: Map<string, RateEntry>;
};
const rateStore =
  globalForRate.pisaoBehaviorRate ?? new Map<string, RateEntry>();

globalForRate.pisaoBehaviorRate = rateStore;

function canAccept(sessionId: string) {
  const now = Date.now();
  const current = rateStore.get(sessionId);

  if (!current || current.resetAt <= now) {
    rateStore.set(sessionId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_EVENTS_PER_WINDOW) return false;
  current.count += 1;

  if (rateStore.size > 5_000) {
    for (const [key, value] of rateStore) {
      if (value.resetAt <= now) rateStore.delete(key);
    }
  }

  return true;
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return new Response(null, { status: 204 });
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `behavior-ip:${identity}`,
    limit: 240,
    windowMs: WINDOW_MS,
  });
  if (!rate.allowed) {
    return new Response(null, { status: 204 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_PATTERN.test(userAgent)) {
    return new Response(null, { status: 204 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = behaviorEventSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const event = parsed.data;
  if (!canAccept(event.sessionId)) {
    return new Response(null, { status: 204 });
  }

  try {
    await prisma.eventoAnalitico.create({
      data: {
        tipo: event.eventName,
        sessionId: event.sessionId,
        pathname: event.pathname,
        surface: event.surface,
        productSlug: event.productSlug,
        categorySlug: event.categorySlug,
        intent: event.intent,
        step: event.step,
        paymentMethod: event.paymentMethod,
        deviceClass: event.deviceClass,
        budgetTier: event.budgetTier,
        diners: event.diners,
        itemCount: event.itemCount,
      },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.warn("behavior_analytics_write_failed", {
      eventName: event.eventName,
      pathname: event.pathname,
      error: error instanceof Error ? error.name : "unknown",
    });
    return new Response(null, { status: 202 });
  }
}
