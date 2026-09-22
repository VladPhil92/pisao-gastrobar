import { prisma } from "@/lib/prisma";
import {
  bogotaDateString,
  getReservationConfig,
  listAvailabilityForDate,
} from "@/lib/reservas/availability";
import { ReservationActions } from "@/components/admin/ReservationActions";

export const dynamic = "force-dynamic";

type CapacityDay = {
  fecha: string;
  activeDiners: number;
  peakReserved: number;
  peakPercent: number;
  busiestHour: string | null;
  occupiedSlots: Array<{
    hora: string;
    reserved: number;
    capacity: number;
  }>;
};

async function getReservationOperations() {
  try {
    const fechas = Array.from({ length: 7 }, (_, index) =>
      bogotaDateString(new Date(), index),
    );

    const [reservas, capacityDays] = await Promise.all([
      prisma.reserva.findMany({
        orderBy: [{ fecha: "asc" }, { hora: "asc" }],
        take: 150,
      }),
      Promise.all(
        fechas.map(async (fecha): Promise<CapacityDay> => {
          const slots = await listAvailabilityForDate(fecha);
          const occupiedSlots = slots
            .filter((slot) => slot.reserved > 0)
            .map((slot) => ({
              hora: slot.hora,
              reserved: slot.reserved,
              capacity: slot.capacity,
            }));

          const busiest = slots.reduce<
            { hora: string; reserved: number; capacity: number } | null
          >((current, slot) => {
            if (!current || slot.reserved > current.reserved) {
              return {
                hora: slot.hora,
                reserved: slot.reserved,
                capacity: slot.capacity,
              };
            }
            return current;
          }, null);

          const activeDiners = slots.reduce(
            (sum, slot) => sum + slot.reserved,
            0,
          );
          const peakReserved = busiest?.reserved ?? 0;
          const peakPercent = busiest?.capacity
            ? Math.round((peakReserved / busiest.capacity) * 100)
            : 0;

          return {
            fecha,
            activeDiners,
            peakReserved,
            peakPercent,
            busiestHour: peakReserved > 0 ? busiest?.hora ?? null : null,
            occupiedSlots,
          };
        }),
      ),
    ]);

    return { reservas, capacityDays };
  } catch (error) {
    console.error("[PISAO ADMIN] No se pudo cargar operación de reservas", error);
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

function formatDay(fecha: string) {
  const date = new Date(`${fecha}T12:00:00-05:00`);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export default async function AdminReservasPage() {
  const data = await getReservationOperations();
  const config = getReservationConfig();
  const today = bogotaDateString();

  const reservas = data?.reservas ?? null;
  const futureActive =
    reservas?.filter(
      (reservation) =>
        reservation.fecha.toISOString().slice(0, 10) >= today &&
        ["PENDIENTE", "CONFIRMADA"].includes(reservation.estado),
    ) ?? [];

  const pending = futureActive.filter(
    (reservation) => reservation.estado === "PENDIENTE",
  ).length;
  const confirmed = futureActive.filter(
    (reservation) => reservation.estado === "CONFIRMADA",
  ).length;
  const todayDiners = futureActive
    .filter(
      (reservation) => reservation.fecha.toISOString().slice(0, 10) === today,
    )
    .reduce((sum, reservation) => sum + reservation.personas, 0);

  return (
    <div>
      <div>
        <p className="text-pisao-gold text-[10px] font-semibold tracking-[.18em] uppercase">
          Operación
        </p>
        <h1 className="font-display text-pisao-cream mt-1 text-3xl">Reservas</h1>
        <p className="text-pisao-cream-muted mt-2 text-sm">
          Controla solicitudes, confirmaciones y presión de capacidad por franja.
        </p>
      </div>

      {data === null && (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
          <p className="text-sm font-semibold text-red-300">
            La base de datos no está disponible.
          </p>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            El panel permanece en modo seguro. Revisa DATABASE_URL antes de operar reservas.
          </p>
        </div>
      )}

      {data !== null && (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Pendientes futuras",
                value: pending,
                detail: "requieren gestión humana",
              },
              {
                label: "Confirmadas futuras",
                value: confirmed,
                detail: "reservas activas",
              },
              {
                label: "Comensales hoy",
                value: todayDiners,
                detail: "pendientes + confirmadas",
              },
              {
                label: "Capacidad por franja",
                value: config.maxDinersPerSlot,
                detail: `cada ${config.slotMinutes} min`,
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="border-pisao-gold/10 bg-pisao-noche rounded-2xl border p-5"
              >
                <p className="text-pisao-cream-muted text-[10px] font-semibold tracking-[.14em] uppercase">
                  {metric.label}
                </p>
                <p className="font-display text-pisao-cream mt-2 text-4xl">
                  {metric.value}
                </p>
                <p className="text-pisao-cream-muted mt-1 text-xs">
                  {metric.detail}
                </p>
              </div>
            ))}
          </section>

          <section className="border-pisao-gold/10 bg-pisao-noche mt-6 rounded-3xl border p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-pisao-gold text-[10px] font-semibold tracking-[.18em] uppercase">
                  Capacidad operativa
                </p>
                <h2 className="font-display text-pisao-cream mt-1 text-2xl">
                  Próximos 7 días
                </h2>
              </div>
              <p className="text-pisao-cream-muted max-w-md text-xs leading-relaxed">
                La ocupación usa solicitudes pendientes y reservas confirmadas. Canceladas y completadas no consumen cupo.
              </p>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {data.capacityDays.map((day) => (
                <article
                  key={day.fecha}
                  className="border-pisao-gold/10 bg-pisao-carbon rounded-2xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-pisao-cream text-sm font-semibold capitalize">
                        {formatDay(day.fecha)}
                      </p>
                      <p className="text-pisao-cream-muted mt-1 text-[11px]">
                        {day.activeDiners} comensales activos en el día
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-pisao-gold text-lg font-semibold">
                        {day.peakPercent}%
                      </p>
                      <p className="text-pisao-cream-muted text-[9px] uppercase">
                        pico de franja
                      </p>
                    </div>
                  </div>

                  <div className="bg-pisao-noche mt-3 h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-pisao-gold h-full rounded-full"
                      style={{ width: `${Math.min(100, day.peakPercent)}%` }}
                    />
                  </div>

                  <p className="text-pisao-cream-muted mt-2 text-[10px]">
                    {day.busiestHour
                      ? `Mayor presión: ${day.busiestHour} · ${day.peakReserved}/${config.maxDinersPerSlot}`
                      : "Sin reservas activas todavía."}
                  </p>

                  {day.occupiedSlots.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {day.occupiedSlots.slice(0, 8).map((slot) => (
                        <span
                          key={slot.hora}
                          className="border-pisao-gold/15 text-pisao-cream-muted rounded-lg border px-2 py-1 text-[9px]"
                        >
                          {slot.hora} · {slot.reserved}/{slot.capacity}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

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
                {reservas!.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-pisao-gold/10 border-t align-top"
                  >
                    <td className="px-4 py-4">
                      <p className="text-pisao-cream font-semibold">
                        {reservation.nombre}
                      </p>
                      <a
                        href={whatsappHref(
                          reservation.telefono,
                          reservation.nombre,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pisao-gold mt-1 block text-xs hover:underline"
                      >
                        {reservation.telefono}
                      </a>
                      {reservation.email && (
                        <p className="text-pisao-cream-muted mt-1 text-[11px]">
                          {reservation.email}
                        </p>
                      )}
                    </td>
                    <td className="text-pisao-cream-muted px-4 py-4">
                      {reservation.fecha.toISOString().slice(0, 10)}
                    </td>
                    <td className="text-pisao-cream-muted px-4 py-4">
                      {reservation.hora}
                    </td>
                    <td className="text-pisao-cream-muted px-4 py-4">
                      {reservation.personas}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${badgeClass(
                          reservation.estado,
                        )}`}
                      >
                        {reservation.estado}
                      </span>
                    </td>
                    <td className="text-pisao-cream-muted max-w-[260px] px-4 py-4 text-xs leading-relaxed">
                      {reservation.notas || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <ReservationActions
                        id={reservation.id}
                        estado={reservation.estado}
                      />
                    </td>
                  </tr>
                ))}
                {reservas!.length === 0 && (
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
        </>
      )}
    </div>
  );
}
