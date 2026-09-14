import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, MapPin, Users, MessageCircle, ArrowDown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/visual/VisualMotion";
import { siteConfig } from "@/lib/site-config";
import { ReservaForm } from "./ReservaForm";

export const metadata: Metadata = {
  title: "Reservas PISÁO",
  description:
    "Reserva tu mesa en PISÁO Gastrobar, Terraza Panorámica de Mall Plaza Cartagena. Elige fecha, hora y número de personas.",
};

const steps = [
  { icon: CalendarDays, step: "01", title: "Elige cuándo", body: "Selecciona una fecha y un horario dentro de nuestra operación." },
  { icon: Users, step: "02", title: "Dinos cuántos", body: "La solicitud se adapta a pareja, familia o grupo." },
  { icon: MessageCircle, step: "03", title: "Confirmamos contigo", body: "Nuestro equipo valida la solicitud antes de darla por confirmada." },
];

export default function ReservasPage() {
  return (
    <>
      <section className="pisao-grain relative min-h-[78svh] overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza panorámica de PISÁO Gastrobar" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.97)_0%,rgba(17,17,17,.82)_45%,rgba(17,17,17,.24)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,17,.94)_100%)]" />
        <div className="pisao-ambient-glow absolute right-[6%] top-[8%] size-[32rem] rounded-full bg-pisao-gold/14 blur-[100px]" />

        <Container className="relative grid min-h-[78svh] items-end gap-10 pb-16 pt-28 lg:grid-cols-[1fr_.92fr] lg:items-center lg:pb-20">
          <div className="relative z-10 max-w-3xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[.24em] uppercase">Tu mesa, tu momento</p>
            <h1 className="font-display mt-4 text-5xl leading-[.91] text-pisao-cream sm:text-7xl lg:text-[6.3rem]">
              No reserves una mesa.
              <span className="block text-pisao-gold">Reserva el plan.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-pisao-cream sm:text-xl">La terraza, la hora dorada y la gente con la que vienes también hacen parte de la experiencia.</p>
            <a href="#reservar" className="mt-8 inline-flex items-center gap-2 rounded-full border border-pisao-gold/25 bg-pisao-carbon/55 px-4 py-2.5 text-xs font-semibold text-pisao-gold backdrop-blur-xl">
              Empezar reserva <ArrowDown className="size-3.5" />
            </a>
          </div>

          <div className="relative hidden min-h-[570px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-0 top-[2%] h-[69%] w-[68%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/20 shadow-2xl">
              <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales en la terraza PISÁO" fill sizes="34vw" className="object-cover" />
            </div>
            <div className="pisao-float-slower pisao-image-lift absolute bottom-[1%] left-[3%] h-[47%] w-[47%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon shadow-2xl">
              <Image src="/gallery/cayeyeCostilla.jpg" alt="Cayeye con costilla en PISÁO" fill sizes="24vw" className="object-cover" />
            </div>
            <div className="absolute bottom-[7%] right-[2%] rounded-2xl border border-pisao-gold/25 bg-pisao-carbon/88 p-5 backdrop-blur-xl">
              <MapPin className="size-4 text-pisao-gold" />
              <p className="font-display mt-2 max-w-[220px] text-2xl leading-tight text-pisao-cream">Terraza Panorámica · Mall Plaza Cartagena.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-pisao-gold/10 bg-pisao-noche py-8 sm:py-10">
        <Container className="grid gap-3 md:grid-cols-3">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.step} delay={index * 90}>
                <div className="group flex h-full gap-4 rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-5 transition duration-300 hover:border-pisao-gold/30">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-pisao-gold/10 text-pisao-gold"><Icon className="size-5" /></div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-[.18em] text-pisao-gold uppercase">Paso {item.step}</p>
                    <p className="mt-1 font-display text-xl text-pisao-cream">{item.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </Container>
      </section>

      <section id="reservar" className="relative overflow-hidden py-16 sm:py-24">
        <div className="pisao-ambient-glow absolute -left-40 top-24 size-[34rem] rounded-full bg-pisao-gold/8 blur-[120px]" />
        <Container className="relative grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-16">
          <Reveal className="lg:sticky lg:top-28">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Antes de venir</p>
            <h2 className="font-display mt-3 text-4xl leading-[.98] text-pisao-cream sm:text-5xl">Reserva simple. Confirmación humana.</h2>
            <p className="mt-5 text-sm leading-relaxed text-pisao-cream-muted sm:text-base">Esta solicitud no inventa disponibilidad automática. Una vez enviada, PISÁO valida los detalles y confirma contigo por los canales de contacto registrados.</p>

            <div className="mt-7 overflow-hidden rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche">
              <div className="relative aspect-[16/10]">
                <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO" fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
                <p className="font-display absolute right-5 bottom-4 left-5 text-2xl text-pisao-cream">La hora cambia la experiencia.</p>
              </div>
              <div className="p-5">
                <p className="text-[10px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Horario</p>
                <div className="mt-3 space-y-2 text-sm text-pisao-cream-muted">
                  {siteConfig.hours.map((item) => (
                    <p key={item.dia}><span className="font-semibold text-pisao-cream">{item.dia}:</span> {item.horario}</p>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-pisao-gold/18 bg-pisao-noche p-5 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-pisao-gold/8 blur-3xl" />
              <div className="relative mb-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Solicitud de reserva</p>
                  <h3 className="font-display mt-2 text-3xl text-pisao-cream sm:text-4xl">Cuéntanos tu plan.</h3>
                </div>
                <span className="hidden rounded-full border border-pisao-gold/15 px-3 py-2 text-[9px] font-semibold tracking-[.15em] text-pisao-cream-muted uppercase sm:inline-flex">Terraza PISÁO</span>
              </div>
              <div className="relative"><ReservaForm /></div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
