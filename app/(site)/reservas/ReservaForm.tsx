"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reservaSchema, type ReservaFormValues } from "@/lib/reservas/schema";
import { Button } from "@/components/ui/Button";

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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div>
        <label className="text-pisao-cream-muted text-sm">
          Nombre completo
        </label>
        <input
          {...register("nombre")}
          className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
        />
        {errors.nombre && (
          <p className="mt-1 text-xs text-red-400">{errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">Teléfono</label>
        <input
          {...register("telefono")}
          className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
        />
        {errors.telefono && (
          <p className="mt-1 text-xs text-red-400">{errors.telefono.message}</p>
        )}
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Correo (opcional)
        </label>
        <input
          {...register("email")}
          className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-pisao-cream-muted text-sm">Fecha</label>
          <input
            type="date"
            {...register("fecha")}
            className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
          />
        </div>
        <div>
          <label className="text-pisao-cream-muted text-sm">Hora</label>
          <input
            type="time"
            {...register("hora")}
            className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
          />
        </div>
        <div>
          <label className="text-pisao-cream-muted text-sm">Personas</label>
          <input
            type="number"
            min={1}
            {...register("personas", { valueAsNumber: true })}
            className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Notas (opcional)
        </label>
        <textarea
          {...register("notas")}
          rows={3}
          className="border-pisao-gold/20 bg-pisao-carbon-soft text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
        />
      </div>

      <Button type="submit" variant="primary" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Confirmar reserva"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-emerald-400">
          ¡Reserva recibida! Te confirmaremos por WhatsApp muy pronto.
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-400">
          Ocurrió un error al enviar tu reserva. Intenta de nuevo.
        </p>
      )}
    </form>
  );
}
