import "server-only";

import { prisma } from "@/lib/prisma";
import {
  summarizeContextualCommerceLearning,
  type ContextualProductLearning,
} from "@/lib/revenue/contextual-learning-core";

const DAY_MS = 86_400_000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const EVENT_TYPES = ["concierge_nba_view", "concierge_nba_add"] as const;

type CachedLearning = {
  expiresAt: number;
  products: ContextualProductLearning[];
};

const globalForLearning = globalThis as unknown as {
  pisaoContextualLearningCache?: Map<string, CachedLearning>;
};

const cache =
  globalForLearning.pisaoContextualLearningCache ??
  new Map<string, CachedLearning>();

globalForLearning.pisaoContextualLearningCache = cache;

function cacheKey(productSlugs: string[]) {
  return [...new Set(productSlugs)].sort().join("|");
}

export async function getContextualProductLearning(
  productSlugs: string[],
): Promise<ContextualProductLearning[]> {
  const slugs = [...new Set(productSlugs.filter(Boolean))].sort();
  if (!slugs.length) return [];

  const key = cacheKey(slugs);
  const nowMs = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > nowMs) {
    return existing.products;
  }

  const since = new Date(nowMs - 30 * DAY_MS);

  try {
    const [events, paidOrders] = await Promise.all([
      prisma.eventoAnalitico.findMany({
        where: {
          createdAt: { gte: since },
          tipo: { in: [...EVENT_TYPES] },
          productSlug: { in: slugs },
        },
        select: {
          tipo: true,
          sessionId: true,
          productSlug: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pedido.findMany({
        where: {
          createdAt: { gte: since },
          items: {
            some: {
              producto: { slug: { in: slugs } },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          pago: { select: { estado: true } },
          attribution: { select: { sessionId: true } },
          items: {
            where: {
              producto: { slug: { in: slugs } },
            },
            select: {
              cantidad: true,
              subtotal: true,
              producto: { select: { slug: true } },
            },
          },
        },
      }),
    ]);

    const summary = summarizeContextualCommerceLearning(
      events.map((event) => ({
        tipo: event.tipo,
        sessionId: event.sessionId,
        productSlug: event.productSlug,
        createdAt: event.createdAt,
      })),
      paidOrders
        .filter((order) => order.pago?.estado === "APROBADO")
        .map((order) => ({
          id: order.id,
          sessionId: order.attribution?.sessionId ?? null,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            productSlug: item.producto.slug,
            quantity: item.cantidad,
            subtotalCop: Number(item.subtotal),
          })),
        })),
    );

    const value = {
      expiresAt: nowMs + CACHE_TTL_MS,
      products: summary.products,
    };
    cache.set(key, value);

    if (cache.size > 50) {
      for (const [entryKey, entry] of cache) {
        if (entry.expiresAt <= nowMs) cache.delete(entryKey);
      }
    }

    return value.products;
  } catch (error) {
    console.warn("contextual_learning_lookup_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return [];
  }
}
