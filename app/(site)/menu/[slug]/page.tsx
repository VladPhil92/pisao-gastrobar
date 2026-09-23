import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, Layers3, Utensils } from "lucide-react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { Reveal } from "@/components/visual/VisualMotion";
import { prisma } from "@/lib/prisma";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const getProducto = cache(async (slug: string) => {
  try {
    const product = await prisma.producto.findUnique({
      where: { slug },
      include: { categoria: { select: { slug: true } } },
    });

    if (!product) return null;

    return {
      id: product.id,
      nombre: product.nombre,
      slug: product.slug,
      descripcion: product.descripcion,
      precio: Number(product.precio),
      imagenUrl: product.imagenUrl,
      disponible: product.disponible,
      inventarioBajo: product.inventarioBajo,
      categoriaSlug: product.categoria.slug,
    };
  } catch (error) {
    console.error(
      "[PISAO MENU] Detalle dinámico no disponible; usando fallback verificado.",
      error,
    );
    return productosPlaceholder.find((product) => product.slug === slug) ?? null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const producto = await getProducto(slug);
  return {
    title: producto?.nombre ?? "Producto",
    description:
      producto?.descripcion ||
      `${producto?.nombre ?? "Producto"} en la carta de PISÁO Gastrobar, Cartagena.`,
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) notFound();

  const visual = getMenuCategoryVisual(producto.categoriaSlug);

  return (
    <>
      <section className="pisao-grain relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        {producto.imagenUrl && (
          <>
            <Image src={producto.imagenUrl} alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,17,17,.72),rgba(17,17,17,.98))]" />
          </>
        )}
        <div className="pisao-ambient-glow absolute -right-32 top-20 size-[34rem] rounded-full bg-pisao-gold/10 blur-[120px]" />

        <Container className="relative py-6">
          <Link href="/menu" className="inline-flex items-center gap-2 rounded-full border border-pisao-gold/15 bg-pisao-carbon/55 px-4 py-2 text-xs font-semibold text-pisao-cream-muted backdrop-blur transition hover:border-pisao-gold/40 hover:text-pisao-gold">
            <ArrowLeft className="size-4" /> Volver a la carta
          </Link>
        </Container>

        <Container className="relative grid gap-10 pb-14 pt-4 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-8">
          <Reveal className="relative min-h-[560px] sm:min-h-[680px]">
            <div className="pisao-image-lift absolute inset-y-0 left-0 w-[88%] overflow-hidden rounded-[2.75rem] border border-pisao-gold/15 bg-pisao-carbon-soft shadow-2xl">
              {producto.imagenUrl ? (
                <Image src={producto.imagenUrl} alt={`${producto.nombre} de PISÁO Gastrobar`} fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
              ) : (
                <MenuImageFallback name={producto.nombre} categorySlug={producto.categoriaSlug} />
              )}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-transparent" />
              <span className="absolute top-5 left-5 rounded-full border border-pisao-gold/25 bg-pisao-carbon/75 px-3 py-1.5 text-[10px] font-semibold tracking-[.16em] text-pisao-gold uppercase backdrop-blur">
                {visual.badge}
              </span>
            </div>

            <div className="absolute right-0 bottom-[7%] max-w-[230px] rounded-[1.75rem] border border-pisao-gold/20 bg-pisao-carbon/90 p-5 shadow-2xl backdrop-blur-xl">
              <p className="text-[9px] font-semibold tracking-[.18em] text-pisao-gold uppercase">Tu mesa empieza aquí</p>
              <p className="font-display mt-2 text-2xl leading-tight text-pisao-cream">Míralo. Agrégalo. Completa alrededor.</p>
            </div>
          </Reveal>

          <Reveal delay={100} className="lg:py-6">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">{visual.eyebrow}</p>
            <h1 className="font-display mt-3 text-5xl leading-[.92] text-balance text-pisao-cream sm:text-7xl">{producto.nombre}</h1>
            {producto.descripcion ? (
              <p className="mt-6 max-w-xl text-base leading-relaxed text-pisao-cream-muted sm:text-lg">{producto.descripcion}</p>
            ) : (
              <p className="mt-6 max-w-xl text-base leading-relaxed text-pisao-cream-muted sm:text-lg">Parte de nuestra selección {visual.label.toLowerCase()}, pensada para disfrutar el sabor PISÁO sin complicarlo.</p>
            )}

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                { icon: Eye, label: "Foto real del plato" },
                { icon: Layers3, label: "Se integra a tu Mesa Visual" },
                { icon: Utensils, label: visual.label },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-pisao-gold/15 bg-pisao-carbon/45 px-3 py-2 text-[11px] font-semibold text-pisao-cream-muted backdrop-blur">
                    <Icon className="size-3.5 text-pisao-gold" /> {item.label}
                  </span>
                );
              })}
            </div>

            <div className="mt-8 rounded-[2rem] border border-pisao-gold/15 bg-pisao-carbon/65 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="flex items-end justify-between gap-4 border-b border-pisao-gold/10 pb-5">
                <div>
                  <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-cream-muted uppercase">Precio actual</p>
                  <p className="font-display mt-1 text-4xl text-pisao-gold sm:text-5xl">{formatCurrency(producto.precio)}</p>
                </div>
                <span className="hidden rounded-full border border-pisao-gold/15 px-3 py-2 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase sm:inline-flex">Carta PISÁO</span>
              </div>
              <div className="mt-5"><AddToCartButton producto={producto} /></div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="py-18 sm:py-24">
        <Container className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Después de elegir</p>
            <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-5xl">Un plato no tiene por qué viajar solo.</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base">Vuelve a la carta para sumar entradas, bebidas, cerveza artesanal o postre. La Mesa Visual conserva lo que ya elegiste y te ayuda a ver cómo va quedando el pedido.</p>
            <Link href="/menu" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-pisao-gold">Seguir construyendo la mesa <ArrowRight className="size-4" /></Link>
          </Reveal>

          <Reveal delay={100} className="relative min-h-[360px] overflow-hidden rounded-[2.25rem] border border-pisao-gold/12">
            <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales en la terraza PISÁO" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-8">
              <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">El contexto importa</p>
              <p className="font-display mt-2 max-w-md text-3xl leading-tight text-pisao-cream">Comida, cerveza y terraza forman una sola experiencia.</p>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
