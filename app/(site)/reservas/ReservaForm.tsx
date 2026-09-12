"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send, TriangleAlert } from "lucide-react";
import { reservaSchema, type ReservaFormValues } from "@/lib/reservas/schema";
import { Button } from "@/components/ui/Button";

const inputClass =
  "mt-2 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none transition placeholder:text-pisao-cream-muted/45 focus:border-pisao-gold/70 focus:ring-2 focus:ring-pisao-gold/10";
const labelClass =
  "text-[10px] font-semibold tracking-[0.16em] text-pisao-cream-muted uppercase";

export function ReservaForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReservaFormValues>({ resolver: zodResolver(reservaSchema) });

  const onSubmit = async (values: ReservaFormValues) => {
    setStatus("idle");
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Error al crear la reserva");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
          <input type="date" {...register("fecha")} className={inputClass} />
          {errors.fecha && (
            <p className="mt-1.5 text-xs text-red-400">{errors.fecha.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Hora</label>
          <input type="time" {...register("hora")} className={inputClass} />
          {errors.hora && (
            <p className="mt-1.5 text-xs text-red-400">{errors.hora.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Personas</label>
          <input
            type="number"
            min={1}
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
          placeholder="Celebración, preferencia de ubicación, requerimiento especial..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="border-t border-pisao-gold/10 pt-5">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          <Send className="size-4" />
          {isSubmitting ? "Enviando solicitud..." : "Solicitar reserva"}
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-pisao-cream-muted">
          Enviar esta solicitud no confirma disponibilidad inmediata. El equipo de PISÁO valida y confirma la reserva.
        </p>
      </div>

      <div aria-live="polite">
        {status === "success" && (
          <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <p>Solicitud recibida. Nuestro equipo se pondrá en contacto para confirmar los detalles.</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>No pudimos enviar la solicitud. Intenta nuevamente.</p>
          </div>
        )}
      </div>
    </form>
  );
}
