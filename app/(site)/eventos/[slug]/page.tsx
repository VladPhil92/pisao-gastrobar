import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
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

function formatEventDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEvento(slug);
  return {
    title: evento?.titulo ?? "Evento",
    description: evento?.descripcion,
  };
}

export default async function EventoPage({ params }: Props) {
  const { slug } = await params;
  const evento = await getEvento(slug);

  if (!evento) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const isPast = evento.fecha < today;

  return (
    <>
      <section className="relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image
          src="/gallery/terraza-cervezas.jpg"
          alt="Terraza PISÁO con cerveza artesanal"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,.96)_0%,rgba(17,17,17,.82)_48%,rgba(17,17,17,.4)_100%)]" />
        <Container className="relative py-16 sm:py-24 lg:py-28">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-xs font-semibold text-pisao-cream-muted transition hover:text-pisao-gold"
          >
            <ArrowLeft className="size-4" /> Volver a eventos
          </Link>

          <div className="mt-12 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pisao-gold/25 bg-pisao-carbon/60 px-4 py-2 text-pisao-gold backdrop-blur">
              <CalendarDays className="size-4" />
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase">
                {formatEventDate(evento.fecha)} · {evento.horaInicio}
              </span>
            </div>
            <h1 className="font-display mt-5 text-5xl leading-[.98] text-pisao-cream sm:text-7xl">
              {evento.titulo}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-pisao-cream-muted sm:text-lg">
              {evento.descripcion}
            </p>

            {isPast ? (
              <div className="mt-8 max-w-xl rounded-2xl border border-pisao-gold/15 bg-pisao-carbon/70 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-pisao-cream">Esta fecha ya pasó.</p>
                <p className="mt-2 text-sm leading-relaxed text-pisao-cream-muted">
                  Conservamos la página como referencia, pero no la presentamos como evento vigente. Consulta la agenda actual o escríbenos para conocer próximos planes.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button href="/eventos" variant="primary">Ver agenda vigente</Button>
                  <Button
                    href={whatsappLink("Hola PISÁO, quiero consultar sus próximos eventos.")}
                    variant="outline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar próximos eventos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  href={whatsappLink(`Hola PISÁO, quiero más información sobre "${evento.titulo}".`)}
                  variant="primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar disponibilidad
                </Button>
                <Button href="/reservas" variant="outline">Reservar mesa</Button>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
