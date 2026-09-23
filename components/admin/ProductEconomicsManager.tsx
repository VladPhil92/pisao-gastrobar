"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CircleDollarSign,
  LoaderCircle,
  PackageCheck,
  Save,
} from "lucide-react";

type ProductRow = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  costoUnitario: number | null;
  disponible: boolean;
  inventarioBajo: boolean;
  costoActualizadoAt: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function marginPct(price: number, cost: number | null) {
  if (cost === null || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

export function ProductEconomicsManager({
  products,
}: {
  products: ProductRow[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        cost: string;
        available: boolean;
        lowInventory: boolean;
      }
    >
  >(() =>
    Object.fromEntries(
      products.map((product) => [
        product.id,
        {
          cost:
            product.costoUnitario === null
              ? ""
              : String(Math.round(product.costoUnitario)),
          available: product.disponible,
          lowInventory: product.inventarioBajo,
        },
      ]),
    ),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = useMemo(() => {
    const configured = products.filter(
      (product) => product.costoUnitario !== null,
    ).length;
    const available = products.filter((product) => product.disponible).length;
    const low = products.filter((product) => product.inventarioBajo).length;
    return {
      configured,
      coverage: products.length
        ? Math.round((configured / products.length) * 100)
        : 0,
      available,
      low,
    };
  }, [products]);

  function updateDraft(
    id: string,
    patch: Partial<(typeof drafts)[string]>,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function save(product: ProductRow) {
    const draft = drafts[product.id];
    if (!draft) return;

    const normalized = draft.cost.trim().replace(/[.$\s]/g, "");
    const parsedCost = normalized === "" ? null : Number(normalized);

    if (
      parsedCost !== null &&
      (!Number.isFinite(parsedCost) || parsedCost < 0)
    ) {
      setMessage("El costo debe ser un valor numérico positivo o quedar vacío.");
      return;
    }

    setBusy(product.id);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/products/" + product.id + "/economics",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            costoUnitario: parsedCost,
            disponible: draft.available,
            inventarioBajo: draft.available ? draft.lowInventory : false,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar el producto.");
      }

      setMessage(product.nombre + " actualizado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error actualizando producto.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
          <CircleDollarSign className="size-4 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
            Cobertura de costos
          </p>
          <p className="font-display mt-1 text-2xl text-pisao-cream">
            {summary.coverage}%
          </p>
          <p className="mt-1 text-xs text-pisao-cream-muted">
            {summary.configured}/{products.length} productos
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
          <PackageCheck className="size-4 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
            Disponibles
          </p>
          <p className="font-display mt-1 text-2xl text-pisao-cream">
            {summary.available}
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
          <AlertTriangle className="size-4 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
            Inventario bajo
          </p>
          <p className="font-display mt-1 text-2xl text-pisao-cream">
            {summary.low}
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
          <Check className="size-4 text-pisao-gold" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
            Regla V5
          </p>
          <p className="mt-2 text-xs leading-relaxed text-pisao-cream">
            Agotado bloquea venta. Inventario bajo permite venta, pero no
            promoción proactiva.
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-pisao-gold/10 bg-pisao-noche/50 px-4 py-3 text-xs text-pisao-cream-muted">
          {message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-pisao-gold/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Costo unitario</th>
              <th className="px-4 py-3">Margen contribución</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Inventario bajo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const draft = drafts[product.id];
              const parsedDraftCost =
                draft?.cost.trim() === ""
                  ? null
                  : Number(draft?.cost.replace(/[.$\s]/g, ""));
              const margin = marginPct(
                product.precio,
                Number.isFinite(parsedDraftCost)
                  ? parsedDraftCost
                  : product.costoUnitario,
              );

              return (
                <tr
                  key={product.id}
                  className="border-t border-pisao-gold/10"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-pisao-cream">{product.nombre}</p>
                    <p className="text-xs text-pisao-cream-muted">
                      {product.categoria}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-pisao-cream">
                    {money(product.precio)}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      inputMode="numeric"
                      value={draft?.cost ?? ""}
                      onChange={(event) =>
                        updateDraft(product.id, { cost: event.target.value })
                      }
                      placeholder="Sin configurar"
                      className="w-36 rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-pisao-cream outline-none focus:border-pisao-gold/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-pisao-cream">
                      {margin === null ? "Sin datos" : margin.toFixed(1) + "%"}
                    </p>
                    {margin !== null && (
                      <p className="text-xs text-pisao-cream-muted">
                        {money(
                          product.precio -
                            (Number.isFinite(parsedDraftCost)
                              ? parsedDraftCost!
                              : product.costoUnitario ?? 0),
                        )}{" "}
                        por unidad
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={draft?.available ?? product.disponible}
                      onChange={(event) =>
                        updateDraft(product.id, {
                          available: event.target.checked,
                          ...(event.target.checked
                            ? {}
                            : { lowInventory: false }),
                        })
                      }
                      className="size-4 accent-current"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      disabled={!(draft?.available ?? product.disponible)}
                      checked={draft?.lowInventory ?? product.inventarioBajo}
                      onChange={(event) =>
                        updateDraft(product.id, {
                          lowInventory: event.target.checked,
                        })
                      }
                      className="size-4 accent-current disabled:opacity-30"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void save(product)}
                      className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-3 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-50"
                    >
                      {busy === product.id ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
