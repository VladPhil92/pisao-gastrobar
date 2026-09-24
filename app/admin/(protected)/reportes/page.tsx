import {
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
  Activity,
  BadgeCheck,
  Bike,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { getCommercialIntelligence } from "@/lib/analytics/commercial-intelligence";
import { formatCurrency } from "@/lib/utils";

const DAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const SLOTS = ["Tarde", "Cena", "Noche"];

function pctLabel(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function RateBadge({ value }: { value: number }) {
  const positive = value > 0;
  const Icon = positive ? TrendingUp : value < 0 ? TrendingDown : Activity;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        positive
          ? "bg-emerald-500/10 text-emerald-300"
          : value < 0
            ? "bg-amber-500/10 text-amber-300"
            : "bg-white/5 text-pisao-cream-muted"
      }`}
    >
      <Icon className="size-3" />
      {pctLabel(value)} vs. 7 días previos
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-pisao-gold/10 bg-pisao-noche/50 rounded-2xl border border-dashed p-5 text-sm text-pisao-cream-muted">
      {children}
    </div>
  );
}

export default async function AdminReportesPage() {
  await requireAdminRoute("/admin/reportes");
  const data = await getCommercialIntelligence();
  const maxDailyRevenue = Math.max(1, ...data.dailySales.map((day) => day.revenue));
  const totalFulfillment = data.delivery + data.pickup;
  const deliveryPct = totalFulfillment
    ? Math.round((data.delivery / totalFulfillment) * 100)
    : 0;
  const pickupPct = totalFulfillment ? 100 - deliveryPct : 0;

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
            Conversion Intelligence V5
          </p>
          <h1 className="font-display text-pisao-cream mt-2 text-3xl sm:text-4xl">
            Pulso comercial PISÁO
          </h1>
          <p className="text-pisao-cream-muted mt-2 max-w-2xl text-sm leading-relaxed">
            Evidencia transaccional de los últimos {data.windowDays} días. Sin datos personales: ventas, embudo de pedidos, reservas, producto, métodos de pago y señales de demanda.
          </p>
        </div>
        <div className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-2xl border px-4 py-3 text-xs text-pisao-cream-muted">
          <span className="font-semibold text-pisao-cream">Fuente:</span> pedidos, pagos, items y reservas reales.
        </div>
      </div>

      {!data.connected && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          No hay conexión disponible a la base de datos. El tablero permanecerá en cero hasta que DATABASE_URL sea accesible.
        </div>
      )}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <CircleDollarSign className="size-5 text-pisao-gold" />
            <RateBadge value={data.revenueGrowth7} />
          </div>
          <p className="text-pisao-cream-muted mt-5 text-xs">Ventas aprobadas · 30 días</p>
          <p className="font-display text-pisao-gold mt-1 text-3xl">{formatCurrency(data.revenue30)}</p>
          <p className="text-pisao-cream-muted mt-2 text-xs">
            Últimos 7 días: {formatCurrency(data.revenue7)}
          </p>
        </article>

        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <ReceiptText className="size-5 text-pisao-gold" />
            <RateBadge value={data.paidOrdersGrowth7} />
          </div>
          <p className="text-pisao-cream-muted mt-5 text-xs">Pedidos con pago aprobado</p>
          <p className="font-display text-pisao-cream mt-1 text-3xl">{data.paidOrders}</p>
          <p className="text-pisao-cream-muted mt-2 text-xs">Ticket promedio: {formatCurrency(data.averageTicket)}</p>
        </article>

        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <BadgeCheck className="size-5 text-pisao-gold" />
            <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[11px] font-semibold text-pisao-gold">
              {data.paymentApprovalRate}%
            </span>
          </div>
          <p className="text-pisao-cream-muted mt-5 text-xs">Aprobación de pago</p>
          <p className="font-display text-pisao-cream mt-1 text-3xl">{data.paymentApprovalRate}%</p>
          <p className="text-pisao-cream-muted mt-2 text-xs">De pago iniciado a pago aprobado.</p>
        </article>

        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <CalendarDays className="size-5 text-pisao-gold" />
            <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[11px] font-semibold text-pisao-gold">
              {data.reservations.confirmationRate}%
            </span>
          </div>
          <p className="text-pisao-cream-muted mt-5 text-xs">Reservas confirmadas / completadas</p>
          <p className="font-display text-pisao-cream mt-1 text-3xl">{data.reservations.confirmed}</p>
          <p className="text-pisao-cream-muted mt-2 text-xs">
            {data.reservations.reservedPeople} personas asociadas a reservas confirmadas.
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-pisao-gold/15 bg-[linear-gradient(135deg,rgba(199,154,58,.10),rgba(17,17,17,.94))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
              Revenue Attribution · first-party
            </p>
            <h2 className="font-display mt-2 text-2xl text-pisao-cream sm:text-3xl">
              Qué experiencias aparecen antes de una venta pagada
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-pisao-cream-muted">
              La atribución se calcula en servidor usando la sesión efímera y eventos observados antes del pedido. Una asistencia indica participación en el recorrido; no demuestra que esa herramienta haya causado la compra.
            </p>
          </div>
          <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/70 px-4 py-3 text-xs text-pisao-cream-muted">
            <span className="font-semibold text-pisao-cream">Cobertura:</span>{" "}
            {data.attribution.coveragePct}% de los pagos aprobados de la ventana ya tiene sesión atribuible.
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/70 p-4">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Ingreso asistido observado
            </p>
            <p className="font-display mt-2 text-2xl text-pisao-gold">
              {formatCurrency(data.attribution.assistedRevenue)}
            </p>
            <p className="mt-1 text-xs text-pisao-cream-muted">
              {data.attribution.assistedOrders} pedidos pagados con al menos una asistencia.
            </p>
          </article>

          <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/70 p-4">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Concierge asistió
            </p>
            <p className="font-display mt-2 text-2xl text-pisao-gold">
              {formatCurrency(data.attribution.conciergeAssistedRevenue)}
            </p>
            <p className="mt-1 text-xs text-pisao-cream-muted">
              {data.attribution.conciergeAssistedOrders} pedidos pagados con señal de Concierge.
            </p>
          </article>

          <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/70 p-4">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Ticket · sesiones asistidas
            </p>
            <p className="font-display mt-2 text-2xl text-pisao-cream">
              {formatCurrency(data.attribution.assistedAverageTicket)}
            </p>
            <p className="mt-1 text-xs text-pisao-cream-muted">
              Solo pedidos con pago aprobado y trazabilidad nueva.
            </p>
          </article>

          <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/70 p-4">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Ticket · sesiones directas
            </p>
            <p className="font-display mt-2 text-2xl text-pisao-cream">
              {formatCurrency(data.attribution.directTrackedAverageTicket)}
            </p>
            <p className="mt-1 text-xs text-pisao-cream-muted">
              {data.attribution.directTrackedOrders} pagos rastreados sin asistencia observada.
            </p>
          </article>
        </div>

        <div className="mt-6 border-t border-pisao-gold/10 pt-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">
                Asistencias por superficie
              </p>
              <p className="mt-1 text-xs text-pisao-cream-muted">
                Multi-touch: un mismo pedido puede aparecer en varias superficies; estos ingresos no deben sumarse entre sí.
              </p>
            </div>
            <p className="text-xs text-pisao-cream-muted">
              {data.attribution.trackedOrders} pagos trazados · {formatCurrency(data.attribution.trackedRevenue)}
            </p>
          </div>

          {data.attribution.assistBreakdown.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.attribution.assistBreakdown.map((assist) => {
                const maxRevenue = Math.max(
                  1,
                  ...data.attribution.assistBreakdown.map((item) => item.revenue),
                );
                const width = Math.round((assist.revenue / maxRevenue) * 100);
                return (
                  <div
                    key={assist.assist}
                    className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-pisao-cream">{assist.label}</p>
                        <p className="mt-1 text-[11px] text-pisao-cream-muted">{assist.orders} pedidos pagados asistidos</p>
                      </div>
                      <p className="text-xs font-semibold text-pisao-gold">{formatCurrency(assist.revenue)}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-pisao-gold"
                        style={{ width: `${Math.max(4, width)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState>
                La atribución empieza con los pedidos creados después de esta fase. Los pedidos históricos permanecen sin reclasificar para no inventar señales.
              </EmptyState>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Embudo transaccional</p>
              <h2 className="font-display text-pisao-cream mt-2 text-2xl">De intención a pedido entregado</h2>
            </div>
            <ShoppingBag className="size-5 text-pisao-gold" />
          </div>

          {data.funnel.length ? (
            <div className="mt-6 space-y-4">
              {data.funnel.map((step, index) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-pisao-gold/10 text-[10px] font-bold text-pisao-gold">{index + 1}</span>
                      <span className="font-semibold text-pisao-cream">{step.label}</span>
                    </div>
                    <span className="text-pisao-cream-muted">{step.value} · {step.rate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-pisao-gold transition-all" style={{ width: `${Math.max(2, step.rate)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>Aún no hay pedidos suficientes para construir el embudo.</EmptyState></div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-pisao-gold/10 pt-5 text-center">
            <div>
              <p className="text-pisao-cream-muted text-[10px] uppercase">Entrega</p>
              <p className="mt-1 font-semibold text-pisao-cream">{data.fulfillmentRate}%</p>
            </div>
            <div>
              <p className="text-pisao-cream-muted text-[10px] uppercase">Cancelación</p>
              <p className="mt-1 font-semibold text-pisao-cream">{data.cancellationRate}%</p>
            </div>
            <div>
              <p className="text-pisao-cream-muted text-[10px] uppercase">Descuentos</p>
              <p className="mt-1 font-semibold text-pisao-cream">{formatCurrency(data.discounts)}</p>
            </div>
          </div>
        </article>

        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Ventas recientes</p>
              <h2 className="font-display text-pisao-cream mt-2 text-2xl">Últimos 7 días</h2>
            </div>
            <Activity className="size-5 text-pisao-gold" />
          </div>

          {data.dailySales.length ? (
            <div className="mt-6 space-y-4">
              {data.dailySales.map((day) => {
                const width = Math.round((day.revenue / maxDailyRevenue) * 100);
                return (
                  <div key={day.key} className="grid grid-cols-[70px_1fr_auto] items-center gap-3">
                    <span className="text-xs font-semibold capitalize text-pisao-cream">{day.label}</span>
                    <div className="h-8 overflow-hidden rounded-lg bg-white/[.035]">
                      <div className="flex h-full min-w-1 items-center rounded-lg bg-pisao-gold/15 px-2" style={{ width: `${Math.max(day.revenue ? 8 : 1, width)}%` }}>
                        {day.orders > 0 && <span className="text-[10px] font-semibold text-pisao-gold">{day.orders}</span>}
                      </div>
                    </div>
                    <span className="min-w-24 text-right text-xs font-semibold text-pisao-cream">{formatCurrency(day.revenue)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>No hay ventas aprobadas en esta ventana.</EmptyState></div>
          )}
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Producto</p>
              <h2 className="font-display text-pisao-cream mt-2 text-2xl">Qué está generando ingresos</h2>
            </div>
            <PackageCheck className="size-5 text-pisao-gold" />
          </div>
          {data.topProducts.length ? (
            <div className="mt-5 divide-y divide-pisao-gold/10">
              {data.topProducts.map((product, index) => (
                <div key={product.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 py-3">
                  <span className="text-xs font-bold text-pisao-gold">#{index + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-pisao-cream">{product.name}</p>
                    <p className="text-[11px] text-pisao-cream-muted">{product.category} · {product.units} unidades</p>
                  </div>
                  <p className="text-xs font-semibold text-pisao-cream">{formatCurrency(product.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>Los rankings aparecerán cuando existan pagos aprobados con items asociados.</EmptyState></div>
          )}
        </article>

        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Mix de carta</p>
              <h2 className="font-display text-pisao-cream mt-2 text-2xl">Categorías que monetizan</h2>
            </div>
            <WalletCards className="size-5 text-pisao-gold" />
          </div>
          {data.topCategories.length ? (
            <div className="mt-5 space-y-4">
              {data.topCategories.map((category) => {
                const share = data.revenue30 ? Math.round((category.revenue / data.revenue30) * 100) : 0;
                return (
                  <div key={category.name}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-pisao-cream">{category.name}</span>
                      <span className="text-pisao-cream-muted">{category.units} uds · {formatCurrency(category.revenue)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-pisao-gold" style={{ width: `${Math.max(2, Math.min(100, share))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>Aún no existe mezcla de ventas suficiente para comparar categorías.</EmptyState></div>
          )}
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Factor operativo innovador</p>
            <h2 className="font-display text-pisao-cream mt-2 text-2xl">Radar de demanda</h2>
            <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
              Combina pedidos pagados y personas de reservas confirmadas/completadas para identificar franjas con mayor señal comercial. No representa aforo ni inventa tráfico físico.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[70px_repeat(3,1fr)] gap-2 text-center text-[10px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
                <span />
                {SLOTS.map((slot) => <span key={slot}>{slot}</span>)}
              </div>
              <div className="mt-2 space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[70px_repeat(3,1fr)] gap-2">
                    <div className="flex items-center text-xs font-semibold capitalize text-pisao-cream">{day}</div>
                    {SLOTS.map((slot) => {
                      const point = data.demandRadar.find((item) => item.day === day && item.slot === slot);
                      const strength = point ? point.score / data.maxDemandScore : 0;
                      return (
                        <div key={slot} className="relative overflow-hidden rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
                          <div className="absolute inset-y-0 left-0 bg-pisao-gold/10" style={{ width: `${Math.round(strength * 100)}%` }} />
                          <div className="relative flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-pisao-cream">{point?.score ?? 0}</p>
                              <p className="text-[10px] text-pisao-cream-muted">señal</p>
                            </div>
                            <p className="text-right text-[10px] leading-relaxed text-pisao-cream-muted">
                              {point?.orders ?? 0} ped.<br />{point?.reservedPeople ?? 0} pers.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Canal de entrega</p>
                <h2 className="font-display text-pisao-cream mt-2 text-xl">Dónde termina la compra</h2>
              </div>
              <Bike className="size-5 text-pisao-gold" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
                <Bike className="size-4 text-pisao-gold" />
                <p className="mt-3 text-2xl font-semibold text-pisao-cream">{deliveryPct}%</p>
                <p className="text-xs text-pisao-cream-muted">Domicilio · {data.delivery}</p>
              </div>
              <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
                <Store className="size-4 text-pisao-gold" />
                <p className="mt-3 text-2xl font-semibold text-pisao-cream">{pickupPct}%</p>
                <p className="text-xs text-pisao-cream-muted">Recogida · {data.pickup}</p>
              </div>
            </div>
          </article>

          <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Pago</p>
                <h2 className="font-display text-pisao-cream mt-2 text-xl">Métodos aprobados</h2>
              </div>
              <CreditCard className="size-5 text-pisao-gold" />
            </div>
            {data.paymentMethods.length ? (
              <div className="mt-4 space-y-3">
                {data.paymentMethods.map((method) => (
                  <div key={method.method} className="flex items-center justify-between gap-3 rounded-xl border border-pisao-gold/10 px-3 py-3">
                    <div>
                      <p className="text-xs font-semibold text-pisao-cream">{method.label}</p>
                      <p className="text-[10px] text-pisao-cream-muted">{method.count} pagos</p>
                    </div>
                    <p className="text-xs font-semibold text-pisao-gold">{formatCurrency(method.revenue)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4"><EmptyState>Sin pagos aprobados en la ventana.</EmptyState></div>
            )}
          </article>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <article className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Reservas</p>
              <h2 className="font-display text-pisao-cream mt-2 text-xl">Embudo de terraza</h2>
            </div>
            <Users className="size-5 text-pisao-gold" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Solicitudes", data.reservations.requested],
              ["Confirmadas", data.reservations.confirmed],
              ["Completadas", data.reservations.completed],
              ["Canceladas", data.reservations.cancelled],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
                <p className="text-2xl font-semibold text-pisao-cream">{value}</p>
                <p className="mt-1 text-xs text-pisao-cream-muted">{label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border-pisao-gold/10 bg-[linear-gradient(135deg,rgba(199,154,58,.11),rgba(17,17,17,.9))] rounded-3xl border p-5 sm:p-6">
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Señales accionables</p>
          <h2 className="font-display text-pisao-cream mt-2 text-xl">Qué merece atención</h2>
          <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
            Reglas determinísticas sobre datos observados. No son predicciones ni conclusiones inventadas por IA.
          </p>
          <div className="mt-5 space-y-3">
            {data.signals.map((signal) => (
              <div
                key={signal.title}
                className={`rounded-2xl border p-4 ${
                  signal.tone === "positive"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : signal.tone === "attention"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-pisao-gold/10 bg-pisao-noche/60"
                }`}
              >
                <p className="text-sm font-semibold text-pisao-cream">{signal.title}</p>
                <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">{signal.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
