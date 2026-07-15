import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { MenuBrowser } from "./MenuBrowser";
import {
  categoriasPlaceholder,
  productosPlaceholder,
} from "@/lib/menu/placeholder-data";

export const metadata: Metadata = { title: "Menú" };

export default async function MenuPage() {
  // TODO: sustituir por consulta a Prisma:
  // const categorias = await prisma.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } });
  // const productos = await prisma.producto.findMany({ where: { disponible: true } });
  const categorias = categoriasPlaceholder;
  const productos = productosPlaceholder;

  return (
    <>
      <PageHero
        eyebrow="Carta"
        title="Menú"
        description="Cocina caribeña contemporánea. Filtra por categoría y agrega directo al carrito."
      />
      <Container className="py-12">
        <MenuBrowser categories={categorias} products={productos} />
      </Container>
    </>
  );
}
