"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Utensils } from "lucide-react";
import { MenuCard, type MenuCardProduct } from "@/components/menu/MenuCard";
import { PlanModeComposer } from "@/components/menu/PlanModeComposer";
import { VisualTableDock } from "@/components/cart/VisualTableDock";
import {
  CategoryFilter,
  type Category,
} from "@/components/menu/CategoryFilter";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";

export function MenuBrowser({
  categories,
  products,
}: {
  categories: Category[];
  products: (MenuCardProduct & { categoriaSlug: string })[];
}) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? products.filter((p) => p.categoriaSlug === active) : products),
    [active, products],
  );

  const visual = getMenuCategoryVisual(active);
  const heroProduct = filtered.find((product) => product.imagenUrl) ?? products.find((product) => product.imagenUrl);
  const visualRail = useMemo(
    () => products.filter((product) => product.imagenUrl && product.disponible).slice(0, 8),
    [products],
  );

  return (
    <div className="pb-24 sm:pb-28">
      <div className="border-pisao-gold/15 bg-[linear-gradient(135deg,rgba(199,154,58,.13),rgba(17,17,17,.86))] relative mb-8 overflow-hidden rounded-[2rem] border p-5 sm:p-7">
        <div className="pisao-ambient-glow absolute -right-12 -top-24 size-64 rounded-full bg-pisao-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-pisao-gold">
              <Sparkles className="size-4" />
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase">Compra gastronómica guiada</p>
            </div>
            <h2 className="font-display text-pisao-cream mt-2 text-3xl leading-tight sm:text-4xl">
              Puedes explorar. O decirnos qué plan tienes.
            </h2>
            <p className="text-pisao-cream-muted mt-3 max-w-xl text-sm leading-relaxed">
              Modo Plan arma una propuesta según personas, ocasión y referencia de gasto. Mesa Visual te deja verla crecer y ajustarla antes del checkout.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PlanModeComposer products={products} />
            <div className="border-pisao-gold/20 bg-pisao-noche/70 text-pisao-cream flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl">
              <span className="bg-pisao-gold text-pisao-carbon flex size-9 items-center justify-center rounded-full">
                <Utensils className="size-4" />
              </span>
              <div>
                <p className="font-semibold">Mesa Visual PISÁO</p>
                <p className="text-pisao-cream-muted text-[11px]">Se activa con tu primer producto.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {visualRail.length > 0 && (
        <section className="mb-9 overflow-hidden">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-pisao-gold text-[9px] font-semibold tracking-[.22em] uppercase">Explora con los ojos</p>
              <h2 className="font-display mt-1 text-2xl text-pisao-cream sm:text-3xl">Antes de filtrar, deja que algo te antoje.</h2>
            </div>
            <p className="text-pisao-cream-muted hidden text-[10px] font-semibold tracking-[.15em] uppercase sm:block">Desliza →</p>
          </div>

          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            {visualRail.map((product, index) => (
              <Link
                key={product.id}
                href={`/menu/${product.slug}`}
                className="pisao-image-lift group relative h-64 w-[72vw] max-w-[270px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-pisao-gold/10 bg-pisao-noche sm:h-72 sm:w-[260px]"
              >
                <Image
                  src={product.imagenUrl!}
                  alt={`${product.nombre} de PISÁO`}
                  fill
                  priority={index < 2}
                  sizes="270px"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-xl leading-tight text-pisao-cream">{product.nombre}</p>
                  <span className="text-pisao-gold mt-2 inline-flex items-center gap-1.5 text-[9px] font-semibold tracking-[.18em] uppercase">
                    Ver plato <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CategoryFilter categories={categories} active={active} onChange={setActive} />

      <section key={active ?? "all"} className="relative mt-9 overflow-hidden rounded-[2rem] border border-pisao-gold/10 bg-pisao-noche">
        {heroProduct?.imagenUrl && (
          <div className="absolute inset-0 lg:left-[54%]">
            <Image
              src={heroProduct.imagenUrl}
              alt=""
              fill
              sizes="(min-width:1024px) 46vw, 100vw"
              className="object-cover opacity-55 lg:opacity-100"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,28,28,1)_0%,rgba(28,28,28,.97)_25%,rgba(28,28,28,.62)_62%,rgba(28,28,28,.22)_100%)] lg:-left-[55%]" />
          </div>
        )}

        <div className="relative grid min-h-[330px] items-end p-6 sm:p-8 lg:grid-cols-[.58fr_.42fr] lg:items-center lg:p-10">
          <div className="max-w-2xl">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">{visual.eyebrow}</p>
            <h2 className="font-display text-pisao-cream mt-2 text-4xl leading-[.98] sm:text-5xl">
              {active ? visual.label : "Todo el sabor PISÁO"}
            </h2>
            <p className="text-pisao-cream-muted mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              {active
                ? visual.description
                : "Explora patacones insignia, burgers, cayeye, bebidas y opciones para compartir. Si prefieres decidir rápido, usa Modo Plan y termina de ajustar la propuesta en Mesa Visual."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="border-pisao-gold/20 bg-pisao-carbon/60 text-pisao-gold rounded-full border px-4 py-2 text-[10px] font-bold tracking-[.14em] uppercase backdrop-blur-xl">
                {filtered.length} {filtered.length === 1 ? "opción" : "opciones"}
              </span>
              {heroProduct && (
                <Link href={`/menu/${heroProduct.slug}`} className="text-pisao-cream inline-flex items-center gap-2 text-xs font-semibold">
                  Abrir una sugerencia <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <MenuCard key={product.id} product={product} />
        ))}
      </div>

      <VisualTableDock products={products} />
    </div>
  );
}
