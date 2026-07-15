import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getReporteVentas() {
  try {
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);

    const porMetodo = await prisma.pago.groupBy({
      by: ["metodo"],
      where: { estado: "APROBADO", createdAt: { gte: desde } },
      _sum: { monto: true },
      _count: true,
    });

    const totalVentas = porMetodo.reduce(
      (sum, m) => sum + Number(m._sum.monto ?? 0),
      0,
    );

    return { conectado: true, porMetodo, totalVentas };
  } catch {
    return { conectado: false, porMetodo: [], totalVentas: 0 };
  }
}

export default async function AdminReportesPage() {
  const reporte = await getReporteVentas();

  return (
    <div>
      <h1 className="font-display text-pisao-cream text-2xl">
        Reportes de ventas
      </h1>
      <p className="text-pisao-cream-muted mt-1 text-sm">Últimos 30 días</p>

      {!reporte.conectado && (
        <p className="text-pisao-cream-muted mt-2 text-sm">
          No hay conexión a la base de datos. Configura DATABASE_URL en .env.
        </p>
      )}

      <div className="border-pisao-gold/10 bg-pisao-carbon-soft mt-6 rounded-xl border p-6">
        <p className="text-pisao-cream-muted text-xs">
          Ventas totales aprobadas
        </p>
        <p className="font-display text-pisao-gold mt-1 text-3xl">
          {formatCurrency(reporte.totalVentas)}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {reporte.porMetodo.map((m) => (
          <div
            key={m.metodo}
            className="border-pisao-gold/10 rounded-xl border p-5"
          >
            <p className="text-pisao-cream-muted text-xs">{m.metodo}</p>
            <p className="text-pisao-cream mt-1 text-lg font-semibold">
              {formatCurrency(Number(m._sum.monto ?? 0))}
            </p>
            <p className="text-pisao-cream-muted text-xs">{m._count} pagos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
