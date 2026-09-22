"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock3, Send, TriangleAlert } from "lucide-react";
import { reservaSchema, type ReservaFormValues } from "@/lib/reservas/schema";
import { Button } from "@/components/ui/Button";
import { trackBehavior } from "@/lib/analytics/behavioral-client";

const inputClass =
  "mt-2 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none transition placeholder:text-pisao-cream-muted/45 focus:border-pisao-gold/70 focus:ring-2 focus:ring-pisao-gold/10";
const labelClass =
  "text-[10px] font-semibold tracking-[0.16em] text-pisao-cream-muted uppercase";

type SubmitState =
  | { kind: "idle" }
  | { kind: "success"; code: string }
  | { kind: "error"; message: string; alternatives: string[] };

function bogotaToday() {
  const shifted = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function ReservaForm() {
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const [started, setStarted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({ resolver: zodResolver(reservaSchema) });

  const markStarted = () => {
    if (started) return;
    setStarted(true);
    trackBehavior("reservation_start", { surface: "reservation" });
  };

  const onSubmit = async (values: ReservaFormValues) => {
    setStatus({ kind: "idle" });

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await res.json()) as {
        reserva?: { id: string };
        error?: string;
        alternatives?: string[];
      };

      if (!res.ok || !payload.reserva) {
        setStatus({
          kind: "error",
          message:
            payload.error ??
            "No pudimos registrar la solicitud. Intenta nuevamente.",
          alternatives: payload.alternatives ?? [],
        });
        return;
      }

      trackBehavior("reservation_submit_success", {
        surface: "reservation",
        diners: values.personas,
      });

      setStatus({
        kind: "success",
        code: payload.reserva.id.slice(-8).toUpperCase(),
      });
      reset();
      setStarted(false);
    } catch {
      setStatus({
        kind: "error",
        message:
          "El servicio de reservas no está disponible en este momento. Intenta nuevamente.",
        alternatives: [],
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocusCapture={markStarted}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre completo</label>
          <input
            {...register("nombre")}
            placeholder="¿A nombre de quién?"
            autoComplete="name"
            className={inputClass}
          />
          {errors.nombre && (
            <p className="mt-1.5 text-xs text-red-400">{errors.nombre.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Teléfono</label>
          <input
            {...register("telefono")}
            placeholder="Tu número de contacto"
            autoComplete="tel"
            className={inputClass}
          />
          {errors.telefono && (
            <p className="mt-1.5 text-xs text-red-400">{errors.telefono.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Correo · opcional</label>
        <input
          {...register("email")}
          type="email"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          className={inputClass}
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Fecha</label>
          <input
            type="date"
            min={bogotaToday()}
            {...register("fecha")}
            className={inputClass}
          />
          {errors.fecha && (
            <p className="mt-1.5 text-xs text-red-400">{errors.fecha.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Hora</label>
          <input
            type="time"
            step={1800}
            {...register("hora")}
            className={inputClass}
          />
          {errors.hora && (
            <p className="mt-1.5 text-xs text-red-400">{errors.hora.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Personas</label>
          <input
            type="number"
            min={1}
            max={30}
            placeholder="2"
            {...register("personas", { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.personas && (
            <p className="mt-1.5 text-xs text-red-400">{errors.personas.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Cuéntanos algo más · opcional</label>
        <textarea
          {...register("notas")}
          rows={4}
          maxLength={500}
          placeholder="Celebración, preferencia de ubicación, requerimiento especial..."
          className={`${inputClass} resize-none`}
        />
        {errors.notas && (
          <p className="mt-1.5 text-xs text-red-400">{errors.notas.message}</p>
        )}
      </div>

      <div className="border-t border-pisao-gold/10 pt-5">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          <Send className="size-4" />
          {isSubmitting ? "Verificando disponibilidad..." : "Solicitar reserva"}
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-pisao-cream-muted">
          El sistema verifica capacidad antes de registrar la solicitud. La reserva queda pendiente hasta que el equipo de PISÁO la confirme.
        </p>
      </div>

      <div aria-live="polite">
        {status.kind === "success" && (
          <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Solicitud registrada correctamente.</p>
              <p className="mt-1 text-xs text-emerald-200/80">
                Código {status.code}. El equipo confirmará la reserva por tus datos de contacto.
              </p>
            </div>
          </div>
        )}

        {status.kind === "error" && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            <div className="flex gap-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" />
              <p>{status.message}</p>
            </div>

            {status.alternatives.length > 0 && (
              <div className="mt-3 border-t border-red-300/10 pt-3">
                <p className="text-xs text-red-200/80">Prueba una hora disponible:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {status.alternatives.map((hora) => (
                    <button
                      key={hora}
                      type="button"
                      onClick={() => {
                        setValue("hora", hora, { shouldValidate: true });
                        setStatus({ kind: "idle" });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-300/10"
                    >
                      <Clock3 className="size-3.5" />
                      {hora}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
