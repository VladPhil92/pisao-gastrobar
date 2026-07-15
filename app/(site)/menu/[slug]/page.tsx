import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { productosPlaceholder } from "@/lib/menu/placeholder-data";
import { getPhotoAspectRatio } from "@/lib/gallery/photos";
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
  return { title: producto?.nombre ?? "Producto" };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) notFound();

  return (
    <Container className="grid gap-10 py-16 lg:grid-cols-2">
      <div
        className="bg-pisao-carbon-soft relative overflow-hidden rounded-xl"
        style={{ aspectRatio: getPhotoAspectRatio(producto.imagenUrl) }}
      >
        {producto.imagenUrl ? (
          <Image
            src={producto.imagenUrl}
            alt={producto.nombre}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="text-pisao-cream-muted flex h-full items-center justify-center text-sm">
            Sin imagen
          </div>
        )}
      </div>
      <div>
        <h1 className="font-display text-pisao-cream text-4xl">
          {producto.nombre}
        </h1>
        {producto.descripcion && (
          <p className="text-pisao-cream-muted mt-4">{producto.descripcion}</p>
        )}
        <p className="text-pisao-gold mt-6 text-2xl font-semibold">
          {formatCurrency(producto.precio)}
        </p>
        <AddToCartButton producto={producto} />
      </div>
    </Container>
  );
}
