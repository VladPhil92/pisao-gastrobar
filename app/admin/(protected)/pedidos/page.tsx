import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { VerificarPagoButtons } from "@/components/admin/VerificarPagoButtons";
import { OrderStatusButtons } from "@/components/admin/OrderStatusButtons";

async function getPedidos() {
  try {
    return await prisma.pedido.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { pago: true },
    });
  } catch {
    return null;
  }
}

export default async function AdminPedidosPage() {
  const pedidos = await getPedidos();

  return (
    <div>
      <h1 className="font-display text-pisao-cream text-2xl">Pedidos</h1>

      {pedidos === null && (
        <p className="text-pisao-cream-muted mt-2 text-sm">
          No hay conexión a la base de datos. Configura DATABASE_URL en .env.
        </p>
      )}

      {pedidos !== null && (
        <div className="border-pisao-gold/10 mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Operación</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-pisao-gold/10 border-t align-top">
                  <td className="text-pisao-cream px-4 py-3">{p.numero}</td>
                  <td className="text-pisao-cream px-4 py-3">
                    {p.clienteNombre}
                    {p.ctgOneSubject && (
                      <span className="text-pisao-gold/80 mt-1 block text-[10px] uppercase tracking-wide">
                        CTG One
                      </span>
                    )}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {p.pago?.metodo ?? "—"}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {p.estado}
                  </td>
                  <td className="text-pisao-cream px-4 py-3">
                    {formatCurrency(Number(p.total))}
                  </td>
                  <td className="px-4 py-3">
                    {p.pago?.comprobanteUrl ? (
                      <a
                        href={p.pago.comprobanteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pisao-gold underline"
                      >
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.estado === "PENDIENTE_VERIFICACION" ? (
                      <VerificarPagoButtons pedidoId={p.id} />
                    ) : (
                      <OrderStatusButtons pedidoId={p.id} estado={p.estado} />
                    )}
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-pisao-cream-muted px-4 py-6 text-center"
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
