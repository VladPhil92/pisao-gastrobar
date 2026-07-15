"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DatosCliente } from "../types";
import type { TipoEntrega } from "@/lib/cart/types";

export function StepEntrega({
  cliente,
  tipoEntrega,
  onNext,
}: {
  cliente: DatosCliente;
  tipoEntrega: TipoEntrega;
  onNext: (cliente: DatosCliente, tipoEntrega: TipoEntrega) => void;
}) {
  const [form, setForm] = useState(cliente);
  const [tipo, setTipo] = useState<TipoEntrega>(tipoEntrega);

  const inputClass =
    "mt-1 w-full rounded-lg border border-pisao-gold/20 bg-pisao-carbon-soft px-3 py-2 text-pisao-cream outline-none focus:border-pisao-gold";

  const valido =
    form.nombre.trim().length > 1 && form.telefono.trim().length > 6;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex gap-3">
        {(["RECOGIDA", "DOMICILIO"] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setTipo(opcion)}
            className={cn(
              "flex-1 rounded-lg border px-4 py-3 text-sm font-medium",
              tipo === opcion
                ? "border-pisao-gold bg-pisao-gold/10 text-pisao-gold"
                : "border-pisao-cream-muted/20 text-pisao-cream-muted",
            )}
          >
            {opcion === "RECOGIDA" ? "Recoger en tienda" : "Domicilio"}
          </button>
        ))}
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Nombre completo
        </label>
        <input
          className={inputClass}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">Teléfono</label>
        <input
          className={inputClass}
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Correo (opcional)
        </label>
        <input
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>

      {tipo === "DOMICILIO" && (
        <div>
          <label className="text-pisao-cream-muted text-sm">
            Dirección de entrega
          </label>
          <input
            className={inputClass}
            value={form.direccionEntrega}
            onChange={(e) =>
              setForm({ ...form, direccionEntrega: e.target.value })
            }
          />
        </div>
      )}

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Notas (opcional)
        </label>
        <textarea
          rows={2}
          className={inputClass}
          value={form.notas}
          onChange={(e) => setForm({ ...form, notas: e.target.value })}
        />
      </div>

      <Button
        variant="primary"
        disabled={!valido}
        onClick={() => onNext(form, tipo)}
      >
        Continuar
      </Button>
    </div>
  );
}
