import "server-only";

import { cookies } from "next/headers";

import {
  CUSTOMER_SESSION_COOKIE,
  readCustomerLocalSession,
} from "@/lib/auth/customer-session";
import {
  CTG_ONE_SESSION_COOKIE,
  readCustomerSession,
} from "@/lib/auth/ctgone-federation";
import { findCrmCustomerByEmail } from "@/lib/crm/customer-identity";
import { classifyCustomerLifecycle } from "@/lib/crm/lifecycle-core";
import { buildConciergeLifecycleGuidance } from "@/lib/crm/concierge-lifecycle-core";
import { prisma } from "@/lib/prisma";

function anonymousContext() {
  return buildConciergeLifecycleGuidance({
    authenticated: false,
    stage: "PROSPECT",
    deliveredOrders: 0,
    loyaltyPoints: 0,
    favorites: [],
  });
}

export async function getAuthenticatedConciergeLifecycleContext() {
  const store = await cookies();
  const localSession = readCustomerLocalSession(
    store.get(CUSTOMER_SESSION_COOKIE)?.value,
  );
  const ctgSession = readCustomerSession(
    store.get(CTG_ONE_SESSION_COOKIE)?.value,
  );

  let email: string | null = null;

  if (localSession) {
    const account = await prisma.cliente.findUnique({
      where: { id: localSession.sub },
      select: { activo: true, email: true },
    });

    if (!account?.activo) return anonymousContext();
    email = account.email.trim().toLowerCase();
  } else if (ctgSession) {
    email = ctgSession.email.trim().toLowerCase();
  }

  if (!email) return anonymousContext();

  const profile = await findCrmCustomerByEmail(email);
  if (!profile) {
    return buildConciergeLifecycleGuidance({
      authenticated: true,
      stage: "PROSPECT",
      deliveredOrders: 0,
      loyaltyPoints: 0,
      favorites: [],
    });
  }

  const deliveredFilter = {
    customerProfileId: profile.id,
    estado: "ENTREGADO" as const,
    pago: { is: { estado: "APROBADO" as const } },
  };

  const [deliveredOrders, loyalty, recentDelivered] = await Promise.all([
    prisma.pedido.count({ where: deliveredFilter }),
    prisma.customerLoyaltyEntry.aggregate({
      where: { customerProfileId: profile.id },
      _sum: { points: true },
    }),
    prisma.pedido.findMany({
      where: deliveredFilter,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        items: {
          select: {
            cantidad: true,
            producto: {
              select: {
                nombre: true,
                disponible: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const loyaltyPoints = loyalty._sum.points ?? 0;
  const lifecycle = classifyCustomerLifecycle({
    deliveredOrders,
    loyaltyPoints,
    lastActivityAt: profile.lastActivityAt,
    marketingConsent: profile.marketingConsent,
    hasContact: Boolean(profile.emailNormalized || profile.phoneNormalized),
  });

  const favoriteCounts = new Map<string, number>();
  for (const order of recentDelivered) {
    for (const item of order.items) {
      if (!item.producto.disponible) continue;
      favoriteCounts.set(
        item.producto.nombre,
        (favoriteCounts.get(item.producto.nombre) ?? 0) + item.cantidad,
      );
    }
  }

  const favorites = [...favoriteCounts.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 4);

  return buildConciergeLifecycleGuidance({
    authenticated: true,
    stage: lifecycle.stage,
    deliveredOrders,
    loyaltyPoints,
    favorites,
  });
}
