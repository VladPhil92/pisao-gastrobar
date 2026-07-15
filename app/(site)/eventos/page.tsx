import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { eventosPlaceholder } from "@/lib/eventos/placeholder-data";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventosPage() {
  // TODO: sustituir por prisma.evento.findMany({ where: { activo: true }, orderBy: { fecha: "asc" } })
  const eventos = eventosPlaceholder;

  return (
    <>
      <PageHero
        eyebrow="Agenda"
        title="Eventos"
        description="Música en vivo, noches temáticas y experiencias especiales en la terraza."
      />
      <Container className="grid gap-6 py-16 sm:grid-cols-2">
        {eventos.map((evento) => (
          <Link
            key={evento.id}
            href={`/eventos/${evento.slug}`}
            className="border-pisao-gold/10 bg-pisao-carbon-soft hover:border-pisao-gold/40 rounded-xl border p-6 transition-colors"
          >
            <p className="text-pisao-gold text-xs tracking-wide uppercase">
              {new Date(evento.fecha).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
              })}{" "}
              · {evento.horaInicio}
            </p>
            <h3 className="font-display text-pisao-cream mt-2 text-2xl">
              {evento.titulo}
            </h3>
            <p className="text-pisao-cream-muted mt-2 text-sm">
              {evento.descripcion}
            </p>
          </Link>
        ))}
      </Container>
    </>
  );
}
