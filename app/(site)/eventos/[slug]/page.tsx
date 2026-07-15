import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { eventosPlaceholder } from "@/lib/eventos/placeholder-data";
import { whatsappLink } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getEvento(slug: string) {
  // TODO: sustituir por prisma.evento.findUnique({ where: { slug } })
  return eventosPlaceholder.find((e) => e.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEvento(slug);
  return { title: evento?.titulo ?? "Evento" };
}

export default async function EventoPage({ params }: Props) {
  const { slug } = await params;
  const evento = await getEvento(slug);

  if (!evento) notFound();

  return (
    <Container className="py-16">
      <p className="text-pisao-gold text-xs tracking-wide uppercase">
        {new Date(evento.fecha).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}{" "}
        · {evento.horaInicio}
      </p>
      <h1 className="font-display text-pisao-cream mt-2 text-4xl">
        {evento.titulo}
      </h1>
      <p className="text-pisao-cream-muted mt-4 max-w-2xl">
        {evento.descripcion}
      </p>
      <Button
        href={whatsappLink(
          `Hola, quiero más información sobre "${evento.titulo}"`,
        )}
        variant="primary"
        className="mt-8"
        target="_blank"
        rel="noreferrer"
      >
        Reservar cupo por WhatsApp
      </Button>
    </Container>
  );
}
