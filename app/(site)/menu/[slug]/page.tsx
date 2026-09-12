import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "./AddToCartButton";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProducto(slug: string) {
  // TODO: sustituir por prisma.producto.findUnique({ where: { slug } })
  return productosPlaceholder.find((p) => p.slug === slug) ?? null;
}

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
      <section className="border-pisao-gold/10 bg-pisao-noche border-b">
        <Container className="py-5">
          <Link
            href="/menu"
            className="text-pisao-cream-muted hover:text-pisao-gold inline-flex items-center gap-2 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="size-4" /> Volver a la carta
          </Link>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:py-20">
        <div className="border-pisao-gold/10 bg-pisao-carbon-soft relative aspect-[4/5] overflow-hidden rounded-[2rem] border">
          {producto.imagenUrl ? (
            <Image
              src={producto.imagenUrl}
              alt={`${producto.nombre} de PISÁO Gastrobar`}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          ) : (
            <MenuImageFallback
              name={producto.nombre}
              categorySlug={producto.categoriaSlug}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
          <span className="border-pisao-gold/25 bg-pisao-carbon/75 text-pisao-gold absolute top-5 left-5 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase backdrop-blur">
            {visual.badge}
          </span>
        </div>

        <div className="lg:py-6">
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
            {visual.eyebrow}
          </p>
          <h1 className="font-display text-pisao-cream mt-3 text-5xl leading-[.98] text-balance sm:text-6xl">
            {producto.nombre}
          </h1>
          {producto.descripcion ? (
            <p className="text-pisao-cream-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              {producto.descripcion}
            </p>
          ) : (
            <p className="text-pisao-cream-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Parte de nuestra selección {visual.label.toLowerCase()}, pensada para disfrutar el sabor PISÁO sin complicarlo.
            </p>
          )}

          <div className="border-pisao-gold/10 mt-8 border-y py-6">
            <p className="text-pisao-cream-muted text-[10px] font-semibold tracking-[0.18em] uppercase">
              Precio
            </p>
            <p className="font-display text-pisao-gold mt-1 text-4xl">
              {formatCurrency(producto.precio)}
            </p>
          </div>

          <div className="mt-7">
            <AddToCartButton producto={producto} />
          </div>

          <div className="border-pisao-gold/10 bg-pisao-noche mt-8 rounded-2xl border p-5">
            <p className="text-pisao-cream text-sm font-semibold">
              ¿Quieres completar la mesa?
            </p>
            <p className="text-pisao-cream-muted mt-2 text-sm leading-relaxed">
              Vuelve a la carta para explorar entradas, bebidas, cerveza artesanal y el resto de opciones disponibles.
            </p>
            <Link
              href="/menu"
              className="text-pisao-gold mt-4 inline-flex items-center gap-2 text-xs font-semibold"
            >
              Seguir explorando <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
