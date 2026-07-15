import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: "Nosotros" };

export default function NosotrosPage() {
  return (
    <>
      <PageHero
        eyebrow="Nuestra historia"
        title="Nosotros"
        description="La historia, filosofía y equipo detrás de PISÁO Gastrobar."
      />
      <Container className="py-16">
        {/* TODO: historia de marca, fotografía del equipo y de la terraza */}
        <p className="text-pisao-cream-muted max-w-2xl">
          Contenido en construcción.
        </p>
      </Container>
    </>
  );
}
