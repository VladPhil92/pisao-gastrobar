import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Beer, MapPin, Sprout, UtensilsCrossed } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/visual/VisualMotion";

export const metadata: Metadata = {
  title: "Nosotros | PISÁO Gastrobar",
  description:
    "Conoce la identidad de PISÁO: cocina caribeña contemporánea, patacón, terraza y cerveza artesanal en Cartagena.",
};

const pillars = [
  {
    icon: Sprout,
    eyebrow: "Origen",
    title: "Plátano con memoria.",
    body: "Tomamos ingredientes y preparaciones reconocibles del Caribe y los llevamos a una mesa contemporánea sin esconder de dónde vienen.",
    image: "/gallery/patacon_montanero.jpg",
  },
  {
    icon: UtensilsCrossed,
    eyebrow: "Cocina",
    title: "Comer con las manos también cuenta una historia.",
    body: "Patacones, cayeye, burgers, entradas y platos para compartir construyen una carta directa, abundante y visual.",
    image: "/gallery/cayeyeCostilla.jpg",
  },
  {
    icon: Beer,
    eyebrow: "Alianza",
    title: "La cerveza también es parte de la mesa.",
    body: "PISÁO comparte experiencia con CTG Craft Beer: cerveza artesanal cartagenera integrada al plan gastronómico, no puesta como un accesorio aparte.",
    image: "/gallery/terraza-cervezas.jpg",
  },
];

export default function NosotrosPage() {
  return (
    <>
      <section className="pisao-grain relative min-h-[78svh] overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza de PISÁO al atardecer" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.97)_0%,rgba(17,17,17,.84)_47%,rgba(17,17,17,.28)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(17,17,17,.94)_100%)]" />
        <div className="pisao-ambient-glow absolute -top-32 right-[10%] size-[34rem] rounded-full bg-pisao-gold/15 blur-[110px]" />

        <Container className="relative grid min-h-[78svh] items-end gap-10 pb-16 pt-28 lg:grid-cols-[1fr_.9fr] lg:items-center lg:pb-20">
          <div className="relative z-10 max-w-3xl">
            <p className="text-pisao-gold text-[11px] font-semibold tracking-[.24em] uppercase">Nuestra identidad</p>
            <h1 className="font-display mt-4 text-5xl leading-[.91] text-pisao-cream sm:text-7xl lg:text-[6.4rem]">
              El Caribe no es decoración.
              <span className="block text-pisao-gold">Es la materia prima.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-pisao-cream sm:text-xl">
              PISÁO es una forma de servir Cartagena: plátano, mesa compartida, cerveza artesanal y una terraza que cambia con la luz.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/menu" variant="primary">Conocer la carta</Button>
              <Button href="/reservas" variant="outline">Venir a la terraza</Button>
            </div>
          </div>

          <div className="relative hidden min-h-[560px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-[3%] top-[4%] h-[67%] w-[64%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/20 shadow-2xl">
              <Image src="/gallery/patacon_callejero.jpg" alt="Patacón Callejero de PISÁO" fill sizes="32vw" className="object-cover" />
            </div>
            <div className="pisao-float-slower pisao-image-lift absolute bottom-[3%] left-[4%] h-[48%] w-[45%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon shadow-2xl">
              <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales en PISÁO" fill sizes="23vw" className="object-cover" />
            </div>
            <div className="absolute bottom-[10%] right-[2%] max-w-[235px] rounded-2xl border border-pisao-gold/25 bg-pisao-carbon/85 p-5 backdrop-blur-xl">
              <p className="text-[9px] font-semibold tracking-[.2em] text-pisao-gold uppercase">PISÁO en una frase</p>
              <p className="font-display mt-2 text-2xl leading-tight text-pisao-cream">Sabor reconocible. Presentación inesperada.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-start lg:gap-16">
          <Reveal className="lg:sticky lg:top-28">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Por qué existe PISÁO</p>
            <h2 className="font-display mt-3 text-4xl leading-[.98] text-pisao-cream sm:text-6xl">Lo cotidiano también puede sentirse extraordinario.</h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base">
              No buscamos disfrazar la cocina caribeña. Buscamos darle escenario: mejores contrastes, una presentación más editorial y un recorrido donde la comida, la bebida y la terraza formen una sola experiencia.
            </p>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-pisao-gold/15 bg-pisao-noche p-5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-pisao-gold" />
              <div>
                <p className="font-semibold text-pisao-cream">Cartagena de Indias</p>
                <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">Terraza Panorámica · C.C. Mall Plaza Cartagena.</p>
              </div>
            </div>
          </Reveal>

          <div className="space-y-5">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <Reveal key={pillar.title} delay={index * 100}>
                  <article className="pisao-image-lift group relative min-h-[430px] overflow-hidden rounded-[2.25rem] border border-pisao-gold/12 bg-pisao-noche">
                    <Image src={pillar.image} alt="" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.02)_10%,rgba(0,0,0,.28)_48%,rgba(8,8,8,.95)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-pisao-gold/20 bg-pisao-gold/12 text-pisao-gold backdrop-blur-xl">
                        <Icon className="size-5" />
                      </div>
                      <p className="mt-5 text-[10px] font-semibold tracking-[.2em] text-pisao-gold uppercase">{pillar.eyebrow}</p>
                      <h3 className="font-display mt-2 max-w-xl text-3xl leading-tight text-pisao-cream sm:text-4xl">{pillar.title}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base">{pillar.body}</p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="overflow-hidden border-y border-pisao-gold/10 bg-pisao-noche py-20 sm:py-28">
        <Container className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <Reveal className="relative min-h-[500px]">
            <div className="pisao-image-lift absolute inset-y-0 left-0 w-[78%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/15">
              <Image src="/gallery/patacon_montanero.jpg" alt="Patacón Montañero PISÁO" fill sizes="45vw" className="object-cover" />
            </div>
            <div className="pisao-float-slow pisao-image-lift absolute bottom-[5%] right-0 h-[47%] w-[46%] overflow-hidden rounded-[2rem] border-4 border-pisao-noche shadow-2xl">
              <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO" fill sizes="25vw" className="object-cover" />
            </div>
          </Reveal>
          <Reveal delay={120} className="lg:pl-8">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">La idea completa</p>
            <h2 className="font-display mt-3 text-4xl leading-tight text-pisao-cream sm:text-6xl">Una mesa que se recuerda antes de terminarla.</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-pisao-cream-muted">
              La experiencia digital y la experiencia física deben contar la misma historia. Por eso la web muestra platos reales, la terraza real y decisiones reales: mirar, elegir, reservar, pedir y volver.
            </p>
            <Link href="/galeria" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-pisao-gold">
              Ver PISÁO en imágenes <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
