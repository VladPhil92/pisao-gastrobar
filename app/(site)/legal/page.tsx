import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = { title: "Legal" };

const secciones = [
  {
    titulo: "Términos y condiciones",
    cuerpo: "Contenido legal pendiente de redacción.",
  },
  {
    titulo: "Política de privacidad y tratamiento de datos",
    cuerpo: "Contenido legal pendiente de redacción.",
  },
  {
    titulo: "Política de cookies",
    cuerpo: "Contenido legal pendiente de redacción.",
  },
];

export default function LegalPage() {
  return (
    <>
      <PageHero eyebrow="Información legal" title="Legal" />
      <Container className="space-y-10 py-16">
        {secciones.map((s) => (
          <div key={s.titulo}>
            <h2 className="font-display text-pisao-gold text-2xl">
              {s.titulo}
            </h2>
            <p className="text-pisao-cream-muted mt-2 max-w-2xl text-sm">
              {s.cuerpo}
            </p>
          </div>
        ))}
      </Container>
    </>
  );
}
