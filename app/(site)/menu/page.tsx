import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { MenuBrowser } from "./MenuBrowser";
import {
  categoriasPlaceholder,
  productosPlaceholder,
} from "@/lib/menu/placeholder-data";

export const metadata: Metadata = {
  title: "Carta PISÁO",
  description:
    "Explora la carta de PISÁO Gastrobar: patacones insignia, burgers, cayeye, entradas, bebidas, cerveza artesanal y cócteles en Cartagena.",
};

export default async function MenuPage() {
  // TODO: sustituir por consulta a Prisma:
  // const categorias = await prisma.categoria.findMany({ where: { activa: true }, orderBy: { orden: "asc" } });
  // const productos = await prisma.producto.findMany({ where: { disponible: true } });
  const categorias = categoriasPlaceholder;
  const productos = productosPlaceholder;

  return (
    <>
      <section className="border-pisao-gold/10 bg-pisao-noche relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(199,154,58,.12),transparent_28%)]" />
        <Container className="relative grid gap-10 py-14 sm:py-16 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:py-20">
          <div className="max-w-xl">
            <div className="border-pisao-gold/25 bg-pisao-carbon/65 text-pisao-gold inline-flex rounded-full border px-4 py-2 text-[10px] font-semibold tracking-[0.22em] uppercase backdrop-blur">
              Carta PISÁO · Cartagena
            </div>
            <h1 className="font-display text-pisao-cream mt-5 text-5xl leading-[.98] text-balance sm:text-6xl lg:text-7xl">
              Aquí se viene
              <span className="text-pisao-gold block">a comer con ganas.</span>
            </h1>
            <p className="text-pisao-cream-muted mt-6 max-w-lg text-base leading-relaxed sm:text-lg">
              Patacones insignia, cayeye, burgers, entradas para compartir, bebidas frías y cerveza artesanal. Elige por antojo, no por protocolo.
            </p>
            <a
              href="#carta"
              className="text-pisao-gold mt-8 inline-flex items-center gap-2 text-sm font-semibold"
            >
              Explorar la carta <ArrowDown className="size-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="group relative col-span-2 aspect-[16/9] overflow-hidden rounded-[2rem] sm:col-span-1 sm:row-span-2 sm:aspect-[4/5]">
              <Image
                src="/gallery/patacon_callejero.jpg"
                alt="Patacón Callejero de PISÁO Gastrobar"
                fill
                priority
                sizes="(min-width: 1024px) 36vw, 100vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/5" />
              <div className="absolute right-0 bottom-0 left-0 p-5 sm:p-6">
                <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Insignia de la casa
                </p>
                <p className="font-display text-pisao-cream mt-1 text-2xl">
                  Patacones PISÁO
                </p>
              </div>
            </div>

            <div className="group relative aspect-square overflow-hidden rounded-[1.5rem] sm:aspect-[4/3]">
              <Image
                src="/gallery/laguna_azul_burger.jpg"
                alt="Laguna Azul Burger de PISÁO Gastrobar"
                fill
                sizes="(min-width: 1024px) 22vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <p className="font-display text-pisao-cream absolute bottom-4 left-4 text-lg sm:text-xl">
                Burgers
              </p>
            </div>

            <div className="group relative aspect-square overflow-hidden rounded-[1.5rem] sm:aspect-[4/3]">
              <Image
                src="/gallery/limonadaCerezada.jpg"
                alt="Limonada Cerezada de PISÁO Gastrobar"
                fill
                sizes="(min-width: 1024px) 22vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <p className="font-display text-pisao-cream absolute bottom-4 left-4 text-lg sm:text-xl">
                Algo frío
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container id="carta" className="scroll-mt-28 py-12 sm:py-16">
        <MenuBrowser categories={categorias} products={productos} />
      </Container>
    </>
  );
}
