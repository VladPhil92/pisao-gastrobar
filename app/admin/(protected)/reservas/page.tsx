import { prisma } from "@/lib/prisma";

async function getReservas() {
  try {
    return await prisma.reserva.findMany({
      orderBy: { fecha: "asc" },
      take: 50,
    });
  } catch {
    return null;
  }
}

export default async function AdminReservasPage() {
  const reservas = await getReservas();

  return (
    <div>
      <h1 className="font-display text-pisao-cream text-2xl">Reservas</h1>

      {reservas === null && (
        <p className="text-pisao-cream-muted mt-2 text-sm">
          No hay conexión a la base de datos. Configura DATABASE_URL en .env.
        </p>
      )}

      {reservas !== null && (
        <div className="border-pisao-gold/10 mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Personas</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} className="border-pisao-gold/10 border-t">
                  <td className="text-pisao-cream px-4 py-3">{r.nombre}</td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {r.telefono}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {r.fecha.toISOString().slice(0, 10)}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">{r.hora}</td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {r.personas}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {r.estado}
                  </td>
                </tr>
              ))}
              {reservas.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-pisao-cream-muted px-4 py-6 text-center"
                  >
                    Aún no hay reservas.
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
