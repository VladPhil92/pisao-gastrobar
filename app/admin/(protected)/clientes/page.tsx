import Link from "next/link";

import { getCrmDashboard } from "@/lib/crm/dashboard";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function segmentClass(segment: string) {
  if (segment === "FRECUENTE") return "bg-emerald-500/15 text-emerald-300";
  if (segment === "RECURRENTE") return "bg-sky-500/15 text-sky-300";
  if (segment === "PRIMERA_COMPRA") return "bg-pisao-gold/15 text-pisao-gold";
  return "bg-pisao-cream/10 text-pisao-cream-muted";
}

function lifecycleClass(stage: string) {
  if (stage === "LOYAL") return "bg-emerald-500/15 text-emerald-300";
  if (stage === "ACTIVE") return "bg-sky-500/15 text-sky-300";
  if (stage === "NEW_CUSTOMER") return "bg-pisao-gold/15 text-pisao-gold";
  if (stage === "AT_RISK") return "bg-amber-500/15 text-amber-300";
  if (stage === "DORMANT") return "bg-rose-500/15 text-rose-300";
  return "bg-pisao-cream/10 text-pisao-cream-muted";
}

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: string; lifecycle?: string }>;
}) {
  await requireAdminRoute("/admin/clientes");
  const data = await getCrmDashboard();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const segment = params.segment?.trim().toUpperCase() ?? "";
  const lifecycle = params.lifecycle?.trim().toUpperCase() ?? "";

  const customers = data.customers.filter((customer) => {
    const matchesQuery =
      !query ||
      customer.nombre.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.telefono?.toLowerCase().includes(query);
    const matchesSegment = !segment || customer.segment === segment;
    const matchesLifecycle = !lifecycle || customer.lifecycle.stage === lifecycle;
    return matchesQuery && matchesSegment && matchesLifecycle;
  });

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header>
        <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.22em]">
          Customer Lifecycle Operations V16
        </p>
        <h1 className="font-display text-pisao-cream mt-2 text-4xl">
          Clientes
        </h1>
        <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
          Vista operativa de cuentas, pedidos, reservas, recurrencia, PISÁO Points
          y ciclo de vida. El motor distingue prospectos, clientes activos,
          fieles y señales de riesgo sin habilitar contacto saliente cuando no
          existe consentimiento.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {[
          ["Perfiles CRM", data.summary.profiles],
          ["Con cuenta", data.summary.accountLinked],
          ["Recurrentes", data.summary.repeatCustomers],
          ["En riesgo", data.summary.lifecycle.atRisk],
          ["Reactivables", data.summary.lifecycle.reactivationReady],
          ["Ventas aprobadas", money(data.summary.totalApprovedSpend)],
          ["Puntos emitidos", data.summary.loyaltyPoints],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-4"
          >
            <p className="text-pisao-cream-muted text-[10px] font-semibold uppercase tracking-wider">
              {String(label)}
            </p>
            <p className="font-display text-pisao-gold mt-1 text-3xl">
              {String(value)}
            </p>
          </div>
        ))}
      </section>

      <section className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
              Fidelización
            </p>
            <h2 className="font-display text-pisao-cream mt-1 text-2xl">
              PISÁO Points
            </h2>
            <p className="text-pisao-cream-muted mt-2 max-w-2xl text-xs leading-relaxed">
              {data.policy.pointsPer1000Cop} punto por cada COP 1.000 de pedidos
              pagados y entregados. V16 usa ese saldo junto con recurrencia y
              recencia para priorizar la atención comercial. La redención
              automática sigue deshabilitada hasta que exista una política
              económica aprobada.
            </p>
          </div>

          <form className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_auto]">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Nombre, correo o teléfono"
              className="border-pisao-gold/15 bg-pisao-carbon text-pisao-cream rounded-xl border px-3 py-2.5 text-sm"
            />
            <select
              name="segment"
              defaultValue={segment}
              className="border-pisao-gold/15 bg-pisao-carbon text-pisao-cream rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="">Todos los segmentos</option>
              <option value="PROSPECTO">Prospecto</option>
              <option value="PRIMERA_COMPRA">Primera compra</option>
              <option value="RECURRENTE">Recurrente</option>
              <option value="FRECUENTE">Frecuente</option>
            </select>
            <select
              name="lifecycle"
              defaultValue={lifecycle}
              className="border-pisao-gold/15 bg-pisao-carbon text-pisao-cream rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="">Todo el ciclo de vida</option>
              <option value="PROSPECT">Prospecto</option>
              <option value="NEW_CUSTOMER">Cliente nuevo</option>
              <option value="ACTIVE">Activo</option>
              <option value="LOYAL">Fiel</option>
              <option value="AT_RISK">En riesgo</option>
              <option value="DORMANT">Dormido</option>
            </select>
            <button
              type="submit"
              className="bg-pisao-gold text-pisao-carbon rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              Filtrar
            </button>
          </form>
        </div>
      </section>

      <section className="border-pisao-gold/10 overflow-x-auto rounded-2xl border">
        <table className="min-w-[1500px] w-full text-left text-sm">
          <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Ciclo de vida</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Entregados</th>
              <th className="px-4 py-3">Gasto aprobado</th>
              <th className="px-4 py-3">Ticket prom.</th>
              <th className="px-4 py-3">Reservas</th>
              <th className="px-4 py-3">Puntos</th>
              <th className="px-4 py-3">Siguiente acción</th>
              <th className="px-4 py-3">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-pisao-gold/10 border-t align-top"
              >
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/clientes/${customer.id}`}
                    className="text-pisao-cream font-semibold hover:text-pisao-gold"
                  >
                    {customer.nombre}
                  </Link>
                  <p className="text-pisao-cream-muted mt-1 max-w-[260px] break-all text-[11px]">
                    {customer.email ?? customer.telefono ?? "Sin contacto"}
                  </p>
                  <p className="text-pisao-gold mt-1 text-[9px] font-semibold uppercase tracking-wider">
                    {customer.accountLinked ? "Cuenta vinculada" : customer.source}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${segmentClass(customer.segment)}`}
                  >
                    {customer.segment.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${lifecycleClass(customer.lifecycle.stage)}`}
                  >
                    {customer.lifecycle.stage.replaceAll("_", " ")}
                  </span>
                  <p className="text-pisao-cream-muted mt-1 text-[10px]">
                    {customer.lifecycle.daysSinceLastActivity} días
                  </p>
                </td>
                <td className="text-pisao-cream-muted px-4 py-4">
                  {customer.orders}
                </td>
                <td className="text-pisao-cream-muted px-4 py-4">
                  {customer.deliveredOrders}
                </td>
                <td className="text-pisao-cream px-4 py-4 font-semibold">
                  {money(customer.approvedSpend)}
                </td>
                <td className="text-pisao-cream-muted px-4 py-4">
                  {money(customer.averageTicket)}
                </td>
                <td className="text-pisao-cream-muted px-4 py-4">
                  {customer.reservations}
                </td>
                <td className="text-pisao-gold px-4 py-4 font-semibold">
                  {customer.loyaltyPoints}
                </td>
                <td className="px-4 py-4">
                  <p className="text-pisao-cream max-w-[260px] text-xs font-semibold">
                    {customer.lifecycle.nextBestAction}
                  </p>
                  <p className={`mt-1 text-[10px] ${customer.lifecycle.outreachAllowed ? "text-emerald-300" : "text-pisao-cream-muted"}`}>
                    {customer.lifecycle.outreachAllowed
                      ? "Contacto consentido disponible"
                      : "Sin contacto saliente"}
                  </p>
                </td>
                <td className="text-pisao-cream-muted px-4 py-4 text-xs">
                  {new Date(customer.lastActivityAt).toLocaleString("es-CO")}
                </td>
              </tr>
            ))}
            {!customers.length ? (
              <tr>
                <td
                  colSpan={11}
                  className="text-pisao-cream-muted px-4 py-10 text-center"
                >
                  No encontramos clientes con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
