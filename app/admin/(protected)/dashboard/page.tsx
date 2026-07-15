import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getResumen() {
  try {
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const [pedidosHoy, pendientesVerificacion, reservasProximas, ventasHoy] =
      await Promise.all([
        prisma.pedido.count({ where: { createdAt: { gte: inicioDelDia } } }),
        prisma.pedido.count({ where: { estado: "PENDIENTE_VERIFICACION" } }),
        prisma.reserva.count({
          where: { fecha: { gte: inicioDelDia }, estado: "CONFIRMADA" },
        }),
        prisma.pedido.aggregate({
          where: {
            createdAt: { gte: inicioDelDia },
            estado: { not: "CANCELADO" },
          },
          _sum: { total: true },
        }),
      ]);

    return {
      conectado: true,
      pedidosHoy,
      pendientesVerificacion,
      reservasProximas,
      ventasHoy: Number(ventasHoy._sum.total ?? 0),
    };
  } catch {
    return {
      conectado: false,
      pedidosHoy: 0,
      pendientesVerificacion: 0,
      reservasProximas: 0,
      ventasHoy: 0,
    };
  }
}

export default async function AdminDashboardPage() {
  const resumen = await getResumen();

  const tarjetas = [
    { label: "Pedidos hoy", value: resumen.pedidosHoy },
    {
      label: "Pendientes de verificación",
      value: resumen.pendientesVerificacion,
    },
    { label: "Reservas próximas", value: resumen.reservasProximas },
    { label: "Ventas hoy", value: formatCurrency(resumen.ventasHoy) },
  ];

  return (
    <div>
      <h1 className="font-display text-pisao-cream text-2xl">Panel</h1>

      {!resumen.conectado && (
        <p className="text-pisao-cream-muted mt-2 text-sm">
          No hay conexión a la base de datos (DATABASE_URL). Configúrala en .env
          para ver datos reales.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div
            key={t.label}
            className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-xl border p-5"
          >
            <p className="text-pisao-cream-muted text-xs">{t.label}</p>
            <p className="font-display text-pisao-gold mt-1 text-2xl">
              {t.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
