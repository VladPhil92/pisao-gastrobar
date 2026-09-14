import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { galleryPhotos } from "@/lib/gallery/photos";
import { GalleryGrid } from "./GalleryGrid";

export const metadata: Metadata = {
  title: "Galería PISÁO",
  description:
    "Descubre PISÁO Gastrobar en imágenes: platos insignia, terraza panorámica, cerveza artesanal y la experiencia caribeña en Cartagena.",
};

export default function GaleriaPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <div className="absolute inset-0">
          <Image
            src="/gallery/terraza-atardecer.jpg"
            alt="Terraza de PISÁO Gastrobar al atardecer"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,.96)_0%,rgba(17,17,17,.82)_42%,rgba(17,17,17,.34)_100%)]" />
        </div>

        <Container className="relative py-20 sm:py-28 lg:py-36">
          <div className="max-w-2xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[0.24em] uppercase">
              PISÁO en imágenes
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[.96] text-pisao-cream sm:text-7xl">
              Hay planes que
              <span className="block text-pisao-gold">se entienden mirando.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-pisao-cream-muted sm:text-lg">
              Platos que llegan con carácter, una terraza que cambia con la luz y momentos que empiezan alrededor de una mesa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/reservas" variant="primary">
                Reservar mesa
              </Button>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-2 py-2.5 text-sm font-semibold text-pisao-gold"
              >
                Ver la carta <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="mb-10 grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
                Archivo visual
              </p>
              <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-5xl">
                Sabor, terraza y Caribe.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base lg:justify-self-end">
              Esta galería usa fotografía real de PISÁO. No mezclamos renders genéricos con producto real: lo que ves aquí pertenece a nuestra carta o a nuestra experiencia.
            </p>
          </div>
          <GalleryGrid photos={galleryPhotos} />
        </Container>
      </section>
    </>
  );
}
