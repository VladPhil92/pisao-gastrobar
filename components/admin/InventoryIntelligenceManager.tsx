"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ChefHat,
  CircleDollarSign,
  LoaderCircle,
  PackagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  calculateRecipeCost,
  calculateRecipeInventoryRisk,
} from "@/lib/inventory/core";

type IngredientRow = {
  id: string;
  nombre: string;
  unidadBase: "GRAMO" | "MILILITRO" | "UNIDAD";
  stockActual: number;
  stockMinimo: number;
  costoUnidadBase: number | null;
  costoCompraReferencia: number | null;
  cantidadCompraReferencia: number | null;
  activo: boolean;
  ultimaRevisionAt: string | null;
  recipeCount: number;
  theoreticalUsage14d: number;
  averageDailyConsumption: number;
  daysOfCover: number | null;
};

type RecipeLine = {
  insumoId: string;
  cantidadBase: number;
  mermaPct: number;
};

type ProductRow = {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  costoUnitario: number | null;
  inventarioBajoManual: boolean;
  inventarioBajoReceta: boolean;
  theoreticalCost: number | null;
  costComplete: boolean;
  costCoverage: number;
  estimatedPortions: number | null;
  recipeLow: boolean;
  recipeBlocked: boolean;
  soldUnits14d: number;
  recipe: RecipeLine[];
};

type Props = {
  ingredients: IngredientRow[];
  products: ProductRow[];
  windowDays: number;
};

type IngredientDraft = {
  stockMinimo: string;
  purchaseCost: string;
  purchaseQuantity: string;
  active: boolean;
  countStock: string;
  movementType: "ENTRADA" | "SALIDA" | "MERMA";
  movementQuantity: string;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number, digits = 1) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: digits,
  }).format(value);
}

function unitLabel(unit: IngredientRow["unidadBase"]) {
  if (unit === "GRAMO") return "g";
  if (unit === "MILILITRO") return "ml";
  return "und";
}

function buildIngredientDrafts(ingredients: IngredientRow[]) {
  return Object.fromEntries(
    ingredients.map((ingredient) => [
      ingredient.id,
      {
        stockMinimo: String(ingredient.stockMinimo),
        purchaseCost:
          ingredient.costoCompraReferencia === null
            ? ""
            : String(ingredient.costoCompraReferencia),
        purchaseQuantity:
          ingredient.cantidadCompraReferencia === null
            ? ""
            : String(ingredient.cantidadCompraReferencia),
        active: ingredient.activo,
        countStock: String(ingredient.stockActual),
        movementType: "ENTRADA" as const,
        movementQuantity: "",
      },
    ]),
  ) as Record<string, IngredientDraft>;
}

function buildRecipeDrafts(products: ProductRow[]) {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      product.recipe.map((line) => ({ ...line })),
    ]),
  ) as Record<string, RecipeLine[]>;
}

export function InventoryIntelligenceManager(props: Props) {
  return (
    <InventoryIntelligenceEditor
      key={JSON.stringify([props.ingredients, props.products, props.windowDays])}
      {...props}
    />
  );
}

function InventoryIntelligenceEditor({
  ingredients,
  products,
  windowDays,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState({
    nombre: "",
    unidadBase: "GRAMO" as IngredientRow["unidadBase"],
    stockActual: "",
    stockMinimo: "",
    purchaseCost: "",
    purchaseQuantity: "",
  });
  const [ingredientDrafts, setIngredientDrafts] = useState(() =>
    buildIngredientDrafts(ingredients),
  );
  const [recipeDrafts, setRecipeDrafts] = useState(() =>
    buildRecipeDrafts(products),
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products[0]?.id ?? "",
  );


  const summary = useMemo(() => {
    const recipeConfigured = products.filter(
      (product) => product.recipe.length > 0,
    ).length;
    const ingredientCostConfigured = ingredients.filter(
      (ingredient) => ingredient.costoUnidadBase !== null,
    ).length;
    const critical = ingredients.filter(
      (ingredient) =>
        ingredient.activo &&
        (ingredient.stockActual <= 0 ||
          ingredient.stockActual <= ingredient.stockMinimo),
    ).length;

    return {
      recipeCoverage: products.length
        ? Math.round((recipeConfigured / products.length) * 100)
        : 0,
      ingredientCostCoverage: ingredients.length
        ? Math.round((ingredientCostConfigured / ingredients.length) * 100)
        : 0,
      critical,
      ingredients: ingredients.length,
    };
  }, [ingredients, products]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );
  const selectedDraft = useMemo(
    () => (selectedProduct ? recipeDrafts[selectedProduct.id] ?? [] : []),
    [recipeDrafts, selectedProduct],
  );

  const liveRecipe = useMemo(() => {
    const lines = selectedDraft
      .map((line) => {
        const ingredient = ingredients.find(
          (item) => item.id === line.insumoId,
        );
        if (!ingredient) return null;
        return {
          ingredientId: ingredient.id,
          quantityBase: Number(line.cantidadBase),
          wastePct: Number(line.mermaPct),
          unitCost: ingredient.costoUnidadBase,
          stock: ingredient.stockActual,
          minimumStock: ingredient.stockMinimo,
          active: ingredient.activo,
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    return {
      cost: calculateRecipeCost(lines),
      risk: calculateRecipeInventoryRisk(lines),
    };
  }, [ingredients, selectedDraft]);

  function updateIngredientDraft(
    id: string,
    patch: Partial<IngredientDraft>,
  ) {
    setIngredientDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function createIngredient() {
    const stockActual = Number(newIngredient.stockActual || 0);
    const stockMinimo = Number(newIngredient.stockMinimo || 0);
    const purchaseCost =
      newIngredient.purchaseCost.trim() === ""
        ? null
        : Number(newIngredient.purchaseCost);
    const purchaseQuantity =
      newIngredient.purchaseQuantity.trim() === ""
        ? null
        : Number(newIngredient.purchaseQuantity);

    setBusy("create");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/inventory/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newIngredient.nombre,
          unidadBase: newIngredient.unidadBase,
          stockActual,
          stockMinimo,
          costoCompraReferencia: purchaseCost,
          cantidadCompraReferencia: purchaseQuantity,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible crear el insumo.");
      }
      setNewIngredient({
        nombre: "",
        unidadBase: "GRAMO",
        stockActual: "",
        stockMinimo: "",
        purchaseCost: "",
        purchaseQuantity: "",
      });
      setMessage("Insumo creado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error creando el insumo.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveIngredient(ingredient: IngredientRow) {
    const draft = ingredientDrafts[ingredient.id];
    if (!draft) return;

    const purchaseCost =
      draft.purchaseCost.trim() === "" ? null : Number(draft.purchaseCost);
    const purchaseQuantity =
      draft.purchaseQuantity.trim() === ""
        ? null
        : Number(draft.purchaseQuantity);

    setBusy("ingredient:" + ingredient.id);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/inventory/ingredients/" + ingredient.id,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stockMinimo: Number(draft.stockMinimo || 0),
            activo: draft.active,
            costoCompraReferencia: purchaseCost,
            cantidadCompraReferencia: purchaseQuantity,
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar el insumo.");
      }
      setMessage(ingredient.nombre + " actualizado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error actualizando el insumo.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function postStock(
    ingredient: IngredientRow,
    body: Record<string, unknown>,
    label: string,
  ) {
    setBusy("stock:" + ingredient.id);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/inventory/ingredients/" + ingredient.id + "/stock",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible registrar el movimiento.");
      }
      setMessage(label + " registrado para " + ingredient.nombre + ".");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error registrando stock.",
      );
    } finally {
      setBusy(null);
    }
  }

  function updateRecipeLine(
    productId: string,
    index: number,
    patch: Partial<RecipeLine>,
  ) {
    setRecipeDrafts((current) => ({
      ...current,
      [productId]: (current[productId] ?? []).map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addRecipeLine(productId: string) {
    const current = recipeDrafts[productId] ?? [];
    const available = ingredients.find(
      (ingredient) =>
        ingredient.activo &&
        !current.some((line) => line.insumoId === ingredient.id),
    );
    if (!available) {
      setMessage("No hay otro insumo activo disponible para agregar.");
      return;
    }

    setRecipeDrafts((drafts) => ({
      ...drafts,
      [productId]: [
        ...(drafts[productId] ?? []),
        { insumoId: available.id, cantidadBase: 1, mermaPct: 0 },
      ],
    }));
  }

  function removeRecipeLine(productId: string, index: number) {
    setRecipeDrafts((current) => ({
      ...current,
      [productId]: (current[productId] ?? []).filter(
        (_, lineIndex) => lineIndex !== index,
      ),
    }));
  }

  async function saveRecipe(product: ProductRow) {
    const lines = recipeDrafts[product.id] ?? [];
    setBusy("recipe:" + product.id);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/inventory/products/" + product.id + "/recipe",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: lines }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "No fue posible guardar la receta.");
      }
      setMessage("Receta de " + product.nombre + " actualizada.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error guardando la receta.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ChefHat}
          label="Cobertura de recetas"
          value={summary.recipeCoverage + "%"}
          detail={
            products.filter((product) => product.recipe.length > 0).length +
            "/" +
            products.length +
            " productos"
          }
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Costo de insumos"
          value={summary.ingredientCostCoverage + "%"}
          detail="Cobertura de costo por unidad base"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Insumos críticos"
          value={String(summary.critical)}
          detail="Sin stock o por debajo del mínimo"
        />
        <MetricCard
          icon={Boxes}
          label="Insumos activos"
          value={String(
            ingredients.filter((ingredient) => ingredient.activo).length,
          )}
          detail={summary.ingredients + " registrados"}
        />
      </div>

      {message && (
        <p className="rounded-2xl border border-pisao-gold/15 bg-pisao-noche/60 px-4 py-3 text-sm text-pisao-cream-muted">
          {message}
        </p>
      )}

      <section className="rounded-[2rem] border border-pisao-gold/10 bg-pisao-noche/35 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <PackagePlus className="mt-1 size-5 text-pisao-gold" />
          <div>
            <h2 className="font-display text-2xl text-pisao-cream">
              Registrar insumo
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
              Usa una unidad base consistente: gramos, mililitros o unidades.
              El costo unitario se deriva de costo del empaque ÷ cantidad base.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={newIngredient.nombre}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                nombre: event.target.value,
              }))
            }
            placeholder="Nombre del insumo"
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream outline-none focus:border-pisao-gold/40 xl:col-span-2"
          />
          <select
            value={newIngredient.unidadBase}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                unidadBase: event.target.value as IngredientRow["unidadBase"],
              }))
            }
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          >
            <option value="GRAMO">Gramos</option>
            <option value="MILILITRO">Mililitros</option>
            <option value="UNIDAD">Unidades</option>
          </select>
          <input
            inputMode="decimal"
            value={newIngredient.stockActual}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                stockActual: event.target.value,
              }))
            }
            placeholder="Stock actual"
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <input
            inputMode="decimal"
            value={newIngredient.stockMinimo}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                stockMinimo: event.target.value,
              }))
            }
            placeholder="Stock mínimo"
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <button
            type="button"
            onClick={() => void createIngredient()}
            disabled={busy !== null || !newIngredient.nombre.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-pisao-gold px-4 py-2.5 text-sm font-semibold text-pisao-carbon disabled:opacity-40"
          >
            {busy === "create" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Crear
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            inputMode="decimal"
            value={newIngredient.purchaseCost}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                purchaseCost: event.target.value,
              }))
            }
            placeholder="Costo de compra del empaque (COP)"
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <input
            inputMode="decimal"
            value={newIngredient.purchaseQuantity}
            onChange={(event) =>
              setNewIngredient((current) => ({
                ...current,
                purchaseQuantity: event.target.value,
              }))
            }
            placeholder="Cantidad base del empaque (ej. 1000 g)"
            className="rounded-xl border border-white/10 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-display text-3xl text-pisao-cream">
            Stock e insumos
          </h2>
          <p className="mt-1 text-sm text-pisao-cream-muted">
            Días de cobertura usa consumo teórico derivado de pedidos ENTREGADOS
            de los últimos {windowDays} días; es pronóstico, no un descuento
            automático de stock.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {ingredients.map((ingredient) => {
            const draft = ingredientDrafts[ingredient.id];
            const critical =
              ingredient.activo &&
              (ingredient.stockActual <= 0 ||
                ingredient.stockActual <= ingredient.stockMinimo);

            return (
              <article
                key={ingredient.id}
                className="rounded-[1.75rem] border border-pisao-gold/10 bg-pisao-carbon-soft p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-pisao-cream">
                        {ingredient.nombre}
                      </h3>
                      {critical && (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-amber-200">
                          crítico
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-pisao-cream-muted">
                      {ingredient.recipeCount} recetas ·{" "}
                      {ingredient.costoUnidadBase === null
                        ? "costo sin configurar"
                        : money(ingredient.costoUnidadBase) +
                          "/" +
                          unitLabel(ingredient.unidadBase)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl text-pisao-gold">
                      {number(ingredient.stockActual, 3)}{" "}
                      <span className="text-sm">
                        {unitLabel(ingredient.unidadBase)}
                      </span>
                    </p>
                    <p className="text-[10px] uppercase tracking-[.12em] text-pisao-cream-muted">
                      stock actual
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <SmallMetric
                    label="Mínimo"
                    value={
                      number(ingredient.stockMinimo, 2) +
                      " " +
                      unitLabel(ingredient.unidadBase)
                    }
                  />
                  <SmallMetric
                    label="Consumo/día"
                    value={
                      ingredient.averageDailyConsumption > 0
                        ? number(ingredient.averageDailyConsumption, 2) +
                          " " +
                          unitLabel(ingredient.unidadBase)
                        : "Sin señal"
                    }
                  />
                  <SmallMetric
                    label="Cobertura"
                    value={
                      ingredient.daysOfCover === null
                        ? "N/D"
                        : number(ingredient.daysOfCover, 1) + " días"
                    }
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-pisao-cream-muted">
                    Stock mínimo
                    <input
                      inputMode="decimal"
                      value={draft?.stockMinimo ?? ""}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          stockMinimo: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-pisao-cream outline-none focus:border-pisao-gold/40"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-xs text-pisao-cream-muted">
                    <input
                      type="checkbox"
                      checked={draft?.active ?? ingredient.activo}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          active: event.target.checked,
                        })
                      }
                      className="size-4"
                    />
                    Insumo activo
                  </label>
                  <label className="text-xs text-pisao-cream-muted">
                    Costo empaque
                    <input
                      inputMode="decimal"
                      value={draft?.purchaseCost ?? ""}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          purchaseCost: event.target.value,
                        })
                      }
                      placeholder="COP"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-pisao-cream outline-none focus:border-pisao-gold/40"
                    />
                  </label>
                  <label className="text-xs text-pisao-cream-muted">
                    Cantidad empaque
                    <input
                      inputMode="decimal"
                      value={draft?.purchaseQuantity ?? ""}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          purchaseQuantity: event.target.value,
                        })
                      }
                      placeholder={unitLabel(ingredient.unidadBase)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-pisao-cream outline-none focus:border-pisao-gold/40"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void saveIngredient(ingredient)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-pisao-gold/25 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
                >
                  {busy === "ingredient:" + ingredient.id ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Save className="size-3" />
                  )}
                  Guardar ficha
                </button>

                <div className="mt-5 border-t border-pisao-gold/10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-pisao-gold">
                    Movimiento real de stock
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      inputMode="decimal"
                      value={draft?.countStock ?? ""}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          countStock: event.target.value,
                        })
                      }
                      placeholder="Conteo físico actual"
                      className="rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-sm text-pisao-cream outline-none"
                    />
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void postStock(
                          ingredient,
                          {
                            tipo: "CONTEO",
                            stockObjetivo: Number(draft?.countStock),
                            motivo: "Conteo físico desde V6",
                          },
                          "Conteo",
                        )
                      }
                      className="rounded-xl bg-pisao-gold px-4 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-40"
                    >
                      Registrar conteo
                    </button>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                    <select
                      value={draft?.movementType ?? "ENTRADA"}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          movementType: event.target
                            .value as IngredientDraft["movementType"],
                        })
                      }
                      className="rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-xs text-pisao-cream"
                    >
                      <option value="ENTRADA">Entrada</option>
                      <option value="SALIDA">Salida</option>
                      <option value="MERMA">Merma</option>
                    </select>
                    <input
                      inputMode="decimal"
                      value={draft?.movementQuantity ?? ""}
                      onChange={(event) =>
                        updateIngredientDraft(ingredient.id, {
                          movementQuantity: event.target.value,
                        })
                      }
                      placeholder="Cantidad"
                      className="rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-sm text-pisao-cream outline-none"
                    />
                    <button
                      type="button"
                      disabled={
                        busy !== null ||
                        !draft?.movementQuantity ||
                        Number(draft.movementQuantity) <= 0
                      }
                      onClick={() =>
                        void postStock(
                          ingredient,
                          {
                            tipo: draft?.movementType ?? "ENTRADA",
                            cantidad: Number(draft?.movementQuantity),
                            motivo: "Movimiento operativo desde V6",
                          },
                          draft?.movementType ?? "Movimiento",
                        )
                      }
                      className="rounded-xl border border-pisao-gold/25 px-4 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
                    >
                      Registrar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {ingredients.length === 0 && (
          <p className="rounded-2xl border border-pisao-gold/10 p-6 text-center text-sm text-pisao-cream-muted">
            Todavía no hay insumos. Registra el primero para comenzar a construir
            recetas reales.
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-pisao-gold/10 bg-pisao-noche/35 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-pisao-gold">
              <ChefHat className="size-5" />
              <p className="text-[10px] font-semibold uppercase tracking-[.18em]">
                Recetario operativo
              </p>
            </div>
            <h2 className="font-display mt-2 text-3xl text-pisao-cream">
              Costo teórico y capacidad por producto
            </h2>
          </div>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="min-w-72 rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.nombre} · {product.categoria}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SmallMetric
                label="Costo manual V5"
                value={
                  selectedProduct.costoUnitario === null
                    ? "Sin configurar"
                    : money(selectedProduct.costoUnitario)
                }
              />
              <SmallMetric
                label="Costo teórico receta"
                value={
                  liveRecipe.cost.theoreticalCost === null
                    ? "Cobertura incompleta"
                    : money(liveRecipe.cost.theoreticalCost)
                }
              />
              <SmallMetric
                label="Porciones estimadas"
                value={
                  liveRecipe.risk.estimatedPortions === null
                    ? "N/D"
                    : String(liveRecipe.risk.estimatedPortions)
                }
              />
              <SmallMetric
                label="Demanda 14d"
                value={selectedProduct.soldUnits14d + " unidades"}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4 text-xs leading-relaxed text-pisao-cream-muted">
              {liveRecipe.risk.blocked
                ? "La receta tiene un insumo sin stock o inactivo. V6 la considera bloqueada para recomendación proactiva."
                : liveRecipe.risk.low
                  ? "La receta tiene riesgo de inventario. El producto puede seguir vendiéndose si está disponible, pero V6 evita empujarlo proactivamente."
                  : selectedDraft.length
                    ? "La receta no presenta riesgo operativo con el conteo actual."
                    : "Todavía no existe receta; V6 no infiere ingredientes ni costos."}
            </div>

            <div className="mt-5 space-y-3">
              {selectedDraft.map((line, index) => {
                const ingredient = ingredients.find(
                  (item) => item.id === line.insumoId,
                );
                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-2xl border border-white/8 bg-pisao-carbon-soft p-3 md:grid-cols-[1fr_150px_130px_auto]"
                  >
                    <select
                      value={line.insumoId}
                      onChange={(event) =>
                        updateRecipeLine(selectedProduct.id, index, {
                          insumoId: event.target.value,
                        })
                      }
                      className="rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-sm text-pisao-cream"
                    >
                      {ingredients.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={
                            selectedDraft.some(
                              (other, otherIndex) =>
                                otherIndex !== index &&
                                other.insumoId === item.id,
                            )
                          }
                        >
                          {item.nombre} · {unitLabel(item.unidadBase)}
                        </option>
                      ))}
                    </select>
                    <label className="text-[10px] uppercase tracking-[.12em] text-pisao-cream-muted">
                      Cantidad/{unitLabel(ingredient?.unidadBase ?? "UNIDAD")}
                      <input
                        inputMode="decimal"
                        value={line.cantidadBase}
                        onChange={(event) =>
                          updateRecipeLine(selectedProduct.id, index, {
                            cantidadBase: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-sm text-pisao-cream"
                      />
                    </label>
                    <label className="text-[10px] uppercase tracking-[.12em] text-pisao-cream-muted">
                      Merma %
                      <input
                        inputMode="decimal"
                        value={line.mermaPct}
                        onChange={(event) =>
                          updateRecipeLine(selectedProduct.id, index, {
                            mermaPct: Number(event.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-white/10 bg-pisao-noche px-3 py-2 text-sm text-pisao-cream"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        removeRecipeLine(selectedProduct.id, index)
                      }
                      className="self-end rounded-xl border border-red-400/20 p-2.5 text-red-200"
                      aria-label="Quitar insumo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addRecipeLine(selectedProduct.id)}
                disabled={
                  ingredients.filter((ingredient) => ingredient.activo).length <=
                  selectedDraft.length
                }
                className="inline-flex items-center gap-2 rounded-xl border border-pisao-gold/25 px-4 py-2.5 text-xs font-semibold text-pisao-gold disabled:opacity-40"
              >
                <Plus className="size-4" />
                Agregar insumo
              </button>
              <button
                type="button"
                onClick={() => void saveRecipe(selectedProduct)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-4 py-2.5 text-xs font-semibold text-pisao-carbon disabled:opacity-40"
              >
                {busy === "recipe:" + selectedProduct.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar receta
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-pisao-cream-muted">
              Guardar una receta no modifica automáticamente el costo manual V5,
              el precio ni el stock. V6 mantiene separados costo teórico,
              decisión financiera y movimiento físico de inventario.
            </p>
          </>
        ) : (
          <p className="mt-5 text-sm text-pisao-cream-muted">
            No hay productos disponibles para construir recetas.
          </p>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
      <Icon className="size-4 text-pisao-gold" />
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl text-pisao-cream">{value}</p>
      <p className="mt-1 text-xs text-pisao-cream-muted">{detail}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche/60 px-3 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-pisao-cream-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-pisao-cream">{value}</p>
    </div>
  );
}
