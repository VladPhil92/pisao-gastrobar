import Link from "next/link";
import { notFound } from "next/navigation";

import { getCrmCustomerDetail } from "@/lib/crm/dashboard";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function Customer360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminRoute("/admin/clientes");
  const { id } = await params;
  const data = await getCrmCustomerDetail(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-[1400px] space-y-7">
      <header>
        <Link
          href="/admin/clientes"
          className="text-pisao-gold text-xs font-semibold hover:underline"
        >
          ← Volver a clientes
        </Link>
        <p className="text-pisao-gold mt-5 text-[10px] font-bold uppercase tracking-[.22em]">
          Customer 360
        </p>
        <h1 className="font-display text-pisao-cream mt-2 text-4xl">
          {data.profile.nombre}
        </h1>
        <div className="text-pisao-cream-muted mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span>{data.profile.email ?? "Sin correo"}</span>
          <span>{data.profile.telefono ?? "Sin teléfono"}</span>
          <span>Fuente: {data.profile.source}</span>
          <span>Segmento: {data.metrics.segment.replaceAll("_", " ")}</span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {[
          ["Pedidos", data.metrics.orders],
          ["Pagados", data.metrics.approvedOrders],
          ["Entregados", data.metrics.deliveredOrders],
          ["Gasto", money(data.metrics.approvedSpend)],
          ["Ticket prom.", money(data.metrics.averageTicket)],
          ["Reservas", data.metrics.reservations],
          ["Puntos", data.metrics.loyaltyPoints],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-4"
          >
            <p className="text-pisao-cream-muted text-[9px] font-semibold uppercase tracking-wider">
              {String(label)}
            </p>
            <p className="font-display text-pisao-gold mt-1 text-2xl">
              {String(value)}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
            Perfil
          </p>
          <h2 className="font-display text-pisao-cream mt-1 text-2xl">
            Relación con PISÁO
          </h2>
          <div className="text-pisao-cream-muted mt-5 space-y-3 text-sm">
            <p>
              Cuenta:{" "}
              <strong className="text-pisao-cream">
                {data.profile.account ? "Vinculada" : "Invitado / federado"}
              </strong>
            </p>
            <p>
              Email verificado:{" "}
              <strong className="text-pisao-cream">
                {data.profile.account?.emailVerified ? "Sí" : "No / no aplica"}
              </strong>
            </p>
            <p>
              Marketing:{" "}
              <strong className="text-pisao-cream">
                {data.profile.marketingConsent
                  ? "Consentimiento registrado"
                  : "Sin consentimiento"}
              </strong>
            </p>
            <p>
              Última actividad:{" "}
              <strong className="text-pisao-cream">
                {new Date(data.profile.lastActivityAt).toLocaleString("es-CO")}
              </strong>
            </p>
          </div>

          <div className="border-pisao-gold/10 mt-6 border-t pt-5">
            <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
              Productos más repetidos
            </p>
            <div className="mt-3 space-y-2">
              {data.favoriteProducts.length ? (
                data.favoriteProducts.map((product, index) => (
                  <div
                    key={`${product.nombre}-${index}`}
                    className="border-pisao-gold/10 bg-pisao-noche flex items-center justify-between rounded-xl border px-3 py-2.5"
                  >
                    <span className="text-pisao-cream text-sm">
                      {product.nombre}
                    </span>
                    <span className="text-pisao-gold text-xs font-semibold">
                      × {product.quantity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-pisao-cream-muted text-xs">
                  Aún no hay suficientes pedidos entregados para identificar preferencias.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
          <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
            Fidelización
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-pisao-cream text-2xl">
              Ledger de puntos
            </h2>
            <p className="text-pisao-cream-muted text-xs">
              Canje: {data.policy.redemptionEnabled ? "habilitado" : "deshabilitado"}
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {data.loyalty.length ? (
              data.loyalty.map((entry) => (
                <div
                  key={entry.id}
                  className="border-pisao-gold/10 bg-pisao-noche grid gap-2 rounded-xl border px-3 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-pisao-cream text-xs font-semibold">
                      {entry.event.replaceAll("_", " ")}
                    </p>
                    <p className="text-pisao-cream-muted mt-1 text-[11px]">
                      {new Date(entry.createdAt).toLocaleString("es-CO")}
                      {entry.amountCop ? ` · ${money(entry.amountCop)}` : ""}
                    </p>
                  </div>
                  <p className="text-pisao-gold font-semibold">
                    {entry.points > 0 ? "+" : ""}
                    {entry.points}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-pisao-cream-muted text-xs">
                Todavía no hay movimientos de fidelización.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
        <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
          Historial comercial
        </p>
        <h2 className="font-display text-pisao-cream mt-1 text-2xl">
          Pedidos recientes
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {data.orders.map((order) => (
            <article
              key={order.id}
              className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-pisao-cream font-semibold">
                    Pedido #{order.numero}
                  </p>
                  <p className="text-pisao-cream-muted mt-1 text-[11px]">
                    {new Date(order.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
                <p className="text-pisao-gold font-semibold">
                  {money(order.total)}
                </p>
              </div>
              <p className="text-pisao-cream-muted mt-3 text-xs">
                {order.estado.replaceAll("_", " ")} ·{" "}
                {order.paymentStatus ?? "sin pago"} ·{" "}
                {order.paymentMethod ?? "sin método"}
              </p>
              <p className="text-pisao-cream-muted mt-2 text-[11px]">
                {order.items
                  .map((item) => `${item.cantidad}× ${item.nombre}`)
                  .join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-pisao-gold/15 bg-pisao-carbon-soft rounded-3xl border p-5 sm:p-6">
        <p className="text-pisao-gold text-[10px] font-bold uppercase tracking-[.18em]">
          Hospitalidad
        </p>
        <h2 className="font-display text-pisao-cream mt-1 text-2xl">
          Reservas recientes
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {data.reservations.map((reservation) => (
            <article
              key={reservation.id}
              className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-4"
            >
              <p className="text-pisao-cream font-semibold">
                {new Date(reservation.fecha).toLocaleDateString("es-CO")} ·{" "}
                {reservation.hora}
              </p>
              <p className="text-pisao-cream-muted mt-2 text-xs">
                {reservation.personas} personas ·{" "}
                {reservation.estado.toLowerCase()}
              </p>
              <p className="text-pisao-cream-muted mt-2 text-[11px]">
                {reservation.mesas.length
                  ? reservation.mesas.join(", ")
                  : "Sin mesa histórica registrada"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
