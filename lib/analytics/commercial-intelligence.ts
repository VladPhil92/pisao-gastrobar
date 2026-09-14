import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;
const TIME_ZONE = "America/Bogota";

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function localWeekday(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    weekday: "short",
  })
    .format(date)
    .replace(".", "")
    .toLowerCase();
}

function localHour(date: Date) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(value);
}

function reservationHour(value: string) {
  const [hour] = value.split(":");
  return Number(hour);
}

function slotForHour(hour: number) {
  if (hour >= 14 && hour <= 16) return "Tarde";
  if (hour >= 17 && hour <= 19) return "Cena";
  if (hour >= 20 && hour <= 23) return "Noche";
  return null;
}

const paymentLabels: Record<string, string> = {
  QR_TRANSFERENCIA: "QR / transferencia",
  CRIPTO: "Cripto",
  TARJETA: "Tarjeta",
};

export async function getCommercialIntelligence() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since14 = new Date(now.getTime() - 14 * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);

  try {
    const [orders, reservations] = await Promise.all([
      prisma.pedido.findMany({
        where: { createdAt: { gte: since30 } },
        select: {
          id: true,
          estado: true,
          tipoEntrega: true,
          subtotal: true,
          descuento: true,
          total: true,
          createdAt: true,
          pago: { select: { metodo: true, estado: true } },
          items: {
            select: {
              cantidad: true,
              subtotal: true,
              producto: {
                select: {
                  nombre: true,
                  categoria: { select: { nombre: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.reserva.findMany({
        where: {
          OR: [
            { createdAt: { gte: since30 } },
            { fecha: { gte: since30, lte: now } },
          ],
        },
        select: {
          estado: true,
          personas: true,
          fecha: true,
          hora: true,
          createdAt: true,
        },
      }),
    ]);

    const paymentStarted = orders.filter((order) => order.pago);
    const paidOrders = orders.filter((order) => order.pago?.estado === "APROBADO");
    const deliveredOrders = orders.filter((order) => order.estado === "ENTREGADO");
    const cancelledOrders = orders.filter((order) => order.estado === "CANCELADO");

    const revenue30 = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const revenue7 = paidOrders
      .filter((order) => order.createdAt >= since7)
      .reduce((sum, order) => sum + Number(order.total), 0);
    const revenuePrev7 = paidOrders
      .filter((order) => order.createdAt >= since14 && order.createdAt < since7)
      .reduce((sum, order) => sum + Number(order.total), 0);

    const paid7 = paidOrders.filter((order) => order.createdAt >= since7).length;
    const paidPrev7 = paidOrders.filter(
      (order) => order.createdAt >= since14 && order.createdAt < since7,
    ).length;

    const paymentApprovalRate = paymentStarted.length
      ? Math.round((paidOrders.length / paymentStarted.length) * 100)
      : 0;
    const fulfillmentRate = orders.length
      ? Math.round((deliveredOrders.length / orders.length) * 100)
      : 0;
    const cancellationRate = orders.length
      ? Math.round((cancelledOrders.length / orders.length) * 100)
      : 0;

    const averageTicket = paidOrders.length ? Math.round(revenue30 / paidOrders.length) : 0;
    const discounts = paidOrders.reduce(
      (sum, order) => sum + Number(order.descuento),
      0,
    );

    const delivery = paidOrders.filter((order) => order.tipoEntrega === "DOMICILIO").length;
    const pickup = paidOrders.filter((order) => order.tipoEntrega === "RECOGIDA").length;

    const paymentMap = new Map<string, { count: number; revenue: number }>();
    for (const order of paidOrders) {
      if (!order.pago) continue;
      const current = paymentMap.get(order.pago.metodo) ?? { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number(order.total);
      paymentMap.set(order.pago.metodo, current);
    }
    const paymentMethods = [...paymentMap.entries()]
      .map(([method, value]) => ({
        method,
        label: paymentLabels[method] ?? method,
        ...value,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const productMap = new Map<
      string,
      { name: string; category: string; units: number; revenue: number }
    >();
    const categoryMap = new Map<string, { name: string; units: number; revenue: number }>();

    for (const order of paidOrders) {
      for (const item of order.items) {
        const productKey = item.producto.nombre;
        const product = productMap.get(productKey) ?? {
          name: item.producto.nombre,
          category: item.producto.categoria.nombre,
          units: 0,
          revenue: 0,
        };
        product.units += item.cantidad;
        product.revenue += Number(item.subtotal);
        productMap.set(productKey, product);

        const categoryKey = item.producto.categoria.slug;
        const category = categoryMap.get(categoryKey) ?? {
          name: item.producto.categoria.nombre,
          units: 0,
          revenue: 0,
        };
        category.units += item.cantidad;
        category.revenue += Number(item.subtotal);
        categoryMap.set(categoryKey, category);
      }
    }

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
      .slice(0, 5);
    const topCategories = [...categoryMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const dailySales = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getTime() - (6 - index) * DAY_MS);
      const key = localDateKey(date);
      const label = new Intl.DateTimeFormat("es-CO", {
        timeZone: TIME_ZONE,
        weekday: "short",
        day: "numeric",
      }).format(date);
      const dayOrders = paidOrders.filter((order) => localDateKey(order.createdAt) === key);
      return {
        key,
        label,
        revenue: dayOrders.reduce((sum, order) => sum + Number(order.total), 0),
        orders: dayOrders.length,
      };
    });

    const reservationCreated30 = reservations.filter(
      (reservation) => reservation.createdAt >= since30,
    );
    const reservationConfirmed = reservationCreated30.filter((reservation) =>
      ["CONFIRMADA", "COMPLETADA"].includes(reservation.estado),
    );
    const reservationCompleted = reservationCreated30.filter(
      (reservation) => reservation.estado === "COMPLETADA",
    );
    const reservationCancelled = reservationCreated30.filter(
      (reservation) => reservation.estado === "CANCELADA",
    );
    const reservationConfirmationRate = reservationCreated30.length
      ? Math.round((reservationConfirmed.length / reservationCreated30.length) * 100)
      : 0;
    const reservedPeople = reservationConfirmed.reduce(
      (sum, reservation) => sum + reservation.personas,
      0,
    );

    const weekdayOrder: Record<string, number> = {
      lun: 0,
      mar: 1,
      mié: 2,
      jue: 3,
      vie: 4,
      sáb: 5,
      dom: 6,
    };
    const demand = new Map<
      string,
      { day: string; slot: string; orders: number; reservedPeople: number; score: number }
    >();

    const touchDemand = (day: string, slot: string) => {
      const key = `${day}-${slot}`;
      const current = demand.get(key) ?? {
        day,
        slot,
        orders: 0,
        reservedPeople: 0,
        score: 0,
      };
      demand.set(key, current);
      return current;
    };

    for (const order of paidOrders) {
      const slot = slotForHour(localHour(order.createdAt));
      if (!slot) continue;
      const point = touchDemand(localWeekday(order.createdAt), slot);
      point.orders += 1;
      point.score += 2;
    }

    for (const reservation of reservations.filter(
      (item) =>
        item.fecha >= since30 &&
        item.fecha <= now &&
        ["CONFIRMADA", "COMPLETADA"].includes(item.estado),
    )) {
      const slot = slotForHour(reservationHour(reservation.hora));
      if (!slot) continue;
      const point = touchDemand(localWeekday(reservation.fecha), slot);
      point.reservedPeople += reservation.personas;
      point.score += reservation.personas;
    }

    const demandRadar = [...demand.values()].sort(
      (a, b) =>
        (weekdayOrder[a.day] ?? 99) - (weekdayOrder[b.day] ?? 99) ||
        ["Tarde", "Cena", "Noche"].indexOf(a.slot) -
          ["Tarde", "Cena", "Noche"].indexOf(b.slot),
    );
    const maxDemandScore = Math.max(1, ...demandRadar.map((point) => point.score));

    const funnel = [
      { label: "Pedido creado", value: orders.length, rate: 100 },
      {
        label: "Pago iniciado",
        value: paymentStarted.length,
        rate: orders.length ? Math.round((paymentStarted.length / orders.length) * 100) : 0,
      },
      {
        label: "Pago aprobado",
        value: paidOrders.length,
        rate: orders.length ? Math.round((paidOrders.length / orders.length) * 100) : 0,
      },
      {
        label: "Entregado",
        value: deliveredOrders.length,
        rate: orders.length ? Math.round((deliveredOrders.length / orders.length) * 100) : 0,
      },
    ];

    const signals: Array<{ tone: "positive" | "attention" | "neutral"; title: string; detail: string }> = [];
    if (revenue7 > revenuePrev7) {
      signals.push({
        tone: "positive",
        title: "Ventas semanales en crecimiento",
        detail: `La facturación aprobada de los últimos 7 días está ${pctChange(revenue7, revenuePrev7)}% por encima del período anterior.`,
      });
    } else if (revenuePrev7 > 0) {
      signals.push({
        tone: "attention",
        title: "Ventas semanales por debajo del período anterior",
        detail: `La facturación aprobada de los últimos 7 días varía ${pctChange(revenue7, revenuePrev7)}% frente a los 7 días previos.`,
      });
    }
    if (paymentStarted.length >= 3 && paymentApprovalRate < 70) {
      signals.push({
        tone: "attention",
        title: "Fricción entre pago iniciado y aprobado",
        detail: `Solo ${paymentApprovalRate}% de los pagos iniciados terminaron aprobados en la ventana observada.`,
      });
    }
    if (orders.length >= 5 && cancellationRate >= 15) {
      signals.push({
        tone: "attention",
        title: "Cancelaciones a revisar",
        detail: `${cancellationRate}% de los pedidos creados terminó cancelado. Conviene revisar causa, método de pago y operación.`,
      });
    }
    if (reservationCreated30.length >= 3 && reservationConfirmationRate < 70) {
      signals.push({
        tone: "attention",
        title: "Solicitudes de reserva sin confirmar",
        detail: `${reservationConfirmationRate}% de las solicitudes recientes llegó a estado confirmada o completada.`,
      });
    }
    if (signals.length === 0) {
      signals.push({
        tone: "neutral",
        title: "Aún no hay una señal dominante",
        detail: "El tablero seguirá acumulando evidencia transaccional. Las conclusiones se muestran solo cuando existe volumen suficiente.",
      });
    }

    return {
      connected: true as const,
      windowDays: 30,
      revenue30,
      revenue7,
      revenueGrowth7: pctChange(revenue7, revenuePrev7),
      paidOrders: paidOrders.length,
      paidOrdersGrowth7: pctChange(paid7, paidPrev7),
      averageTicket,
      discounts,
      paymentApprovalRate,
      fulfillmentRate,
      cancellationRate,
      delivery,
      pickup,
      funnel,
      paymentMethods,
      topProducts,
      topCategories,
      dailySales,
      reservations: {
        requested: reservationCreated30.length,
        confirmed: reservationConfirmed.length,
        completed: reservationCompleted.length,
        cancelled: reservationCancelled.length,
        confirmationRate: reservationConfirmationRate,
        reservedPeople,
      },
      demandRadar,
      maxDemandScore,
      signals,
    };
  } catch {
    return {
      connected: false as const,
      windowDays: 30,
      revenue30: 0,
      revenue7: 0,
      revenueGrowth7: 0,
      paidOrders: 0,
      paidOrdersGrowth7: 0,
      averageTicket: 0,
      discounts: 0,
      paymentApprovalRate: 0,
      fulfillmentRate: 0,
      cancellationRate: 0,
      delivery: 0,
      pickup: 0,
      funnel: [],
      paymentMethods: [],
      topProducts: [],
      topCategories: [],
      dailySales: [],
      reservations: {
        requested: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        confirmationRate: 0,
        reservedPeople: 0,
      },
      demandRadar: [],
      maxDemandScore: 1,
      signals: [],
    };
  }
}
