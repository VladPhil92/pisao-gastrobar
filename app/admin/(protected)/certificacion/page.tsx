import Link from "next/link";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { PaymentNotificationTestButton } from "@/components/admin/PaymentNotificationTestButton";
import {
  AlertTriangle,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Network,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  getProductionCertificationSummary,
  type ProductionCertificationGate,
} from "@/lib/integrations/production-certification";

export const dynamic = "force-dynamic";

const gateIcons = {
  OPENAI: Bot,
  WHATSAPP: MessageCircle,
  PAYMENT_ALERTS: BellRing,
  KEV: Network,
  CRYPTO: WalletCards,
} as const;

function stateLabel(state: ProductionCertificationGate["state"]) {
  if (state === "CERTIFIED") return "CERTIFICADA";
  if (state === "READY_FOR_TEST") return "LISTA PARA PRUEBA";
  return "BLOQUEADA";
}

function stateClass(state: ProductionCertificationGate["state"]) {
  if (state === "CERTIFIED") return "bg-emerald-500/15 text-emerald-300";
  if (state === "READY_FOR_TEST") return "bg-amber-500/15 text-amber-200";
  return "bg-red-500/15 text-red-300";
}

function overallCopy(state: "ACTION_REQUIRED" | "TESTING" | "CERTIFIED") {
  if (state === "CERTIFIED") {
    return "Las integraciones críticas tienen evidencia real dentro de la ventana de certificación.";
  }
  if (state === "ACTION_REQUIRED") {
    return "Hay al menos una integración bloqueada por configuración o onboarding externo.";
  }
  return "La infraestructura está configurada; faltan una o más pruebas reales end-to-end.";
}

export default async function ProductionCertificationPage() {
  await requireAdminRoute("/admin/certificacion");
  const summary = await getProductionCertificationSummary();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 border-b border-pisao-gold/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
            Production Certification · V1
          </p>
          <h1 className="font-display text-pisao-cream mt-2 text-4xl">
            Certificación de integraciones
          </h1>
          <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
            Distingue código desplegado, configuración productiva y evidencia
            real. Ninguna integración se marca como certificada solamente porque
            exista una ruta o una variable de entorno.
          </p>
        </div>

        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-pisao-gold size-6" />
            <div>
              <p className="text-pisao-cream text-sm font-semibold">
                {summary.certifiedCount}/{summary.totalGates} gates certificados
              </p>
              <p className="text-pisao-cream-muted mt-1 text-xs">
                Ventana: {summary.windowDays} días · {summary.overall}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex items-start gap-3">
          {summary.overall === "CERTIFIED" ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
          ) : summary.overall === "ACTION_REQUIRED" ? (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" />
          ) : (
            <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-200" />
          )}
          <div>
            <h2 className="font-display text-pisao-cream text-2xl">
              Estado global: {summary.overall}
            </h2>
            <p className="text-pisao-cream-muted mt-2 text-sm leading-relaxed">
              {overallCopy(summary.overall)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        {summary.gates.map((gate) => {
          const Icon = gateIcons[gate.id];
          return (
            <article
              key={gate.id}
              className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-pisao-gold/15 bg-pisao-noche p-2.5">
                    <Icon className="text-pisao-gold size-5" />
                  </div>
                  <div>
                    <p className="text-pisao-cream font-semibold">{gate.label}</p>
                    <p className="text-pisao-cream-muted mt-1 text-[11px]">
                      {gate.evidenceAt
                        ? `Última evidencia: ${new Date(gate.evidenceAt).toLocaleString("es-CO")}`
                        : "Sin evidencia certificante"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass(gate.state)}`}
                >
                  {stateLabel(gate.state)}
                </span>
              </div>

              <p className="text-pisao-cream-muted mt-5 text-sm leading-relaxed">
                {gate.evidence}
              </p>

              <div className="mt-5 grid gap-2">
                {gate.checks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-pisao-gold/10 bg-pisao-noche px-3 py-2.5 text-xs"
                  >
                    <span className="text-pisao-cream-muted">{check.label}</span>
                    <span
                      className={
                        check.ok ? "text-emerald-300" : "text-amber-200"
                      }
                    >
                      {check.ok ? "OK" : "PENDIENTE"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-pisao-gold/10 pt-4">
                <p className="text-pisao-gold text-[10px] font-semibold tracking-[.15em] uppercase">
                  Siguiente acción
                </p>
                <p className="text-pisao-cream mt-2 text-sm leading-relaxed">
                  {gate.nextAction}
                </p>
              </div>

              {gate.id === "WHATSAPP" && (
                <Link
                  href="/admin/whatsapp"
                  className="text-pisao-gold mt-4 inline-flex text-xs font-semibold underline"
                >
                  Abrir configuración de WhatsApp
                </Link>
              )}
              {gate.id === "CRYPTO" && (
                <Link
                  href="/admin/cripto"
                  className="text-pisao-gold mt-4 inline-flex text-xs font-semibold underline"
                >
                  Abrir operaciones cripto
                </Link>
              )}
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <h2 className="font-display text-pisao-cream text-2xl">
          Payment Operations Reliability V2
        </h2>
        <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
          Ejecuta una alerta sintética sin crear una venta ni aprobar un pago. Sirve para
          validar la ruta de respaldo por email mientras WhatsApp completa su certificación.
        </p>
        <div className="mt-4">
          <PaymentNotificationTestButton />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <h2 className="font-display text-pisao-cream text-2xl">
          Criterio de certificación
        </h2>
        <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed">
          BLOQUEADA significa que falta configuración productiva. LISTA PARA
          PRUEBA significa que la integración está configurada pero aún no existe
          evidencia real suficiente. CERTIFICADA exige una operación observada
          dentro de los últimos {summary.windowDays} días. Los secretos, mensajes,
          teléfonos y payloads sensibles nunca se guardan en este ledger.
        </p>
      </section>
    </div>
  );
}
