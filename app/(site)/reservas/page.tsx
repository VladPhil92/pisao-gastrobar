import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";
import { ReservaForm } from "./ReservaForm";

export const metadata: Metadata = {
  title: "Reservas PISÁO",
  description:
    "Reserva tu mesa en PISÁO Gastrobar, Terraza Panorámica de Mall Plaza Cartagena. Elige fecha, hora y número de personas.",
};

export default function ReservasPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <div className="absolute inset-0 lg:left-[48%]">
          <Image
            src="/gallery/terraza-atardecer.jpg"
            alt="Terraza panorámica de PISÁO Gastrobar"
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,1)_0%,rgba(17,17,17,.88)_28%,rgba(17,17,17,.35)_100%)] lg:bg-[linear-gradient(90deg,rgba(17,17,17,.98)_0%,rgba(17,17,17,.36)_36%,rgba(17,17,17,.12)_100%)]" />
        </div>

        <Container className="relative py-20 sm:py-24 lg:py-32">
          <div className="max-w-xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[0.24em] uppercase">
              Tu mesa, tu momento
            </p>
            <h1 className="font-display mt-4 text-5xl leading-[.96] text-pisao-cream sm:text-7xl">
              La terraza te espera.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-pisao-cream-muted sm:text-lg">
              Elige cuándo vienes y con quién. Nosotros recibimos tu solicitud y nuestro equipo confirma los detalles de la reserva.
            </p>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon/55 p-4 backdrop-blur">
                <CalendarDays className="size-5 text-pisao-gold" />
                <p className="mt-3 font-semibold text-pisao-cream">Elige tu horario</p>
                <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">Según nuestros horarios de atención.</p>
              </div>
              <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon/55 p-4 backdrop-blur">
                <Users className="size-5 text-pisao-gold" />
                <p className="mt-3 font-semibold text-pisao-cream">Dinos cuántos son</p>
                <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">Pareja, familia o grupo.</p>
              </div>
              <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon/55 p-4 backdrop-blur">
                <MapPin className="size-5 text-pisao-gold" />
                <p className="mt-3 font-semibold text-pisao-cream">Terraza Panorámica</p>
                <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">{siteConfig.location.label}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
              Antes de venir
            </p>
            <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-5xl">
              Reserva simple. Confirmación humana.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-pisao-cream-muted sm:text-base">
              Esta solicitud no inventa disponibilidad automática. Una vez enviada, PISÁO valida los detalles y confirma contigo por los canales de contacto registrados.
            </p>
            <div className="mt-7 rounded-2xl border border-pisao-gold/15 bg-pisao-noche p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-pisao-gold uppercase">Horario</p>
              <div className="mt-3 space-y-2 text-sm text-pisao-cream-muted">
                {siteConfig.hours.map((item) => (
                  <p key={item.days}>
                    <span className="font-semibold text-pisao-cream">{item.days}:</span> {item.hours}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
            <div className="mb-7">
              <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">Solicitud de reserva</p>
              <h3 className="font-display mt-2 text-3xl text-pisao-cream">Cuéntanos tu plan.</h3>
            </div>
            <ReservaForm />
          </div>
        </Container>
      </section>
    </>
  );
}
