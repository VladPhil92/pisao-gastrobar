import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Music2, Sparkles, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/visual/VisualMotion";
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
    image: "/gallery/patacon_callejero.jpg",
  },
  {
    icon: Music2,
    title: "Noches con ambiente",
    body: "Cuando haya agenda musical o temática vigente, la publicamos aquí con fecha y horario confirmados.",
    image: "/gallery/terraza-cervezas.jpg",
  },
  {
    icon: Sparkles,
    title: "Experiencias privadas",
    body: "Conversemos si quieres organizar un plan especial, activación o encuentro en la terraza.",
    image: "/gallery/terraza-atardecer.jpg",
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
      <section className="pisao-grain relative min-h-[76svh] overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales en la terraza de PISÁO" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.96)_0%,rgba(17,17,17,.78)_46%,rgba(17,17,17,.22)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,17,.96)_100%)]" />
        <div className="pisao-ambient-glow absolute right-[8%] top-[8%] size-[32rem] rounded-full bg-pisao-gold/14 blur-[110px]" />

        <Container className="relative grid min-h-[76svh] items-end gap-12 pb-16 pt-28 lg:grid-cols-[1fr_.85fr] lg:items-center lg:pb-20">
          <div className="max-w-3xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[.24em] uppercase">Agenda & encuentros</p>
            <h1 className="font-display mt-4 text-5xl leading-[.91] text-pisao-cream sm:text-7xl lg:text-[6.2rem]">
              No vengas solo por la fecha.
              <span className="block text-pisao-gold">Ven por el plan.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-pisao-cream sm:text-xl">Agenda confirmada cuando exista. Celebraciones y encuentros privados cuando quieras construir algo propio.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/reservas" variant="primary">Reservar mesa</Button>
              <Button href={whatsappLink("Hola PISÁO, quiero consultar opciones para organizar un evento o celebración.")} variant="outline" target="_blank" rel="noreferrer">Planear un evento</Button>
            </div>
          </div>

          <div className="relative hidden min-h-[540px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-0 top-[4%] h-[68%] w-[68%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/20 shadow-2xl">
              <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO al atardecer" fill sizes="34vw" className="object-cover" />
            </div>
            <div className="pisao-float-slower pisao-image-lift absolute bottom-[2%] left-[4%] h-[45%] w-[45%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon shadow-2xl">
              <Image src="/gallery/laguna_azul_burger.jpg" alt="Burger de PISÁO" fill sizes="23vw" className="object-cover" />
            </div>
            <div className="absolute bottom-[8%] right-[2%] max-w-[215px] rounded-2xl border border-pisao-gold/25 bg-pisao-carbon/88 p-5 backdrop-blur-xl">
              <p className="text-[9px] font-semibold tracking-[.18em] text-pisao-gold uppercase">Una buena noche</p>
              <p className="font-display mt-2 text-2xl leading-tight text-pisao-cream">Empieza antes de sentarse.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <Reveal className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Próximamente en PISÁO</p>
              <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-6xl">Agenda vigente. Sin relleno.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base lg:justify-self-end">Preferimos mostrar menos antes que anunciar fechas vencidas o planes no confirmados. Aquí aparecerán únicamente eventos cuya fecha siga vigente.</p>
          </Reveal>

          {eventos.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {eventos.map((evento, index) => (
                <Reveal key={evento.id} delay={index * 90}>
                  <Link href={`/eventos/${evento.slug}`} className="group relative block min-h-[390px] overflow-hidden rounded-[2.25rem] border border-pisao-gold/15 bg-pisao-noche transition duration-300 hover:-translate-y-1 hover:border-pisao-gold/45">
                    <Image src={index % 2 === 0 ? "/gallery/terraza-atardecer.jpg" : "/gallery/terraza-cervezas.jpg"} alt="" fill sizes="50vw" className="object-cover opacity-70 transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/45 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                      <div className="flex items-center gap-2 text-pisao-gold"><CalendarDays className="size-4" /><p className="text-[10px] font-semibold tracking-[.18em] uppercase">{formatEventDate(evento.fecha)} · {evento.horaInicio}</p></div>
                      <h3 className="font-display mt-4 text-3xl text-pisao-cream sm:text-4xl">{evento.titulo}</h3>
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-pisao-cream-muted">{evento.descripcion}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-pisao-gold">Ver detalles <ArrowRight className="size-4" /></span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal delay={100} className="mt-10">
              <div className="overflow-hidden rounded-[2.5rem] border border-pisao-gold/15 bg-pisao-noche">
                <div className="grid lg:grid-cols-[.85fr_1.15fr] lg:items-stretch">
                  <div className="relative z-10 p-7 sm:p-10 lg:p-12">
                    <p className="text-pisao-gold text-[10px] font-semibold tracking-[.18em] uppercase">Agenda en actualización</p>
                    <h3 className="font-display mt-3 text-3xl leading-tight text-pisao-cream sm:text-5xl">Hoy no necesitamos inventarte una fecha para darte una razón para venir.</h3>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-pisao-cream-muted sm:text-base">Puedes reservar una mesa normalmente o escribirnos si tienes un plan grupal. Cuando exista una nueva fecha confirmada, aparecerá aquí.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      <Button href="/reservas" variant="primary">Reservar mesa</Button>
                      <Button href={whatsappLink("Hola PISÁO, quiero saber si tienen próximos eventos o planear una celebración.")} variant="ghost" target="_blank" rel="noreferrer">Consultar por WhatsApp</Button>
                    </div>
                  </div>
                  <div className="relative min-h-[360px] overflow-hidden">
                    <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO al atardecer" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-linear-to-r from-pisao-noche/75 via-pisao-noche/10 to-transparent" />
                    <div className="absolute right-6 bottom-6 rounded-full border border-pisao-gold/20 bg-pisao-carbon/65 px-4 py-2 text-[10px] font-semibold tracking-[.16em] text-pisao-gold uppercase backdrop-blur">Terraza · Cartagena</div>
                  </div>
                </div>
              </div>
            </Reveal>
          )}
        </Container>
      </section>

      <section className="border-y border-pisao-gold/10 bg-pisao-carbon-soft/25 py-16 sm:py-24">
        <Container>
          <Reveal className="max-w-3xl">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Hazlo tu plan</p>
            <h2 className="font-display mt-3 text-4xl leading-[.98] text-pisao-cream sm:text-6xl">La terraza también puede ser el punto de encuentro.</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {planTypes.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <Reveal key={plan.title} delay={index * 100}>
                  <article className="pisao-image-lift group relative min-h-[430px] overflow-hidden rounded-[2.25rem] border border-pisao-gold/15 bg-pisao-noche">
                    <Image src={plan.image} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.22)_45%,rgba(8,8,8,.94)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-pisao-gold/20 bg-pisao-gold/12 text-pisao-gold backdrop-blur"><Icon className="size-5" /></div>
                      <h3 className="font-display mt-5 text-3xl text-pisao-cream">{plan.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-pisao-cream-muted">{plan.body}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
