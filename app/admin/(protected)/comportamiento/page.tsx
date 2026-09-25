import {
  Activity,
  Eye,
  Gauge,
  MousePointerClick,
  Smartphone,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getBehavioralIntelligence } from "@/lib/analytics/behavioral-intelligence";

function slugLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moneyCop(value: number) {
  return `${Math.round(value).toLocaleString("es-CO")}`;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-pisao-gold/10 bg-pisao-noche/50 p-5 text-sm text-pisao-cream-muted">
      {children}
    </div>
  );
}

export default async function AdminComportamientoPage() {
  await requireAdminRoute("/admin/comportamiento");
  const data = await getBehavioralIntelligence();
  const finalFunnelRate = data.funnel.at(-1)?.rate ?? 0;
  const maxProductSignal = Math.max(
    1,
    ...data.productInterest.map((item) => item.views + item.adds * 2),
  );

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
            Behavioral Intelligence V9
          </p>
          <h1 className="font-display mt-2 text-3xl text-pisao-cream sm:text-4xl">
            Cómo se mueve la intención
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Señales first-party del recorrido digital: qué abre la gente, qué productos consulta, qué agrega a la mesa y dónde abandona antes de crear un pedido.
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-4 py-3 text-xs text-pisao-cream-muted">
          <span className="font-semibold text-pisao-cream">Privacidad:</span> sesiones efímeras por pestaña, sin nombre, teléfono, correo, dirección, cookies de seguimiento ni texto libre.
        </div>
      </div>

      {!data.connected && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          La tabla de Behavioral Intelligence aún no está accesible. El panel quedará disponible cuando la migración V9 se aplique a PostgreSQL.
        </div>
      )}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <Users className="size-5 text-pisao-gold" />
          <p className="mt-5 text-xs text-pisao-cream-muted">Sesiones públicas · 30 días</p>
          <p className="font-display mt-1 text-3xl text-pisao-cream">{data.sessions}</p>
          <p className="mt-2 text-xs text-pisao-cream-muted">Últimos 7 días: {data.sessions7}</p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <Activity className="size-5 text-pisao-gold" />
          <p className="mt-5 text-xs text-pisao-cream-muted">Eventos observados</p>
          <p className="font-display mt-1 text-3xl text-pisao-cream">{data.totalEvents}</p>
          <p className="mt-2 text-xs text-pisao-cream-muted">{data.averageEventsPerSession} señales por sesión.</p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <Target className="size-5 text-pisao-gold" />
          <p className="mt-5 text-xs text-pisao-cream-muted">Sesión → pedido creado</p>
          <p className="font-display mt-1 text-3xl text-pisao-gold">{finalFunnelRate}%</p>
          <p className="mt-2 text-xs text-pisao-cream-muted">No equivale a pago aprobado; esa señal vive en Reportes.</p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <Sparkles className="size-5 text-pisao-gold" />
          <p className="mt-5 text-xs text-pisao-cream-muted">Modo Plan abierto</p>
          <p className="font-display mt-1 text-3xl text-pisao-cream">{data.assists.planOpenSessions}</p>
          <p className="mt-2 text-xs text-pisao-cream-muted">Propuestas agregadas: {data.assists.planProposalSessions}</p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
              Contextual Commerce V20
            </p>
            <h2 className="font-display mt-2 text-2xl text-pisao-cream">
              De sugerencia a resultado observado
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-pisao-cream-muted">
              Mide recomendaciones contextuales del Concierge sin texto de chat ni PII. V20 solo incorpora aprendizaje al ranking cuando existe muestra suficiente y con influencia acotada. Un “match pago” significa que la misma sesión compró el mismo producto sugerido dentro de la ventana first-party; no demuestra causalidad.
            </p>
          </div>
          <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 px-4 py-3 text-xs text-pisao-cream-muted">
            Ventana de resultado: <span className="font-semibold text-pisao-cream">12 horas</span>
            <span className="mx-2 text-pisao-gold/40">·</span>
            Mínimo adaptativo: <span className="font-semibold text-pisao-cream">{data.closedLoop.minExposures} exposiciones</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Exposiciones", data.contextualLearning.exposures],
            ["Agregados explícitos", data.contextualLearning.accepted],
            ["Add / view", `${data.contextualLearning.addRatePct}%`],
            ["Pedidos pagos con match", data.contextualLearning.matchedPaidOrders],
            ["Productos habilitados V20", data.closedLoop.eligibleProducts],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 p-4"
            >
              <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
                {label}
              </p>
              <p className="font-display mt-2 text-2xl text-pisao-gold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
          <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/50 p-5">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Producto sugerido comprado
            </p>
            <p className="font-display mt-2 text-3xl text-pisao-cream">
              {moneyCop(data.contextualLearning.matchedProductRevenueCop)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">
              {data.contextualLearning.matchedPaidUnits} unidad(es) observada(s) en pedidos pagos. Tasa exposición → match pago: {data.contextualLearning.paidMatchRatePct}%.
            </p>
          </div>

          <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/50 p-5">
            <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              Productos con señal contextual
            </p>
            {data.contextualLearning.products.length ? (
              <div className="mt-3 divide-y divide-pisao-gold/10">
                {data.contextualLearning.products.slice(0, 6).map((item) => (
                  <div
                    key={item.productSlug}
                    className="flex flex-col gap-1 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-pisao-cream">
                        {slugLabel(item.productSlug)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-pisao-cream-muted">
                        {item.exposures} view · {item.accepted} add · {item.matchedPaidOrders} match pago
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="font-semibold text-pisao-gold">
                        {item.addRatePct}% add/view
                      </p>
                      <p className="mt-0.5 text-[10px] text-pisao-cream-muted">
                        {moneyCop(item.matchedProductRevenueCop)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3">
                <EmptyState>
                  V20 empezará en modo base y activará aprendizaje por producto cuando cada señal alcance la muestra mínima.
                </EmptyState>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Embudo conductual</p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">De visita a pedido creado</h2>
            </div>
            <MousePointerClick className="size-5 text-pisao-gold" />
          </div>

          {data.funnel.length ? (
            <div className="mt-6 space-y-4">
              {data.funnel.map((step, index) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pisao-gold/10 text-[10px] font-bold text-pisao-gold">{index + 1}</span>
                      <span className="truncate font-semibold text-pisao-cream">{step.label}</span>
                    </div>
                    <span className="shrink-0 text-pisao-cream-muted">{step.value} · {step.rate}% total · {step.stepRate}% paso</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-pisao-gold" style={{ width: `${Math.max(step.value ? 2 : 0, step.rate)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>La línea base aparecerá con las primeras sesiones posteriores a V9.</EmptyState></div>
          )}
        </article>

        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Asistencias</p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">Herramientas que ayudan a decidir</h2>
            </div>
            <Gauge className="size-5 text-pisao-gold" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ["Modo Plan", data.assists.planOpenSessions],
              ["Plan → mesa", data.assists.planProposalSessions],
              ["Mesa Visual", data.assists.tableOpenSessions],
              ["Sugerencia → mesa", data.assists.tableSuggestionSessions],
              ["Concierge", data.assists.conciergeSessions],
              ["WhatsApp", data.assists.whatsappSessions],
              ["Reserva iniciada", data.assists.reservationStartSessions],
              ["Reserva enviada", data.assists.reservationSuccessSessions],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 p-4">
                <p className="text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">{label}</p>
                <p className="font-display mt-2 text-2xl text-pisao-gold">{value}</p>
                <p className="mt-1 text-[10px] text-pisao-cream-muted">sesiones</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Interés de producto</p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">Lo que atrae antes de vender</h2>
            </div>
            <Eye className="size-5 text-pisao-gold" />
          </div>

          {data.productInterest.length ? (
            <div className="mt-5 space-y-4">
              {data.productInterest.map((item) => {
                const score = item.views + item.adds * 2;
                const width = Math.round((score / maxProductSignal) * 100);
                return (
                  <div key={item.slug}>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-pisao-cream">{slugLabel(item.slug)}</p>
                        <p className="mt-0.5 text-[10px] text-pisao-cream-muted">{item.views} vistas · {item.adds} agregados · {item.sessions} sesiones</p>
                      </div>
                      <span className="shrink-0 font-semibold text-pisao-gold">{item.addRate}% add/view</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-pisao-gold/75" style={{ width: `${Math.max(4, width)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5"><EmptyState>Aún no hay suficientes vistas o agregados de producto.</EmptyState></div>
          )}
        </article>

        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">Contexto</p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">Categorías y dispositivos</h2>
            </div>
            <Smartphone className="size-5 text-pisao-gold" />
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">Categorías con señal</p>
            {data.categoryInterest.length ? (
              <div className="mt-3 divide-y divide-pisao-gold/10">
                {data.categoryInterest.slice(0, 5).map((item) => (
                  <div key={item.slug} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <span className="font-semibold text-pisao-cream">{slugLabel(item.slug)}</span>
                    <span className="text-pisao-cream-muted">{item.filters} filtros · {item.adds} agregados</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3"><EmptyState>Sin filtros de categoría observados todavía.</EmptyState></div>
            )}
          </div>

          <div className="mt-6 border-t border-pisao-gold/10 pt-5">
            <p className="text-[10px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">Sesiones por dispositivo</p>
            <div className="mt-3 space-y-3">
              {data.devices.map((item) => (
                <div key={item.device} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold capitalize text-pisao-cream">{item.device}</span>
                  <span className="text-pisao-cream-muted">{item.sessions} · {item.share}%</span>
                </div>
              ))}
              {!data.devices.length && <EmptyState>Sin sesiones clasificadas.</EmptyState>}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex items-center gap-2 text-pisao-gold">
          <Sparkles className="size-4" />
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">Señales automáticas</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {data.signals.map((signal) => (
            <article
              key={`${signal.title}-${signal.detail}`}
              className={`rounded-2xl border p-4 ${
                signal.tone === "positive"
                  ? "border-emerald-400/20 bg-emerald-400/5"
                  : signal.tone === "attention"
                    ? "border-amber-400/20 bg-amber-400/5"
                    : "border-pisao-gold/10 bg-pisao-noche/50"
              }`}
            >
              <p className="text-sm font-semibold text-pisao-cream">{signal.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">{signal.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
