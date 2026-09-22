"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

type CalendarSlot = {
  hora: string;
  capacity: number;
  reserved: number;
  remaining: number;
  tablesCapacity: number;
  tablesReserved: number;
  tablesRemaining: number;
  tablesNeeded: number;
  available: boolean;
};

type CalendarDay = {
  fecha: string;
  status: "available" | "limited" | "full" | "closed";
  availableSlots: number;
  totalSlots: number;
  bestTime: string | null;
  maxRemaining: number;
  maxTablesRemaining: number;
  slots: CalendarSlot[];
};

type CalendarPayload = {
  personas: number;
  durationMinutes: number;
  slotMinutes: number;
  reservableTableCount: number;
  seatsPerTable: number;
  calendar: CalendarDay[];
  error?: string;
};

function dateParts(fecha: string) {
  const date = new Date(fecha + "T12:00:00-05:00");
  return {
    weekday: new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      timeZone: "America/Bogota",
    })
      .format(date)
      .replace(".", ""),
    day: new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      timeZone: "America/Bogota",
    }).format(date),
    month: new Intl.DateTimeFormat("es-CO", {
      month: "short",
      timeZone: "America/Bogota",
    })
      .format(date)
      .replace(".", ""),
    full: new Intl.DateTimeFormat("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "America/Bogota",
    }).format(date),
  };
}

function displayTime(hora: string) {
  const [hourString, minute] = hora.split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "p. m." : "a. m.";
  const displayHour = hour % 12 || 12;
  return displayHour + ":" + minute + " " + suffix;
}

function statusLabel(day: CalendarDay) {
  if (day.status === "closed") return "Cerrado";
  if (day.status === "full") return "Sin cupo";
  if (day.status === "limited") return "Últimos cupos";
  return "Disponible";
}

export function AvailabilityCalendar({
  personas,
  fecha,
  hora,
  onSelectDate,
  onSelectTime,
}: {
  personas: number | undefined;
  fecha?: string;
  hora?: string;
  onSelectDate: (fecha: string) => void;
  onSelectTime: (hora: string) => void;
}) {
  const normalizedPeople =
    Number.isInteger(personas) && Number(personas) >= 1 && Number(personas) <= 30
      ? Number(personas)
      : 2;

  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectionRef = useRef({ fecha, hora, onSelectDate, onSelectTime });

  useEffect(() => {
    selectionRef.current = { fecha, hora, onSelectDate, onSelectTime };
  }, [fecha, hora, onSelectDate, onSelectTime]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          personas: String(normalizedPeople),
          days: "30",
        });
        const response = await fetch(
          "/api/reservas/calendar?" + params.toString(),
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as CalendarPayload;

        if (!response.ok || !Array.isArray(data.calendar)) {
          throw new Error(data.error || "No fue posible cargar el calendario.");
        }

        setPayload(data);

        const currentSelection = selectionRef.current;
        const selectedStillAvailable = data.calendar.find(
          (day) =>
            day.fecha === currentSelection.fecha &&
            day.slots.some(
              (slot) =>
                slot.hora === currentSelection.hora && slot.available,
            ),
        );

        if (!selectedStillAvailable) {
          const firstDay = data.calendar.find((day) => day.availableSlots > 0);
          if (firstDay) {
            currentSelection.onSelectDate(firstDay.fecha);
            if (firstDay.bestTime) {
              currentSelection.onSelectTime(firstDay.bestTime);
            }
          }
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "No fue posible cargar el calendario.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedPeople]);

  const selectedDay = useMemo(
    () => payload?.calendar.find((day) => day.fecha === fecha) ?? null,
    [payload, fecha],
  );

  if (loading && !payload) {
    return (
      <div className="border-pisao-gold/15 bg-pisao-carbon/70 rounded-2xl border p-5">
        <div className="text-pisao-cream-muted flex items-center gap-2 text-sm">
          <LoaderCircle className="text-pisao-gold size-4 animate-spin" />
          Calculando disponibilidad real…
        </div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="border-pisao-gold/15 bg-pisao-carbon rounded-2xl border p-5">
        <div className="flex gap-3">
          <TriangleAlert className="text-pisao-gold mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-pisao-cream text-sm font-semibold">
              Calendario temporalmente no disponible
            </p>
            <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <section className="border-pisao-gold/15 bg-pisao-carbon/60 overflow-hidden rounded-2xl border">
      <div className="border-pisao-gold/10 flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <div>
          <div className="text-pisao-gold flex items-center gap-2 text-[10px] font-semibold tracking-[.18em] uppercase">
            <Sparkles className="size-3.5" />
            Calendario inteligente
          </div>
          <h4 className="font-display text-pisao-cream mt-1 text-xl">
            Disponibilidad en tiempo real
          </h4>
          <p className="text-pisao-cream-muted mt-1 max-w-xl text-xs leading-relaxed">
            El motor cruza las {payload.reservableTableCount} mesas reservables, el tamaño del grupo y una ocupación de {payload.durationMinutes} minutos. El resto de la terraza permanece libre por llegada.
          </p>
        </div>
        <div className="border-pisao-gold/15 text-pisao-cream-muted flex items-center gap-2 rounded-full border px-3 py-2 text-xs">
          <Users className="text-pisao-gold size-3.5" />
          {normalizedPeople} {normalizedPeople === 1 ? "persona" : "personas"} · {Math.ceil(normalizedPeople / payload.seatsPerTable)} {Math.ceil(normalizedPeople / payload.seatsPerTable) === 1 ? "mesa" : "mesas"}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-pisao-cream-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" /> Disponible
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-pisao-gold" /> Últimos cupos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red-400/80" /> Sin cupo
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7">
          {payload.calendar.map((day) => {
            const parts = dateParts(day.fecha);
            const selected = day.fecha === fecha;
            const disabled = day.availableSlots === 0;
            const dotClass =
              day.status === "available"
                ? "bg-emerald-400"
                : day.status === "limited"
                  ? "bg-pisao-gold"
                  : "bg-red-400/80";

            return (
              <button
                key={day.fecha}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelectDate(day.fecha);
                  const chosen =
                    day.slots.find((slot) => slot.hora === hora && slot.available)
                      ?.hora ?? day.bestTime;
                  if (chosen) onSelectTime(chosen);
                }}
                aria-label={parts.full + ". " + statusLabel(day)}
                aria-pressed={selected}
                className={
                  "relative min-h-20 rounded-xl border px-2 py-2.5 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 " +
                  (selected
                    ? "border-pisao-gold bg-pisao-gold/12 shadow-[0_0_0_1px_rgba(199,154,58,.12)]"
                    : "border-pisao-gold/10 bg-pisao-noche hover:border-pisao-gold/35 hover:bg-pisao-gold/5")
                }
              >
                <span className="text-pisao-cream-muted block text-[9px] font-semibold uppercase">
                  {parts.weekday}
                </span>
                <span className="font-display text-pisao-cream mt-0.5 block text-2xl leading-none">
                  {parts.day}
                </span>
                <span className="text-pisao-cream-muted mt-1 block text-[9px] capitalize">
                  {parts.month}
                </span>
                <span className={"absolute top-2 right-2 size-2 rounded-full " + dotClass} />
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="border-pisao-gold/10 mt-5 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-pisao-cream text-sm font-semibold capitalize">
                  {dateParts(selectedDay.fecha).full}
                </p>
                <p className="text-pisao-cream-muted mt-0.5 text-[10px]">
                  {selectedDay.availableSlots} franjas disponibles
                </p>
              </div>
              {selectedDay.bestTime && (
                <span className="bg-pisao-green/15 text-pisao-cream inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px]">
                  <CheckCircle2 className="size-3.5" />
                  Mejor disponibilidad: {displayTime(selectedDay.bestTime)}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {selectedDay.slots.map((slot) => (
                <button
                  key={slot.hora}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onSelectTime(slot.hora)}
                  aria-pressed={slot.hora === hora}
                  className={
                    "rounded-xl border px-3 py-2.5 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-35 " +
                    (slot.hora === hora
                      ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                      : "border-pisao-gold/12 bg-pisao-noche text-pisao-cream hover:border-pisao-gold/40")
                  }
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Clock3 className="size-3.5" />
                    {displayTime(slot.hora)}
                  </span>
                  <span
                    className={
                      "mt-1 block text-[9px] " +
                      (slot.hora === hora
                        ? "text-pisao-carbon/70"
                        : "text-pisao-cream-muted")
                    }
                  >
                    {slot.available
                      ? slot.tablesRemaining + " mesas libres · " + slot.remaining + " cupos"
                      : "Sin mesas reservables suficientes"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-amber-200 mt-4 text-[10px]">
            {error} Se mantienen los últimos datos disponibles en pantalla.
          </p>
        )}

        <p className="text-pisao-cream-muted/70 mt-4 text-[9px] leading-relaxed">
          Cada confirmación vuelve a validar y asignar mesas del inventario T1–T{payload.reservableTableCount} dentro de una transacción antes de bloquear la franja.
        </p>
      </div>
    </section>
  );
}
