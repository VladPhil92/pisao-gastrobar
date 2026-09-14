import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Music2, Sparkles, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { eventosPlaceholder } from "@/lib/eventos/placeholder-data";
import { whatsappLink } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Eventos y planes",
  description:
    "Consulta la agenda vigente de PISÁO Gastrobar y planea celebraciones, encuentros y experiencias en la Terraza Panorámica de Mall Plaza Cartagena.",
};

const planTypes = [
  {
    icon: Users,
    title: "Celebraciones",
    body: "Cumpleaños, encuentros y mesas para grupos que quieren comer, brindar y quedarse un rato.",
  },
  {
    icon: Music2,
    title: "Noches con ambiente",
    body: "Cuando haya agenda musical o temática vigente, la publicamos aquí con fecha y horario confirmados.",
  },
  {
    icon: Sparkles,
    title: "Experiencias privadas",
    body: "Conversemos si quieres organizar un plan especial, activación o encuentro en la terraza.",
  },
];

function formatEventDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

export default async function EventosPage() {
  // TODO: sustituir por prisma.evento.findMany({ where: { activo: true }, orderBy: { fecha: "asc" } })
  const today = new Date().toISOString().slice(0, 10);
  const eventos = eventosPlaceholder.filter((evento) => evento.fecha >= today);

  return (
    <>
      <section className="relative flex min-h-[66svh] items-end overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image
          src="/gallery/terraza-cervezas.jpg"
          alt="Cervezas artesanales en la terraza de PISÁO"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,17,17,.2)_0%,rgba(17,17,17,.58)_48%,rgba(17,17,17,.96)_100%)]" />
        <Container className="relative w-full pb-14 pt-28 sm:pb-20">
          <div className="max-w-3xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[0.24em] uppercase">
              Agenda & encuentros
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[.96] text-pisao-cream sm:text-7xl">
              Hay noches que merecen
              <span className="block text-pisao-gold">un plan mejor.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-pisao-cream-muted sm:text-lg">
              Consulta aquí únicamente la agenda vigente. Si quieres organizar una celebración o experiencia privada, también podemos empezar por una conversación.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/reservas" variant="primary">Reservar mesa</Button>
              <Button
                href={whatsappLink("Hola PISÁO, quiero consultar opciones para organizar un evento o celebración.")}
                variant="outline"
                target="_blank"
                rel="noreferrer"
              >
                Planear un evento
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
                Próximamente en PISÁO
              </p>
              <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-5xl">
                Agenda vigente.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base lg:justify-self-end">
              Preferimos mostrar menos antes que anunciar fechas vencidas o planes no confirmados. Aquí aparecerán únicamente eventos cuya fecha siga vigente.
            </p>
          </div>

          {eventos.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {eventos.map((evento) => (
                <Link
                  key={evento.id}
                  href={`/eventos/${evento.slug}`}
                  className="group rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche p-6 transition duration-300 hover:-translate-y-1 hover:border-pisao-gold/45 sm:p-8"
                >
                  <div className="flex items-center gap-2 text-pisao-gold">
                    <CalendarDays className="size-4" />
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                      {formatEventDate(evento.fecha)} · {evento.horaInicio}
                    </p>
                  </div>
                  <h3 className="font-display mt-5 text-3xl text-pisao-cream">{evento.titulo}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-pisao-cream-muted">{evento.descripcion}</p>
                  <span className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-pisao-gold">
                    Ver detalles <ArrowRight className="size-4" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche">
              <div className="grid lg:grid-cols-[.9fr_1.1fr] lg:items-center">
                <div className="p-7 sm:p-10">
                  <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">Agenda en actualización</p>
                  <h3 className="font-display mt-3 text-3xl text-pisao-cream sm:text-4xl">No hay una fecha pública vigente que anunciar ahora.</h3>
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-pisao-cream-muted sm:text-base">
                    Puedes reservar una mesa normalmente o escribirnos si tienes un plan grupal. Cuando exista una nueva fecha confirmada, aparecerá aquí.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button href="/reservas" variant="primary">Reservar mesa</Button>
                    <Button
                      href={whatsappLink("Hola PISÁO, quiero saber si tienen próximos eventos o planear una celebración.")}
                      variant="ghost"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Consultar por WhatsApp
                    </Button>
                  </div>
                </div>
                <div className="relative aspect-[16/10] min-h-[280px] lg:aspect-auto lg:h-full">
                  <Image
                    src="/gallery/terraza-atardecer.jpg"
                    alt="Terraza PISÁO al atardecer"
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-r from-pisao-noche/55 via-transparent to-transparent lg:from-pisao-noche/35" />
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>

      <section className="border-y border-pisao-gold/10 bg-pisao-carbon-soft/25 py-16 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">Hazlo tu plan</p>
            <h2 className="font-display mt-3 text-4xl text-pisao-cream sm:text-5xl">La terraza también puede ser el punto de encuentro.</h2>
          </div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {planTypes.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.title} className="rounded-3xl border border-pisao-gold/15 bg-pisao-noche p-6 sm:p-7">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-pisao-gold/10 text-pisao-gold">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-display mt-6 text-2xl text-pisao-cream">{plan.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-pisao-cream-muted">{plan.body}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
