"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  LoaderCircle,
  MapPin,
  Save,
  Users,
} from "lucide-react";

type TableConfig = {
  id: string;
  codigo: string;
  nombre: string;
  capacidad: number;
  zona: string;
  prioridad: number;
  combinable: boolean;
  activa: boolean;
  atributos: string[];
  posX: number;
  posY: number;
};

type EditableTable = TableConfig & {
  atributosText: string;
};

export function ReservableTableManager({
  tables,
  canConfigure,
}: {
  tables: TableConfig[];
  canConfigure: boolean;
}) {
  const router = useRouter();
  const initial = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        atributosText: table.atributos.join(", "),
      })),
    [tables],
  );
  const [rows, setRows] = useState<EditableTable[]>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const maxColumn = Math.max(1, ...rows.map((table) => table.posX + 1));
  const maxRow = Math.max(1, ...rows.map((table) => table.posY + 1));

  function updateRow(
    codigo: string,
    patch: Partial<EditableTable>,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.codigo === codigo ? { ...row, ...patch } : row,
      ),
    );
    setSaved(null);
  }

  async function save(row: EditableTable) {
    if (!canConfigure || saving) return;
    setSaving(row.codigo);
    setSaved(null);
    setError("");

    try {
      const response = await fetch("/api/admin/reservas/mesas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: row.codigo,
          nombre: row.nombre,
          capacidad: row.capacidad,
          zona: row.zona,
          prioridad: row.prioridad,
          combinable: row.combinable,
          activa: row.activa,
          atributos: row.atributosText
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          posX: row.posX,
          posY: row.posY,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar la mesa.");
      }

      setSaved(row.codigo);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible guardar la configuración.",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="border-pisao-gold/10 bg-pisao-noche mt-6 rounded-3xl border p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[.18em] uppercase">
            Inventario digital de mesas
          </p>
          <h2 className="font-display text-pisao-cream mt-1 text-2xl">
            T1–T8 configurables
          </h2>
          <p className="text-pisao-cream-muted mt-2 max-w-2xl text-xs leading-relaxed">
            Cada mesa tiene 4 puestos. Se pueden unir como máximo 3 mesas disponibles: 2 mesas = 6 personas y 3 = 8. El asignador nunca combinará 4 o más mesas para una sola reserva.
          </p>
        </div>
        {!canConfigure && (
          <span className="border-pisao-gold/15 text-pisao-cream-muted rounded-full border px-3 py-1.5 text-[10px]">
            Solo ADMIN puede modificar
          </span>
        )}
      </div>

      <div className="border-pisao-gold/10 bg-pisao-carbon mt-5 rounded-2xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-pisao-cream text-xs font-semibold">Plano lógico</p>
            <p className="text-pisao-cream-muted mt-0.5 text-[10px]">
              La cercanía de estas coordenadas participa en el desempate del asignador.
            </p>
          </div>
          <span className="text-pisao-cream-muted text-[9px]">
            {maxColumn} columnas · {maxRow} filas
          </span>
        </div>
        <div
          className="mt-4 grid gap-2 overflow-x-auto"
          style={{
            gridTemplateColumns: `repeat(${maxColumn}, minmax(88px, 1fr))`,
            gridTemplateRows: `repeat(${maxRow}, minmax(72px, auto))`,
          }}
        >
          {rows.map((table) => (
            <div
              key={"map-" + table.codigo}
              style={{
                gridColumnStart: table.posX + 1,
                gridRowStart: table.posY + 1,
              }}
              className={
                "rounded-xl border px-3 py-3 " +
                (table.activa
                  ? "border-pisao-gold/25 bg-pisao-gold/5"
                  : "border-white/5 bg-black/20 opacity-40")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-pisao-gold text-lg">
                  {table.codigo}
                </span>
                <span className="text-pisao-cream-muted text-[9px]">
                  {table.capacidad} pax
                </span>
              </div>
              <p className="text-pisao-cream-muted mt-1 truncate text-[9px]">
                {table.zona}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {rows.map((table) => (
          <article
            key={table.codigo}
            className={
              "rounded-2xl border p-4 transition " +
              (table.activa
                ? "border-pisao-gold/15 bg-pisao-carbon"
                : "border-white/5 bg-black/15 opacity-60")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-pisao-gold text-2xl">
                  {table.codigo}
                </p>
                <p className="text-pisao-cream-muted mt-0.5 text-[10px]">
                  Prioridad {table.prioridad}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-pisao-cream-muted">
                <input
                  type="checkbox"
                  checked={table.activa}
                  disabled={!canConfigure}
                  onChange={(event) =>
                    updateRow(table.codigo, { activa: event.target.checked })
                  }
                  className="accent-pisao-gold"
                />
                Reservable
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
                Capacidad
                <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2">
                  <Users className="text-pisao-gold size-3.5" />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    disabled={!canConfigure}
                    value={table.capacidad}
                    onChange={(event) =>
                      updateRow(table.codigo, {
                        capacidad: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    className="text-pisao-cream w-full bg-transparent text-xs outline-none"
                  />
                </span>
              </label>

              <label className="text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
                Prioridad
                <input
                  type="number"
                  min={0}
                  max={1000}
                  disabled={!canConfigure}
                  value={table.prioridad}
                  onChange={(event) =>
                    updateRow(table.codigo, {
                      prioridad: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2 text-xs text-pisao-cream outline-none"
                />
              </label>
            </div>

            <label className="mt-3 block text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
              Zona
              <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2">
                <MapPin className="text-pisao-gold size-3.5" />
                <input
                  type="text"
                  maxLength={80}
                  disabled={!canConfigure}
                  value={table.zona}
                  onChange={(event) =>
                    updateRow(table.codigo, { zona: event.target.value })
                  }
                  className="text-pisao-cream min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </span>
            </label>

            <label className="mt-3 block text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
              Atributos
              <input
                type="text"
                maxLength={220}
                disabled={!canConfigure}
                value={table.atributosText}
                placeholder="vista, baranda, interior..."
                onChange={(event) =>
                  updateRow(table.codigo, {
                    atributosText: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2 text-xs normal-case tracking-normal text-pisao-cream outline-none"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
                Columna
                <input
                  type="number"
                  min={0}
                  max={20}
                  disabled={!canConfigure}
                  value={table.posX}
                  onChange={(event) =>
                    updateRow(table.codigo, {
                      posX: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2 text-xs text-pisao-cream outline-none"
                />
              </label>
              <label className="text-[9px] font-semibold tracking-wide text-pisao-cream-muted uppercase">
                Fila
                <input
                  type="number"
                  min={0}
                  max={20}
                  disabled={!canConfigure}
                  value={table.posY}
                  onChange={(event) =>
                    updateRow(table.codigo, {
                      posY: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-pisao-gold/10 bg-pisao-noche px-2.5 py-2 text-xs text-pisao-cream outline-none"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[10px] text-pisao-cream-muted">
                <input
                  type="checkbox"
                  checked={table.combinable}
                  disabled={!canConfigure}
                  onChange={(event) =>
                    updateRow(table.codigo, {
                      combinable: event.target.checked,
                    })
                  }
                  className="accent-pisao-gold"
                />
                Se puede unir
              </label>

              {canConfigure && (
                <button
                  type="button"
                  disabled={Boolean(saving)}
                  onClick={() => void save(table)}
                  className="bg-pisao-gold text-pisao-carbon inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold disabled:opacity-50"
                >
                  {saving === table.codigo ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : saved === table.codigo ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saved === table.codigo ? "Guardada" : "Guardar"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
    </section>
  );
}
