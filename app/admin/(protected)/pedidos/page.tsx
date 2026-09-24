import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  cryptoExplorerUrl,
  type OnchainCrypto,
} from "@/lib/payments/onchain";
import { VerificarPagoButtons } from "@/components/admin/VerificarPagoButtons";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";

const CRYPTO_ASSETS = new Set<OnchainCrypto>(["BNB", "USDT", "ETH", "BTC"]);

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function cryptoReconciliationState(payload: unknown) {
  const reconciliation = asObject(asObject(payload).reconciliation);
  return typeof reconciliation.state === "string"
    ? reconciliation.state
    : null;
}

function getExplorerLink(moneda: string | null, txHash: string | null) {
  if (!moneda || !txHash || !CRYPTO_ASSETS.has(moneda as OnchainCrypto)) {
    return null;
  }

  try {
    return cryptoExplorerUrl(moneda as OnchainCrypto, txHash);
  } catch {
    return null;
  }
}

async function getPedidos() {
  try {
    return await prisma.pedido.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        pago: {
          select: {
            metodo: true,
            estado: true,
            comprobanteUrl: true,
            comprobanteRecibidoEn: true,
            criptoMoneda: true,
            txHash: true,
            confirmacionesOnchain: true,
            payloadProveedor: true,
          },
        },
        adminNotifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            status: true,
            provider: true,
            attempts: true,
            deliveredAt: true,
            lastAttemptAt: true,
            nextAttemptAt: true,
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function AdminPedidosPage() {
  const pedidos = await getPedidos();

  return (
    <div>
      <h1 className="font-display text-2xl text-pisao-cream">Pedidos</h1>

      {pedidos === null && (
        <p className="mt-2 text-sm text-pisao-cream-muted">
          No hay conexión a la base de datos. Configura DATABASE_URL en .env.
        </p>
      )}

      {pedidos !== null && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-pisao-gold/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">On-chain</th>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Alerta admin</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => {
                const explorerLink = getExplorerLink(
                  p.pago?.criptoMoneda ?? null,
                  p.pago?.txHash ?? null,
                );
                const reconciliationState = cryptoReconciliationState(
                  p.pago?.payloadProveedor,
                );

                return (
                  <tr key={p.id} className="border-t border-pisao-gold/10">
                    <td className="px-4 py-3 text-pisao-cream">{p.numero}</td>
                    <td className="px-4 py-3 text-pisao-cream">
                      {p.clienteNombre}
                    </td>
                    <td className="px-4 py-3 text-pisao-cream-muted">
                      {p.clienteTelefono}
                    </td>
                    <td className="px-4 py-3 text-pisao-cream-muted">
                      {p.pago?.metodo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-pisao-cream-muted">
                      {p.estado}
                    </td>
                    <td className="px-4 py-3 text-pisao-cream">
                      {formatCurrency(Number(p.total))}
                    </td>
                    <td className="px-4 py-3">
                      {p.pago?.metodo === "CRIPTO" && p.pago.txHash ? (
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-pisao-cream">
                            {p.pago.criptoMoneda ?? "CRIPTO"}
                          </p>
                          <p className="font-mono text-pisao-cream-muted">
                            {p.pago.txHash.slice(0, 10)}…
                            {p.pago.txHash.slice(-8)}
                          </p>
                          <p className="text-pisao-cream-muted">
                            {p.pago.confirmacionesOnchain ?? 0} confirmación(es)
                          </p>
                          {reconciliationState === "CONFIRMED" && (
                            <p className="font-semibold text-emerald-300">
                              Confirmado on-chain · listo para revisión
                            </p>
                          )}
                          {reconciliationState === "OBSERVED" && (
                            <p className="text-amber-300">
                              Detectado · esperando confirmaciones
                            </p>
                          )}
                          {reconciliationState === "UNDERPAID" && (
                            <p className="font-semibold text-red-300">
                              Monto insuficiente
                            </p>
                          )}
                          {reconciliationState === "RETRY_PENDING" && (
                            <p className="text-pisao-cream-muted">
                              Reintento automático pendiente
                            </p>
                          )}
                          {explorerLink && (
                            <a
                              href={explorerLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-pisao-gold underline"
                            >
                              Ver transacción
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-pisao-cream-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.pago?.comprobanteRecibidoEn ||
                      p.pago?.comprobanteUrl ? (
                        <a
                          href={`/api/admin/pedidos/${p.id}/comprobante`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pisao-gold underline"
                        >
                          Ver evidencia
                        </a>
                      ) : (
                        <span className="text-pisao-cream-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.adminNotifications[0] ? (
                        <div className="space-y-1 text-xs">
                          <p
                            className={
                              p.adminNotifications[0].status === "DELIVERED"
                                ? "font-semibold text-emerald-300"
                                : p.adminNotifications[0].status === "DEAD_LETTER"
                                  ? "font-semibold text-red-300"
                                  : "font-semibold text-amber-200"
                            }
                          >
                            {p.adminNotifications[0].status}
                          </p>
                          <p className="text-pisao-cream-muted">
                            {p.adminNotifications[0].provider ?? "sin canal"} ·{" "}
                            {p.adminNotifications[0].attempts} intento(s)
                          </p>
                        </div>
                      ) : (
                        <span className="text-pisao-cream-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {p.estado === "PENDIENTE_VERIFICACION" && (
                          <VerificarPagoButtons pedidoId={p.id} />
                        )}
                        <OrderStatusControls
                          pedidoId={p.id}
                          estado={p.estado}
                          tipoEntrega={p.tipoEntrega}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pedidos.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-pisao-cream-muted"
                  >
                    Aún no hay pedidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
