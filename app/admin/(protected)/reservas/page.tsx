import { prisma } from "@/lib/prisma";
import { ReservationActions } from "@/components/admin/ReservationActions";

async function getReservas() {
  try {
    return await prisma.reserva.findMany({
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
      take: 100,
    });
  } catch (error) {
    console.error("[PISAO ADMIN] No se pudieron cargar reservas", error);
    return null;
  }
}

function badgeClass(estado: string) {
  if (estado === "CONFIRMADA") return "bg-emerald-400/10 text-emerald-300";
  if (estado === "CANCELADA") return "bg-red-400/10 text-red-300";
  if (estado === "COMPLETADA") return "bg-pisao-green/15 text-pisao-cream";
  return "bg-pisao-gold/10 text-pisao-gold";
}

function whatsappHref(phone: string, name: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(
    `Hola ${name}, te escribimos de PISÁO Gastrobar sobre tu reserva.`,
  )}`;
}

export default async function AdminReservasPage() {
  const reservas = await getReservas();

  return (
    <div>
      <div>
        <p className="text-pisao-gold text-[10px] font-semibold tracking-[.18em] uppercase">
          Operación
        </p>
        <h1 className="font-display text-pisao-cream mt-1 text-3xl">Reservas</h1>
        <p className="text-pisao-cream-muted mt-2 text-sm">
          Confirma, completa o cancela solicitudes desde un único flujo operativo.
        </p>
      </div>

      {reservas === null && (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
          <p className="text-sm font-semibold text-red-300">
            La base de datos no está disponible.
          </p>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            Revisa DATABASE_URL antes de operar reservas.
          </p>
        </div>
      )}

      {reservas !== null && (
        <div className="border-pisao-gold/10 mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Personas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} className="border-pisao-gold/10 border-t align-top">
                  <td className="px-4 py-4">
                    <p className="text-pisao-cream font-semibold">{r.nombre}</p>
                    <a
                      href={whatsappHref(r.telefono, r.nombre)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pisao-gold mt-1 block text-xs hover:underline"
                    >
                      {r.telefono}
                    </a>
                    {r.email && (
                      <p className="text-pisao-cream-muted mt-1 text-[11px]">
                        {r.email}
                      </p>
                    )}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-4">
                    {r.fecha.toISOString().slice(0, 10)}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-4">{r.hora}</td>
                  <td className="text-pisao-cream-muted px-4 py-4">
                    {r.personas}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${badgeClass(
                        r.estado,
                      )}`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="text-pisao-cream-muted max-w-[260px] px-4 py-4 text-xs leading-relaxed">
                    {r.notas || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <ReservationActions id={r.id} estado={r.estado} />
                  </td>
                </tr>
              ))}
              {reservas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-pisao-cream-muted px-4 py-8 text-center"
                  >
                    Aún no hay reservas registradas.
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
