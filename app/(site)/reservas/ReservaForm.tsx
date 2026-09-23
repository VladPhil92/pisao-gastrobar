"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clock3,
  Send,
  TriangleAlert,
} from "lucide-react";
import { reservaSchema, type ReservaFormValues } from "@/lib/reservas/schema";
import { Button } from "@/components/ui/Button";
import { AvailabilityCalendar } from "@/components/reservas/AvailabilityCalendar";
import { trackBehavior } from "@/lib/analytics/behavioral-client";
import { MAX_AUTOMATIC_RESERVATION_PEOPLE } from "@/lib/reservas/policy";
import { TurnstileGate } from "@/components/security/TurnstileGate";

const inputClass =
  "mt-2 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none transition placeholder:text-pisao-cream-muted/45 focus:border-pisao-gold/70 focus:ring-2 focus:ring-pisao-gold/10";
const labelClass =
  "text-[10px] font-semibold tracking-[0.16em] text-pisao-cream-muted uppercase";

type SubmitState =
  | { kind: "idle" }
  | { kind: "success"; code: string; mesas: string[] }
  | { kind: "error"; message: string; alternatives: string[] };

export function ReservaForm() {
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const [started, setStarted] = useState(false);
  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({
    resolver: zodResolver(reservaSchema),
    defaultValues: { personas: 2 },
  });

  const fecha = useWatch({ control, name: "fecha" });
  const hora = useWatch({ control, name: "hora" });
  const personas = useWatch({ control, name: "personas" });

  const markStarted = () => {
    if (started) return;
    setStarted(true);
    trackBehavior("reservation_start", { surface: "reservation" });
  };

  const onSubmit = async (values: ReservaFormValues) => {
    setStatus({ kind: "idle" });

    if (turnstileRequired && !turnstileToken) {
      setStatus({
        kind: "error",
        message:
          "La verificación de seguridad todavía no está lista. Intenta nuevamente en un momento.",
        alternatives: [],
      });
      return;
    }

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken
            ? { "X-Turnstile-Token": turnstileToken }
            : {}),
        },
        body: JSON.stringify(values),
      });

      const payload = (await res.json()) as {
        reserva?: { id: string; estado?: string; mesas?: string[] };
        error?: string;
        alternatives?: string[];
      };

      if (!res.ok || !payload.reserva) {
        setStatus({
          kind: "error",
          message:
            payload.error ??
            "No pudimos registrar la reserva. Intenta nuevamente.",
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
        mesas: payload.reserva.mesas ?? [],
      });
      reset({ personas: 2 });
      setStarted(false);
    } catch {
      setStatus({
        kind: "error",
        message:
          "El servicio de reservas no está disponible en este momento. Intenta nuevamente.",
        alternatives: [],
      });
    } finally {
      setTurnstileToken(null);
      setTurnstileResetKey((current) => current + 1);
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

      <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
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

        <div>
          <label className={labelClass}>Personas</label>
          <input
            type="number"
            min={1}
            max={MAX_AUTOMATIC_RESERVATION_PEOPLE}
            placeholder="2"
            {...register("personas", { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.personas && (
            <p className="mt-1.5 text-xs text-red-400">{errors.personas.message}</p>
          )}
          <p className="text-pisao-cream-muted mt-1.5 text-[10px] leading-relaxed">
            Reserva automática hasta {MAX_AUTOMATIC_RESERVATION_PEOPLE} personas:
            máximo 3 mesas unidas. Para grupos mayores, contáctanos para coordinar
            una distribución especial.
          </p>
        </div>
      </div>

      <input type="hidden" {...register("fecha")} />
      <input type="hidden" {...register("hora")} />

      <AvailabilityCalendar
        personas={personas}
        fecha={fecha}
        hora={hora}
        onSelectDate={(nextDate) => {
          setValue("fecha", nextDate, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setStatus({ kind: "idle" });
        }}
        onSelectTime={(nextTime) => {
          setValue("hora", nextTime, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setStatus({ kind: "idle" });
        }}
      />

      {(errors.fecha || errors.hora) && (
        <div className="border-red-400/20 bg-red-400/5 rounded-xl border p-3 text-xs text-red-300">
          {errors.fecha?.message || errors.hora?.message}
        </div>
      )}

      {fecha && hora && (
        <div className="border-pisao-gold/15 bg-pisao-gold/5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-xs">
          <span className="text-pisao-cream flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="text-emerald-400 size-4" />
            Franja seleccionada
          </span>
          <span className="text-pisao-cream-muted">{fecha}</span>
          <span className="text-pisao-cream-muted flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {hora}
          </span>
        </div>
      )}

      <div>
        <label className={labelClass}>Cuéntanos algo más · opcional</label>
        <textarea
          {...register("notas")}
          rows={4}
          maxLength={500}
          placeholder="Celebración, preferencia de ubicación, requerimiento especial..."
          className={inputClass + " resize-none"}
        />
        {errors.notas && (
          <p className="mt-1.5 text-xs text-red-400">{errors.notas.message}</p>
        )}
      </div>

      <TurnstileGate
        action="reservation"
        resetKey={turnstileResetKey}
        onTokenChange={setTurnstileToken}
        className="min-h-0"
      />

      <div className="border-t border-pisao-gold/10 pt-5">
        <Button
          type="submit"
          variant="primary"
          disabled={
            isSubmitting ||
            !fecha ||
            !hora ||
            (turnstileRequired && !turnstileToken)
          }
          className="w-full sm:w-auto"
        >
          <Send className="size-4" />
          {isSubmitting ? "Confirmando reserva..." : "Confirmar reserva"}
        </Button>
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-pisao-cream-muted">
          PISÁO vuelve a validar toda la ventana de ocupación en el instante de confirmar. Si otro cliente toma el último cupo antes que tú, el sistema propondrá automáticamente las horas más cercanas.
        </p>
      </div>

      <div aria-live="polite">
        {status.kind === "success" && (
          <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Reserva confirmada automáticamente.</p>
              <p className="mt-1 text-xs text-emerald-200/80">
                Código {status.code}.
                {status.mesas.length > 0
                  ? ` Mesa(s) asignada(s): ${status.mesas.join(", ")}.`
                  : ""} El cupo ya quedó descontado del calendario de PISÁO.
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
                <p className="text-xs text-red-200/80">
                  El motor encontró estas horas cercanas:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {status.alternatives.map((alternative) => (
                    <button
                      key={alternative}
                      type="button"
                      onClick={() => {
                        setValue("hora", alternative, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setStatus({ kind: "idle" });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/20 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-300/10"
                    >
                      <Clock3 className="size-3.5" />
                      {alternative}
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
