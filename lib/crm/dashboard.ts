import "server-only";

import { prisma } from "@/lib/prisma";
import { loyaltyPolicy } from "@/lib/crm/loyalty";
import { classifyCustomerLifecycle } from "@/lib/crm/lifecycle-core";

function money(value: { toString(): string }) {
  return Number(value.toString());
}

function segmentForDeliveredOrders(count: number) {
  if (count <= 0) return "PROSPECTO";
  if (count === 1) return "PRIMERA_COMPRA";
  if (count <= 4) return "RECURRENTE";
  return "FRECUENTE";
}

export async function getCrmDashboard() {
  const profiles = await prisma.crmCustomerProfile.findMany({
    orderBy: [{ lastActivityAt: "desc" }],
    take: 200,
    include: {
      orders: {
        select: {
          id: true,
          total: true,
          estado: true,
          createdAt: true,
          pago: { select: { estado: true } },
        },
      },
      reservations: {
        select: {
          id: true,
          estado: true,
          fecha: true,
          personas: true,
          createdAt: true,
        },
      },
      loyaltyEntries: {
        select: { points: true },
      },
      accountCliente: {
        select: {
          id: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
    },
  });

  const lifecycleNow = new Date();
  const customers = profiles.map((profile) => {
    const approvedOrders = profile.orders.filter(
      (order) => order.pago?.estado === "APROBADO" && order.estado !== "CANCELADO",
    );
    const deliveredOrders = profile.orders.filter(
      (order) => order.estado === "ENTREGADO" && order.pago?.estado === "APROBADO",
    );
    const approvedSpend = approvedOrders.reduce(
      (sum, order) => sum + money(order.total),
      0,
    );
    const points = profile.loyaltyEntries.reduce(
      (sum, entry) => sum + entry.points,
      0,
    );
    const completedReservations = profile.reservations.filter(
      (reservation) => reservation.estado === "COMPLETADA",
    ).length;
    const lifecycle = classifyCustomerLifecycle(
      {
        deliveredOrders: deliveredOrders.length,
        loyaltyPoints: points,
        lastActivityAt: profile.lastActivityAt,
        marketingConsent: profile.marketingConsent,
        hasContact: Boolean(profile.emailNormalized || profile.phoneNormalized),
      },
      lifecycleNow,
    );

    return {
      id: profile.id,
      nombre: profile.nombre,
      email: profile.emailNormalized,
      telefono: profile.phoneNormalized,
      source: profile.source,
      marketingConsent: profile.marketingConsent,
      accountLinked: Boolean(profile.accountClienteId),
      emailVerified: profile.accountCliente?.emailVerified ?? false,
      lastLoginAt: profile.accountCliente?.lastLoginAt?.toISOString() ?? null,
      lastActivityAt: profile.lastActivityAt.toISOString(),
      createdAt: profile.createdAt.toISOString(),
      orders: profile.orders.length,
      approvedOrders: approvedOrders.length,
      deliveredOrders: deliveredOrders.length,
      reservations: profile.reservations.length,
      completedReservations,
      approvedSpend,
      averageTicket:
        approvedOrders.length > 0
          ? Math.round(approvedSpend / approvedOrders.length)
          : 0,
      loyaltyPoints: points,
      segment: segmentForDeliveredOrders(deliveredOrders.length),
      lifecycle,
    };
  });

  const totalApprovedSpend = customers.reduce(
    (sum, customer) => sum + customer.approvedSpend,
    0,
  );
  const repeatCustomers = customers.filter(
    (customer) => customer.deliveredOrders >= 2,
  ).length;
  const lifecycleSummary = {
    prospects: customers.filter((customer) => customer.lifecycle.stage === "PROSPECT").length,
    newCustomers: customers.filter((customer) => customer.lifecycle.stage === "NEW_CUSTOMER").length,
    active: customers.filter((customer) => customer.lifecycle.stage === "ACTIVE").length,
    loyal: customers.filter((customer) => customer.lifecycle.stage === "LOYAL").length,
    atRisk: customers.filter((customer) => customer.lifecycle.stage === "AT_RISK").length,
    dormant: customers.filter((customer) => customer.lifecycle.stage === "DORMANT").length,
    reactivationReady: customers.filter(
      (customer) =>
        customer.lifecycle.outreachAllowed &&
        ["AT_RISK", "DORMANT"].includes(customer.lifecycle.stage),
    ).length,
  };

  return {
    policy: loyaltyPolicy(),
    customers,
    summary: {
      profiles: customers.length,
      accountLinked: customers.filter((customer) => customer.accountLinked).length,
      repeatCustomers,
      totalApprovedSpend,
      loyaltyPoints: customers.reduce(
        (sum, customer) => sum + customer.loyaltyPoints,
        0,
      ),
      lifecycle: lifecycleSummary,
    },
  };
}

export async function getCrmCustomerDetail(id: string) {
  const profile = await prisma.crmCustomerProfile.findUnique({
    where: { id },
    include: {
      accountCliente: {
        select: {
          id: true,
          activo: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          pago: {
            select: {
              estado: true,
              metodo: true,
              verificadoEn: true,
            },
          },
          items: {
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
      reservations: {
        orderBy: [{ fecha: "desc" }, { hora: "desc" }],
        take: 30,
      },
      loyaltyEntries: {
        orderBy: { createdAt: "desc" },
        take: 40,
      },
    },
  });

  if (!profile) return null;

  const approvedOrders = profile.orders.filter(
    (order) => order.pago?.estado === "APROBADO" && order.estado !== "CANCELADO",
  );
  const deliveredOrders = profile.orders.filter(
    (order) => order.estado === "ENTREGADO" && order.pago?.estado === "APROBADO",
  );
  const approvedSpend = approvedOrders.reduce(
    (sum, order) => sum + money(order.total),
    0,
  );

  const productCounts = new Map<string, { nombre: string; quantity: number }>();
  for (const order of deliveredOrders) {
    for (const item of order.items) {
      const current = productCounts.get(item.producto.id);
      productCounts.set(item.producto.id, {
        nombre: item.producto.nombre,
        quantity: (current?.quantity ?? 0) + item.cantidad,
      });
    }
  }

  const favoriteProducts = [...productCounts.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return {
    policy: loyaltyPolicy(),
    profile: {
      id: profile.id,
      nombre: profile.nombre,
      email: profile.emailNormalized,
      telefono: profile.phoneNormalized,
      source: profile.source,
      marketingConsent: profile.marketingConsent,
      lastActivityAt: profile.lastActivityAt.toISOString(),
      createdAt: profile.createdAt.toISOString(),
      account: profile.accountCliente
        ? {
            activo: profile.accountCliente.activo,
            emailVerified: profile.accountCliente.emailVerified,
            lastLoginAt:
              profile.accountCliente.lastLoginAt?.toISOString() ?? null,
            createdAt: profile.accountCliente.createdAt.toISOString(),
          }
        : null,
    },
    metrics: {
      orders: profile.orders.length,
      approvedOrders: approvedOrders.length,
      deliveredOrders: deliveredOrders.length,
      approvedSpend,
      averageTicket:
        approvedOrders.length > 0
          ? Math.round(approvedSpend / approvedOrders.length)
          : 0,
      reservations: profile.reservations.length,
      completedReservations: profile.reservations.filter(
        (reservation) => reservation.estado === "COMPLETADA",
      ).length,
      loyaltyPoints: profile.loyaltyEntries.reduce(
        (sum, entry) => sum + entry.points,
        0,
      ),
      segment: segmentForDeliveredOrders(deliveredOrders.length),
    },
    favoriteProducts,
    orders: profile.orders.map((order) => ({
      id: order.id,
      numero: order.numero,
      total: money(order.total),
      estado: order.estado,
      paymentStatus: order.pago?.estado ?? null,
      paymentMethod: order.pago?.metodo ?? null,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
      })),
    })),
    reservations: profile.reservations.map((reservation) => ({
      id: reservation.id,
      fecha: reservation.fecha.toISOString(),
      hora: reservation.hora,
      personas: reservation.personas,
      estado: reservation.estado,
      mesas: reservation.mesas,
    })),
    loyalty: profile.loyaltyEntries.map((entry) => ({
      id: entry.id,
      event: entry.event,
      points: entry.points,
      amountCop: entry.amountCop ? money(entry.amountCop) : null,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
