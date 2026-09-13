"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Beer,
  Check,
  GlassWater,
  Minus,
  Plus,
  Shuffle,
  Sparkles,
  Users,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { useCartStore } from "@/lib/cart/store";
import type { SuggestibleProduct } from "@/lib/cart/experience";
import {
  buildPlanProposal,
  PLAN_BUDGETS,
  PLAN_INTENTS,
  type DrinkPreference,
  type PlanIntent,
} from "@/lib/menu/plan-mode";
import { formatCurrency } from "@/lib/utils";

const DRINK_OPTIONS: Array<{
  id: DrinkPreference;
  label: string;
  description: string;
  icon: typeof GlassWater;
}> = [
  {
    id: "sin-alcohol",
    label: "Sin alcohol",
    description: "Limonadas, sodas y bebidas sin alcohol.",
    icon: GlassWater,
  },
  {
    id: "cerveza",
    label: "Cerveza artesanal",
    description: "La propuesta usa únicamente la categoría de cervezas.",
    icon: Beer,
  },
  {
    id: "cualquiera",
    label: "Cualquiera",
    description: "El presupuesto decide entre las bebidas disponibles.",
    icon: Shuffle,
  },
];

export function PlanModeComposer({ products }: { products: SuggestibleProduct[] }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<PlanIntent>("completa");
  const [diners, setDiners] = useState(2);
  const [budgetPerPerson, setBudgetPerPerson] = useState(45000);
  const [drinkPreference, setDrinkPreference] =
    useState<DrinkPreference>("sin-alcohol");
  const addItems = useCartStore((state) => state.addItems);

  const proposal = useMemo(
    () =>
      buildPlanProposal(products, {
        intent,
        diners,
        budgetPerPerson,
        drinkPreference,
      }),
    [products, intent, diners, budgetPerPerson, drinkPreference],
  );

  const addProposal = () => {
    if (proposal.items.length === 0) return;

    addItems(
      proposal.items.map(({ product, quantity }) => ({
        item: {
          productoId: product.id,
          nombre: product.nombre,
          slug: product.slug,
          precio: product.precio,
          imagenUrl: product.imagenUrl,
          categoriaSlug: product.categoriaSlug,
        },
        cantidad: quantity,
      })),
    );
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold transition"
      >
        <Sparkles className="size-4" />
        Armar mi plan
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Cerrar Modo Plan"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-mode-title"
            className="bg-pisao-carbon relative z-10 flex max-h-[94svh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[2rem] border border-pisao-gold/15 shadow-2xl sm:max-h-[90svh] sm:rounded-[2rem]"
          >
            <header className="border-pisao-gold/10 flex items-start justify-between gap-4 border-b px-5 py-5 sm:px-7">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-pisao-gold">
                  <Sparkles className="size-4" />
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase">
                    Modo Plan PISÁO
                  </p>
                </div>
                <h2
                  id="plan-mode-title"
                  className="font-display text-pisao-cream mt-2 text-3xl leading-tight sm:text-4xl"
                >
                  Dinos el plan. La carta hace el resto.
                </h2>
                <p className="text-pisao-cream-muted mt-2 max-w-xl text-sm leading-relaxed">
                  Elige el tipo de mesa, número de personas y una referencia de gasto. Te proponemos una combinación real que puedes ajustar antes de pagar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="border-pisao-gold/15 text-pisao-cream hover:border-pisao-gold/40 flex size-10 shrink-0 items-center justify-center rounded-full border transition"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[.92fr_1.08fr] lg:overflow-hidden">
              <div className="border-pisao-gold/10 p-5 lg:overflow-y-auto lg:border-r lg:p-7">
                <div>
                  <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">
                    1 · ¿Qué tipo de plan tienes?
                  </p>
                  <div className="mt-3 grid gap-3">
                    {PLAN_INTENTS.map((option) => {
                      const selected = intent === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setIntent(option.id)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-pisao-gold/50 bg-pisao-gold/10"
                              : "border-white/8 bg-white/[.025] hover:border-pisao-gold/25"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                                  : "border-pisao-gold/25 text-transparent"
                              }`}
                            >
                              <Check className="size-3.5" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-pisao-cream">
                                {option.title}
                              </p>
                              <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-pisao-gold/10 mt-7 border-t pt-6">
                  <div className="flex items-center gap-2 text-pisao-gold">
                    <Users className="size-4" />
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                      2 · ¿Cuántas personas?
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-pisao-gold/10 bg-pisao-noche px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-pisao-cream">
                        {diners} {diners === 1 ? "persona" : "personas"}
                      </p>
                      <p className="text-pisao-cream-muted mt-0.5 text-xs">Entre 1 y 8 comensales.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDiners((value) => Math.max(1, value - 1))}
                        disabled={diners <= 1}
                        className="border-pisao-gold/20 text-pisao-gold flex size-9 items-center justify-center rounded-full border disabled:opacity-30"
                        aria-label="Restar persona"
                      >
                        <Minus className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiners((value) => Math.min(8, value + 1))}
                        disabled={diners >= 8}
                        className="border-pisao-gold/20 text-pisao-gold flex size-9 items-center justify-center rounded-full border disabled:opacity-30"
                        aria-label="Agregar persona"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-pisao-gold/10 mt-7 border-t pt-6">
                  <div className="flex items-center gap-2 text-pisao-gold">
                    <Wallet className="size-4" />
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                      3 · Referencia por persona
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {PLAN_BUDGETS.map((budget) => (
                      <button
                        key={budget}
                        type="button"
                        onClick={() => setBudgetPerPerson(budget)}
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                          budgetPerPerson === budget
                            ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                            : "border-pisao-gold/15 text-pisao-cream hover:border-pisao-gold/35"
                        }`}
                      >
                        {formatCurrency(budget)}
                      </button>
                    ))}
                  </div>
                  <p className="text-pisao-cream-muted mt-2 text-[11px] leading-relaxed">
                    Es una referencia para construir la propuesta, no un precio cerrado ni un descuento.
                  </p>
                </div>

                <div className="border-pisao-gold/10 mt-7 border-t pt-6">
                  <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">
                    4 · Bebida
                  </p>
                  <div className="mt-3 grid gap-2">
                    {DRINK_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = drinkPreference === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setDrinkPreference(option.id)}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-pisao-gold/45 bg-pisao-gold/8"
                              : "border-white/8 hover:border-pisao-gold/20"
                          }`}
                        >
                          <span className="text-pisao-gold flex size-9 shrink-0 items-center justify-center rounded-full bg-pisao-gold/10">
                            <Icon className="size-4" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-pisao-cream">{option.label}</p>
                            <p className="text-pisao-cream-muted mt-0.5 text-[11px] leading-relaxed">
                              {option.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-pisao-noche/65 p-5 lg:overflow-y-auto lg:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">
                      Propuesta en vivo
                    </p>
                    <h3 className="font-display text-pisao-cream mt-2 text-3xl">
                      Una mesa posible para ustedes.
                    </h3>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-pisao-cream-muted text-[10px] tracking-[0.14em] uppercase">Total estimado</p>
                    <p className="font-display text-pisao-gold mt-1 text-3xl">
                      {formatCurrency(proposal.total)}
                    </p>
                    <p className="text-pisao-cream-muted mt-1 text-[11px]">
                      ≈ {formatCurrency(proposal.perPerson)} por persona
                    </p>
                  </div>
                </div>

                <div className={`mt-5 rounded-2xl border p-4 ${
                  proposal.fitsBudget
                    ? "border-pisao-gold/15 bg-pisao-gold/6"
                    : "border-amber-400/25 bg-amber-400/5"
                }`}>
                  <p className="text-sm font-semibold text-pisao-cream">
                    {proposal.fitsBudget
                      ? `La propuesta queda ${formatCurrency(Math.max(0, proposal.difference))} por debajo de tu referencia total.`
                      : `La combinación mínima supera tu referencia por ${formatCurrency(Math.abs(proposal.difference))}.`}
                  </p>
                  <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">
                    Referencia total: {formatCurrency(proposal.targetTotal)}. Puedes llevar la propuesta a tu mesa y ajustar cualquier producto o cantidad después.
                  </p>
                </div>

                {proposal.items.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {proposal.items.map(({ product, quantity, roleLabel }) => (
                      <article
                        key={`${roleLabel}-${product.id}`}
                        className="border-pisao-gold/10 bg-pisao-carbon-soft overflow-hidden rounded-2xl border"
                      >
                        <div className="grid grid-cols-[96px_1fr]">
                          <div className="bg-pisao-carbon relative min-h-28 overflow-hidden">
                            {product.imagenUrl ? (
                              <Image
                                src={product.imagenUrl}
                                alt={product.nombre}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <MenuImageFallback
                                name={product.nombre}
                                categorySlug={product.categoriaSlug}
                                compact
                              />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col justify-between p-3">
                            <div>
                              <p className="text-pisao-gold text-[9px] font-semibold tracking-[0.14em] uppercase">
                                {roleLabel}
                              </p>
                              <p className="text-pisao-cream mt-1 line-clamp-2 text-sm font-semibold">
                                {product.nombre}
                              </p>
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-2">
                              <span className="text-pisao-cream-muted text-[11px]">
                                {quantity} × {formatCurrency(product.precio)}
                              </span>
                              <span className="text-xs font-semibold text-pisao-gold">
                                {formatCurrency(product.precio * quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="border-pisao-gold/10 mt-5 rounded-2xl border p-6 text-center">
                    <Utensils className="text-pisao-gold mx-auto size-6" />
                    <p className="text-pisao-cream mt-3 text-sm font-semibold">No encontramos una combinación disponible con estas reglas.</p>
                    <p className="text-pisao-cream-muted mt-1 text-xs">Prueba otra preferencia de bebida o tipo de plan.</p>
                  </div>
                )}

                <div className="border-pisao-gold/10 mt-6 border-t pt-5">
                  <button
                    type="button"
                    onClick={addProposal}
                    disabled={proposal.items.length === 0}
                    className="bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Utensils className="size-4" />
                    Poner esta propuesta en mi mesa
                  </button>
                  <p className="text-pisao-cream-muted mt-3 text-center text-[11px] leading-relaxed">
                    Nada queda bloqueado: después puedes cambiar cantidades, quitar platos o seguir explorando la carta.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
