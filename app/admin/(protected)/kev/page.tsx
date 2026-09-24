import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getKevControlPlaneSnapshot } from "@/lib/governance/kev-control-plane";
import { fetchKevIntelligenceSnapshot } from "@/lib/governance/kev-intelligence";

const stateCopy = {
  UNCONFIGURED: {
    label: "Sin configurar",
    detail: "El bridge saliente de Kev todavía no tiene configuración válida.",
    icon: CircleAlert,
  },
  READY_NO_EVIDENCE: {
    label: "Listo · sin evidencia",
    detail: "El bridge está configurado, pero todavía no hay entregas aceptadas en la ventana reciente.",
    icon: Activity,
  },
  RECEIVING: {
    label: "Recibiendo eventos",
    detail: "Existe evidencia reciente de entregas aceptadas por Kev.",
    icon: CheckCircle2,
  },
  DEGRADED: {
    label: "Degradado",
    detail: "El intento más reciente falló después de la última entrega exitosa.",
    icon: CircleAlert,
  },
} as const;

function formatDate(value: string | null) {
  if (!value) return "Sin evidencia";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export default async function KevControlPlanePage() {
  await requireAdminRoute("/admin/kev");
  const [snapshot, intelligence] = await Promise.all([
    getKevControlPlaneSnapshot(),
    fetchKevIntelligenceSnapshot(),
  ]);
  const current = stateCopy[snapshot.state];
  const StateIcon = current.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <p className="text-pisao-gold text-xs font-semibold tracking-[0.22em] uppercase">
          Kev · Governance & Orchestration
        </p>
        <h1 className="font-display text-pisao-cream mt-2 text-4xl">
          Kev Control Plane
        </h1>
        <p className="text-pisao-cream-muted mt-3 max-w-4xl text-sm leading-relaxed">
          Capa de supervisión entre PISÁO y Kev. Centraliza evidencia de gobernanza,
          visibilidad de integración y el retorno consultivo de propuestas, manteniendo
          las decisiones sensibles bajo aprobación humana.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="border-pisao-gold/15 bg-pisao-noche rounded-3xl border p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <StateIcon className="text-pisao-gold size-5" />
                <p className="text-pisao-cream text-sm font-semibold">
                  {current.label}
                </p>
              </div>
              <p className="text-pisao-cream-muted mt-2 max-w-2xl text-sm leading-relaxed">
                {current.detail}
              </p>
            </div>
            <span className="border-pisao-gold/20 bg-pisao-gold/10 text-pisao-gold rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[.12em] uppercase">
              {snapshot.mode}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
              <p className="text-pisao-cream-muted text-[10px] uppercase">Entregas 24h</p>
              <p className="font-display text-pisao-cream mt-2 text-3xl">
                {snapshot.delivered24h}
              </p>
            </div>
            <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
              <p className="text-pisao-cream-muted text-[10px] uppercase">Fallos 24h</p>
              <p className="font-display text-pisao-cream mt-2 text-3xl">
                {snapshot.failed24h}
              </p>
            </div>
            <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
              <p className="text-pisao-cream-muted text-[10px] uppercase">Propuestas Kev 7d</p>
              <p className="font-display text-pisao-cream mt-2 text-3xl">
                {snapshot.advisoryIngress7d}
              </p>
            </div>
          </div>

          <div className="text-pisao-cream-muted mt-5 grid gap-2 text-xs sm:grid-cols-2">
            <p>
              Último éxito: <span className="text-pisao-cream">{formatDate(snapshot.lastSuccessAt)}</span>
            </p>
            <p>
              Último intento: <span className="text-pisao-cream">{formatDate(snapshot.lastAttemptAt)}</span>
            </p>
            <p>
              Bridge: <span className="text-pisao-cream">{snapshot.bridgeHost ?? "no configurado"}</span>
            </p>
            <p>
              Retorno consultivo: <span className="text-pisao-cream">{snapshot.inboundEnabled ? "habilitado" : "deshabilitado"}</span>
            </p>
          </div>
        </div>

        <div className="border-pisao-green/25 bg-pisao-green/10 rounded-3xl border p-6">
          <ShieldCheck className="text-pisao-gold size-6" />
          <h2 className="font-display text-pisao-cream mt-4 text-2xl">
            Kev propone; PISÁO decide.
          </h2>
          <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed">
            El canal de retorno acepta únicamente recomendaciones firmadas. Se convierten
            en acciones PENDING y requieren aprobación administrativa antes de marcarse
            como ejecutadas.
          </p>
          <Link
            href="/admin/acciones"
            className="text-pisao-gold mt-5 inline-flex items-center gap-2 text-sm font-semibold"
          >
            Revisar acciones pendientes
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="border-pisao-gold/10 bg-pisao-noche rounded-3xl border p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.16em] uppercase">
              Kev Intelligence Mirror
            </p>
            <h2 className="font-display text-pisao-cream mt-1 text-2xl">
              Lo que Kev está observando
            </h2>
            <p className="text-pisao-cream-muted mt-2 max-w-3xl text-xs leading-relaxed">
              Snapshot agregado del Cortex de Kev. No contiene identidad de clientes,
              conversaciones ni eventos operativos crudos.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
            intelligence.available
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-amber-400/10 text-amber-300"
          }`}>
            {intelligence.available ? "Conectado" : "No disponible"}
          </span>
        </div>

        {intelligence.available ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
                <p className="text-pisao-cream-muted text-[10px] uppercase">Señales observadas</p>
                <p className="font-display text-pisao-cream mt-2 text-3xl">
                  {intelligence.data.coverage.event_count}
                </p>
                <p className="text-pisao-cream-muted mt-1 text-[10px]">
                  muestra {intelligence.data.coverage.sample_quality}
                </p>
              </div>
              <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
                <p className="text-pisao-cream-muted text-[10px] uppercase">Rechazo reservas</p>
                <p className="font-display text-pisao-cream mt-2 text-3xl">
                  {Math.round(intelligence.data.reservations.rejection_rate * 100)}%
                </p>
                <p className="text-pisao-cream-muted mt-1 text-[10px]">
                  {intelligence.data.reservations.attempts_observed} intentos
                </p>
              </div>
              <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
                <p className="text-pisao-cream-muted text-[10px] uppercase">Fallback Concierge</p>
                <p className="font-display text-pisao-cream mt-2 text-3xl">
                  {Math.round(intelligence.data.concierge.fallback_rate * 100)}%
                </p>
                <p className="text-pisao-cream-muted mt-1 text-[10px]">
                  {intelligence.data.concierge.provider_errors} errores de proveedor
                </p>
              </div>
              <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4">
                <p className="text-pisao-cream-muted text-[10px] uppercase">Cancelación pedidos</p>
                <p className="font-display text-pisao-cream mt-2 text-3xl">
                  {Math.round(intelligence.data.orders.cancellation_rate * 100)}%
                </p>
                <p className="text-pisao-cream-muted mt-1 text-[10px]">
                  {intelligence.data.orders.orders_observed} pedidos observados
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-pisao-cream text-sm font-semibold">
                  Recomendaciones actuales
                </h3>
                <span className="text-pisao-cream-muted text-[10px]">
                  Solo recomendación · sin autoridad de mutación
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {intelligence.data.recommendations.slice(0, 6).map((recommendation) => (
                  <article
                    key={recommendation.code}
                    className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-pisao-cream text-sm font-semibold">
                        {recommendation.title}
                      </h4>
                      <span className="bg-pisao-gold/10 text-pisao-gold rounded-full px-2 py-1 text-[9px] font-semibold uppercase">
                        {recommendation.priority}
                      </span>
                    </div>
                    <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
                      {recommendation.rationale}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="border-pisao-gold/10 bg-pisao-carbon-soft mt-5 rounded-2xl border p-5">
            <p className="text-pisao-cream text-sm font-semibold">
              El snapshot de inteligencia no respondió.
            </p>
            <p className="text-pisao-cream-muted mt-2 text-xs">
              Motivo técnico: {intelligence.reason}
              {intelligence.status ? ` · HTTP ${intelligence.status}` : ""}
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-pisao-gold size-5" />
          <h2 className="font-display text-pisao-cream text-2xl">Capacidades activas</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {snapshot.capabilities.map((capability) => (
            <article
              key={capability.id}
              className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-2xl border p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {capability.id === "advisory-return" ? (
                    <Workflow className="text-pisao-gold size-4" />
                  ) : (
                    <Network className="text-pisao-gold size-4" />
                  )}
                  <h3 className="text-pisao-cream text-sm font-semibold">{capability.label}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${capability.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-pisao-cream-muted"}`}>
                  {capability.enabled ? "Activo" : "Pendiente"}
                </span>
              </div>
              <p className="text-pisao-cream-muted mt-3 text-xs leading-relaxed">
                {capability.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-pisao-gold/10 bg-pisao-noche overflow-hidden rounded-3xl border">
        <div className="border-pisao-gold/10 flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-pisao-cream text-sm font-semibold">Evidencia reciente</h2>
            <p className="text-pisao-cream-muted mt-1 text-xs">
              Señales técnicas sin secretos ni datos personales.
            </p>
          </div>
          <Link href="/admin/certificacion" className="text-pisao-gold text-xs font-semibold">
            Ver certificación
          </Link>
        </div>

        <div className="divide-pisao-gold/10 divide-y">
          {snapshot.recentEvidence.length ? (
            snapshot.recentEvidence.map((item) => (
              <div key={item.id} className="grid gap-2 px-5 py-4 text-xs sm:grid-cols-[1fr_140px_180px] sm:items-center">
                <p className="text-pisao-cream font-medium">{item.event}</p>
                <p className={item.status === "SUCCESS" ? "text-emerald-300" : "text-amber-300"}>
                  {item.status}
                </p>
                <p className="text-pisao-cream-muted sm:text-right">{formatDate(item.createdAt)}</p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-pisao-cream-muted text-sm">
                Aún no hay evidencia de Kev en los últimos 7 días.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
