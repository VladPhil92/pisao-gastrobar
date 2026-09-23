import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { VerificarPagoButtons } from "@/components/admin/VerificarPagoButtons";

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
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
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
                    {p.estado === "PENDIENTE_VERIFICACION" && (
                      <VerificarPagoButtons pedidoId={p.id} />
                    )}
                  </td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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
