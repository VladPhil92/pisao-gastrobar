import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  bogotaDateString,
  getReservationConfig,
  listAvailabilityForDate,
} from "@/lib/reservas/availability";
import { ReservationActions } from "@/components/admin/ReservationActions";
import { ReservableTableManager } from "@/components/admin/ReservableTableManager";

export const dynamic = "force-dynamic";

type CapacityDay = {
  fecha: string;
  activeDiners: number;
  peakReserved: number;
  peakPercent: number;
  peakTablesReserved: number;
  busiestHour: string | null;
  occupiedSlots: Array<{
    hora: string;
    reserved: number;
    capacity: number;
    tablesReserved: number;
    tablesCapacity: number;
  }>;
};

async function getReservationOperations() {
  try {
    const fechas = Array.from({ length: 7 }, (_, index) =>
      bogotaDateString(new Date(), index),
    );

    const [reservas, capacityDays, tables] = await Promise.all([
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
              tablesReserved: slot.tablesReserved,
              tablesCapacity: slot.tablesCapacity,
            }));

          const busiest = slots.reduce<
            {
              hora: string;
              reserved: number;
              capacity: number;
              tablesReserved: number;
              tablesCapacity: number;
            } | null
          >((current, slot) => {
            if (
              !current ||
              slot.tablesReserved > current.tablesReserved ||
              (slot.tablesReserved === current.tablesReserved &&
                slot.reserved > current.reserved)
            ) {
              return {
                hora: slot.hora,
                reserved: slot.reserved,
                capacity: slot.capacity,
                tablesReserved: slot.tablesReserved,
                tablesCapacity: slot.tablesCapacity,
              };
            }
            return current;
          }, null);

          const activeDiners = Math.max(
            0,
            ...slots.map((slot) => slot.reserved),
          );
          const peakReserved = busiest?.reserved ?? 0;
          const peakTablesReserved = busiest?.tablesReserved ?? 0;
          const peakPercent = busiest?.tablesCapacity
            ? Math.round(
                (peakTablesReserved / busiest.tablesCapacity) * 100,
              )
            : 0;

          return {
            fecha,
            activeDiners,
            peakReserved,
            peakPercent,
            peakTablesReserved,
            busiestHour:
              peakTablesReserved > 0 ? busiest?.hora ?? null : null,
            occupiedSlots,
          };
        }),
      ),
      prisma.mesaReservable.findMany({
        orderBy: [{ prioridad: "asc" }, { codigo: "asc" }],
      }),
    ]);

    return { reservas, capacityDays, tables };
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
  const [data, session] = await Promise.all([
    getReservationOperations(),
    auth(),
  ]);
  const config = getReservationConfig();
  const canConfigure =
    (session?.user as { rol?: string } | undefined)?.rol === "ADMIN";
  const today = bogotaDateString();

  const reservas = data?.reservas ?? null;
  const activeTables = data?.tables.filter((table) => table.activa) ?? [];
  const reservableSeats = activeTables.reduce(
    (sum, table) => sum + table.capacidad,
    0,
  );
  const futureActive =
    reservas?.filter(
      (reservation) =>
        reservation.fecha.toISOString().slice(0, 10) >= today &&
        ["PENDIENTE", "CONFIRMADA"].includes(reservation.estado),
    ) ?? [];

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
          Ocho mesas reservables con asignación automática; el resto de la terraza permanece libre por llegada.
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
                label: "Mesas reservables",
                value: activeTables.length,
                detail: "inventario activo en base de datos",
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
                label: "Capacidad reservable",
                value: reservableSeats,
                detail: "suma de capacidades activas",
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

          <ReservableTableManager
            tables={data.tables}
            canConfigure={canConfigure}
          />

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
                La ocupación cruza el inventario activo de mesas, su capacidad real y ventanas de{" "}
                {config.reservationDurationMinutes} minutos. Canceladas y completadas liberan inventario.
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
                      ? `Mayor presión: ${day.busiestHour} · ${day.peakTablesReserved}/${activeTables.length} mesas · ${day.peakReserved}/${reservableSeats} personas`
                      : "Sin reservas activas todavía."}
                  </p>

                  {day.occupiedSlots.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {day.occupiedSlots.slice(0, 8).map((slot) => (
                        <span
                          key={slot.hora}
                          className="border-pisao-gold/15 text-pisao-cream-muted rounded-lg border px-2 py-1 text-[9px]"
                        >
                          {slot.hora} · {slot.tablesReserved}/{slot.tablesCapacity} mesas · {slot.reserved}/{slot.capacity}
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
                  <th className="px-4 py-3">Mesa(s)</th>
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
                      {reservation.mesas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {reservation.mesas.map((mesa) => (
                            <span
                              key={mesa}
                              className="border-pisao-gold/20 bg-pisao-gold/5 text-pisao-gold rounded-md border px-2 py-1 text-[10px] font-semibold"
                            >
                              {mesa}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-pisao-cream-muted text-[10px]">
                          Reserva histórica
                        </span>
                      )}
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
                      colSpan={8}
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
