
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getCryptoOperationsSummary } from "@/lib/payments/crypto-treasury";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatUnits(value: number, asset: string) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: asset === "USDT" ? 4 : 8,
  }).format(value);
}

function pct(value: number) {
  return value.toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  }) + "%";
}

function maskHash(value: string | null) {
  if (!value) return "—";
  if (value.length <= 20) return value;
  return value.slice(0, 10) + "…" + value.slice(-8);
}

export default async function CryptoOperationsPage() {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;
  if (rol !== "ADMIN") redirect("/admin/dashboard");

  const data = await getCryptoOperationsSummary(30);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 border-b border-pisao-gold/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-pisao-gold uppercase">
            Crypto Operations · V13
          </p>
          <h1 className="font-display mt-2 text-4xl text-pisao-cream">
            Pagos cripto con trazabilidad financiera
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Consolida cobros aprobados, unidades recibidas, descuentos y estado
            de conciliación on-chain. Este módulo registra ingresos del canal;
            no representa el saldo actual de las wallets ni movimientos externos
            a PISÁO.
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-4 py-3 text-xs text-pisao-cream-muted">
          Ventana operativa: últimos {data.windowDays} días
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <CircleDollarSign className="size-5 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
            Ingreso cripto aprobado
          </p>
          <p className="font-display mt-2 text-3xl text-pisao-cream">
            {formatCurrency(data.approvedRevenueCop)}
          </p>
          <p className="mt-1 text-xs text-pisao-cream-muted">
            {data.approvedOrders} pedidos aprobados
          </p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <ReceiptText className="size-5 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
            Ticket promedio
          </p>
          <p className="font-display mt-2 text-3xl text-pisao-cream">
            {formatCurrency(data.averageTicketCop)}
          </p>
          <p className="mt-1 text-xs text-pisao-cream-muted">
            Sobre pagos cripto aprobados
          </p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <WalletCards className="size-5 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
            Participación USDT
          </p>
          <p className="font-display mt-2 text-3xl text-pisao-cream">
            {pct(data.stablecoinRevenueSharePct)}
          </p>
          <p className="mt-1 text-xs text-pisao-cream-muted">
            Del ingreso cripto aprobado en la ventana
          </p>
        </article>

        <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5">
          <Activity className="size-5 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
            Descuento concedido
          </p>
          <p className="font-display mt-2 text-3xl text-pisao-cream">
            {formatCurrency(data.discountCop)}
          </p>
          <p className="mt-1 text-xs text-pisao-cream-muted">
            Incentivo comercial registrado
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">
                Mix por activo
              </p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">
                Qué se está cobrando realmente
              </h2>
            </div>
            <WalletCards className="size-5 text-pisao-gold" />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="border-b border-pisao-gold/10 text-[10px] tracking-wide text-pisao-cream-muted uppercase">
                <tr>
                  <th className="px-3 py-3">Activo</th>
                  <th className="px-3 py-3">Pedidos</th>
                  <th className="px-3 py-3">Unidades cobradas</th>
                  <th className="px-3 py-3">Ingreso COP</th>
                  <th className="px-3 py-3">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pisao-gold/10">
                {data.assets.map((asset) => (
                  <tr key={asset.asset}>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-pisao-cream">
                          {asset.asset}
                        </span>
                        {asset.asset === "USDT" && (
                          <span className="rounded-full bg-pisao-gold/15 px-2 py-0.5 text-[9px] font-semibold text-pisao-gold">
                            stablecoin-first
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-pisao-cream-muted">
                      {asset.orders}
                    </td>
                    <td className="px-3 py-4 font-mono text-pisao-cream">
                      {formatUnits(asset.receivedUnits, asset.asset)}
                    </td>
                    <td className="px-3 py-4 font-semibold text-pisao-gold">
                      {formatCurrency(asset.revenueCop)}
                    </td>
                    <td className="px-3 py-4 text-pisao-cream-muted">
                      {formatCurrency(asset.averageTicketCop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-pisao-cream-muted">
            “Unidades cobradas” suma pagos registrados por PISÁO durante la
            ventana. No debe interpretarse como balance actual de la wallet:
            retiros, conversiones o movimientos externos no forman parte de este
            ledger.
          </p>
        </article>

        <article className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">
                Integridad
              </p>
              <h2 className="font-display mt-2 text-2xl text-pisao-cream">
                Cobertura del canal cripto
              </h2>
            </div>
            <ShieldCheck className="size-5 text-pisao-gold" />
          </div>

          <div className="mt-5 space-y-4">
            {[
              ["Tx + monto on-chain", data.traceabilityCoveragePct],
              ["Cotización COP disponible", data.quoteCoveragePct],
              ["Snapshot V13 al aprobar", data.ledgerSnapshotCoveragePct],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-pisao-cream">{label}</span>
                  <span className="font-semibold text-pisao-gold">
                    {pct(Number(value))}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-pisao-gold"
                    style={{ width: String(Math.max(2, Math.min(100, Number(value)))) + "%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-pisao-gold/10 pt-5">
            <p className="text-[10px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">
              Pendientes de conciliación
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
                <p className="text-xl font-semibold text-pisao-cream">
                  {data.pending.total}
                </p>
                <p className="text-[10px] text-pisao-cream-muted">abiertos</p>
              </div>
              <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
                <p className="text-xl font-semibold text-pisao-cream">
                  {data.pending.confirmedAwaitingApproval}
                </p>
                <p className="text-[10px] text-pisao-cream-muted">
                  on-chain confirmados
                </p>
              </div>
              <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
                <p className="text-xl font-semibold text-amber-200">
                  {data.pending.observed + data.pending.retryPending}
                </p>
                <p className="text-[10px] text-amber-200/70">
                  confirmando / reintento
                </p>
              </div>
              <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-3">
                <p className="text-xl font-semibold text-red-300">
                  {data.pending.underpaid}
                </p>
                <p className="text-[10px] text-red-300/70">monto insuficiente</p>
              </div>
            </div>

            {data.pending.withoutTx > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {data.pending.withoutTx} pago(s) cripto todavía no tienen TxHash
                vinculado.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">
              Ledger operativo
            </p>
            <h2 className="font-display mt-2 text-2xl text-pisao-cream">
              Últimos pagos cripto aprobados
            </h2>
          </div>
          <BadgeCheck className="size-5 text-pisao-gold" />
        </div>

        {data.recentApproved.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-pisao-gold/10 text-[10px] tracking-wide text-pisao-cream-muted uppercase">
                <tr>
                  <th className="px-3 py-3">Pedido</th>
                  <th className="px-3 py-3">Activo</th>
                  <th className="px-3 py-3">Recibido</th>
                  <th className="px-3 py-3">Valor COP</th>
                  <th className="px-3 py-3">Confirmaciones</th>
                  <th className="px-3 py-3">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pisao-gold/10">
                {data.recentApproved.map((entry) => (
                  <tr key={entry.paymentId}>
                    <td className="px-3 py-4 font-semibold text-pisao-cream">
                      #{entry.pedidoNumero}
                    </td>
                    <td className="px-3 py-4 text-pisao-cream">
                      {entry.asset ?? "—"}
                    </td>
                    <td className="px-3 py-4 font-mono text-pisao-cream-muted">
                      {entry.receivedAmount !== null && entry.asset
                        ? formatUnits(entry.receivedAmount, entry.asset) + " " + entry.asset
                        : "—"}
                    </td>
                    <td className="px-3 py-4 font-semibold text-pisao-gold">
                      {formatCurrency(entry.revenueCop)}
                    </td>
                    <td className="px-3 py-4 text-pisao-cream-muted">
                      {entry.confirmations}
                    </td>
                    <td className="px-3 py-4">
                      {entry.explorerUrl ? (
                        <a
                          href={entry.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-pisao-gold underline"
                        >
                          {maskHash(entry.txHash)}
                        </a>
                      ) : (
                        <span className="font-mono text-[11px] text-pisao-cream-muted">
                          {maskHash(entry.txHash)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-pisao-gold/15 p-6 text-sm text-pisao-cream-muted">
            Aún no hay pagos cripto aprobados en esta ventana.
          </div>
        )}
      </section>
    </div>
  );
}
