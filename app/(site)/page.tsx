import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ImageMarquee, Reveal } from "@/components/visual/VisualMotion";
import { siteConfig, whatsappLink } from "@/lib/site-config";

const visualStrip = [
  { src: "/gallery/patacon_callejero.jpg", alt: "Patacón Callejero PISÁO", label: "Callejero" },
  { src: "/gallery/cayeyeCostilla.jpg", alt: "Cayeye con costilla PISÁO", label: "Cayeye + costilla" },
  { src: "/gallery/laguna_azul_burger.jpg", alt: "Laguna Azul Burger PISÁO", label: "Laguna Azul" },
  { src: "/gallery/patacon_montanero.jpg", alt: "Patacón Montañero PISÁO", label: "Montañero" },
  { src: "/gallery/terraza-atardecer.jpg", alt: "Terraza PISÁO al atardecer", label: "La terraza" },
  { src: "/gallery/terraza-cervezas.jpg", alt: "Cervezas artesanales en PISÁO", label: "CTG Craft Beer" },
];

const experiences = [
  {
    eyebrow: "Quiero comer ya",
    title: "Arma tu pedido",
    body: "Explora la carta, activa Modo Plan o construye tu Mesa Visual plato a plato.",
    href: "/menu",
    cta: "Entrar a la carta",
    icon: ShoppingBag,
    image: "/gallery/pataconBurger.jpg",
  },
  {
    eyebrow: "Quiero salir",
    title: "Reserva con vista",
    body: "Haz que la terraza sea parte del plan antes de llegar a Mall Plaza Cartagena.",
    href: "/reservas",
    cta: "Reservar terraza",
    icon: CalendarCheck,
    image: "/gallery/terraza-atardecer.jpg",
  },
  {
    eyebrow: "No sé qué elegir",
    title: "Pregúntale a PISÁO",
    body: "Cuéntanos cuántos son, qué les provoca y cuánto quieren gastar. Te ayudamos a aterrizar la mesa.",
    href: whatsappLink("Hola PISÁO, quiero que me ayuden a elegir qué pedir."),
    cta: "Hablar con PISÁO",
    icon: MessageCircle,
    image: "/gallery/pisaoBowl.jpg",
    external: true,
  },
];

const editorialPlates = [
  {
    src: "/gallery/patacon_callejero.jpg",
    alt: "Patacón Callejero de PISÁO",
    label: "Patacones insignia",
    className: "md:col-span-7 md:row-span-2",
  },
  {
    src: "/gallery/cayeyeCostilla.jpg",
    alt: "Cayeye con costilla de PISÁO",
    label: "Caribe servido en serio",
    className: "md:col-span-5 md:row-span-3",
  },
  {
    src: "/gallery/laguna_azul_burger.jpg",
    alt: "Laguna Azul Burger de PISÁO",
    label: "Burgers con identidad",
    className: "md:col-span-4 md:row-span-2",
  },
  {
    src: "/gallery/ceviche_chicharron.jpg",
    alt: "Ceviche de chicharrón de PISÁO",
    label: "Antojos para compartir",
    className: "md:col-span-3 md:row-span-2",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="pisao-grain bg-pisao-noche relative min-h-[88svh] overflow-hidden lg:min-h-[calc(100svh-4rem)]">
        <Image
          src="/gallery/patacon_callejero.jpg"
          alt="Patacón insignia de PISÁO Gastrobar"
          fill
          priority
          sizes="100vw"
          className="scale-[1.04] object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.94)_0%,rgba(17,17,17,.80)_46%,rgba(17,17,17,.28)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,17,.92)_100%)]" />
        <div className="pisao-ambient-glow absolute -top-24 right-[8%] size-[32rem] rounded-full bg-pisao-gold/15 blur-[100px]" />

        <Container className="relative grid min-h-[88svh] items-end gap-10 pb-16 pt-28 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-20">
          <div className="relative z-10 max-w-4xl">
            <div className="border-pisao-gold/30 bg-pisao-carbon/55 text-pisao-gold inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.24em] uppercase backdrop-blur-xl">
              {siteConfig.location.label}
            </div>
            <h1 className="font-display text-pisao-cream mt-6 text-5xl leading-[0.91] text-balance sm:text-7xl lg:text-[6.6rem]">
              El Caribe no se mira.
              <span className="text-pisao-gold block">Se muerde.</span>
            </h1>
            <p className="text-pisao-cream mt-6 max-w-2xl text-base leading-relaxed sm:text-xl sm:leading-relaxed">
              Patacones, cayeye, burgers y cerveza artesanal en una experiencia que empieza en la pantalla y termina alrededor de una mesa.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/menu" variant="primary">Pedir ahora</Button>
              <Button href="/reservas" variant="outline">Reservar mesa</Button>
              <Button href="/galeria" variant="ghost">Ver PISÁO</Button>
            </div>

            <div className="text-pisao-cream-muted mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <span>Terraza Panorámica · Mall Plaza Cartagena</span>
              <span>Modo Plan · Mesa Visual · Concierge</span>
            </div>
          </div>

          <div className="relative hidden min-h-[610px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-0 top-[4%] h-[66%] w-[66%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/25 shadow-2xl">
              <Image src="/gallery/cayeyeCostilla.jpg" alt="Cayeye con costilla" fill sizes="34vw" className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
              <p className="font-display absolute bottom-6 left-6 text-3xl text-pisao-cream">Cayeye que habla Caribe.</p>
            </div>
            <div className="pisao-float-slower pisao-image-lift absolute bottom-[4%] left-[3%] h-[44%] w-[42%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon shadow-2xl">
              <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas en la terraza" fill sizes="22vw" className="object-cover" />
            </div>
            <div className="pisao-image-lift absolute bottom-[2%] right-[3%] h-[31%] w-[34%] rotate-[4deg] overflow-hidden rounded-[1.75rem] border border-pisao-gold/25 bg-pisao-noche shadow-2xl">
              <Image src="/gallery/laguna_azul_burger.jpg" alt="Laguna Azul Burger" fill sizes="18vw" className="object-cover" />
            </div>
            <div className="border-pisao-gold/30 bg-pisao-carbon/80 absolute left-[7%] top-[18%] rounded-full border px-4 py-2 text-[10px] font-semibold tracking-[.2em] text-pisao-gold uppercase backdrop-blur-xl">
              No es catálogo. Es antojo.
            </div>
          </div>
        </Container>

        <a href="#elige-tu-plan" className="text-pisao-cream-muted absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2 text-[10px] font-semibold tracking-[.2em] uppercase sm:flex">
          Descubrir <ArrowDown className="size-3.5" />
        </a>
      </section>

      <section className="border-pisao-gold/10 bg-pisao-carbon border-y py-5">
        <ImageMarquee photos={visualStrip} />
      </section>

      <section id="elige-tu-plan" className="py-20 sm:py-28">
        <Container>
          <Reveal className="max-w-3xl">
            <p className="text-pisao-gold text-xs font-semibold tracking-[0.25em] uppercase">¿Qué plan tienes?</p>
            <h2 className="font-display text-pisao-cream mt-3 max-w-[18ch] text-4xl leading-[1.02] text-balance sm:text-5xl lg:text-6xl">
              No empieces por leer.
              <span className="block text-pisao-gold">Empieza por sentir hambre.</span>
            </h2>
            <p className="text-pisao-cream-muted mt-5 max-w-2xl text-sm leading-relaxed sm:text-base">
              La navegación se organiza alrededor de lo que quieres hacer, no alrededor de una lista de enlaces.
            </p>
          </Reveal>

          <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {experiences.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <>
                  <Image src={item.image} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.16)_35%,rgba(8,8,8,.94)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-7 lg:p-6 xl:p-7">
                    <div className="bg-pisao-gold/15 text-pisao-gold mb-5 flex size-11 items-center justify-center rounded-2xl border border-pisao-gold/20 backdrop-blur-xl">
                      <Icon className="size-5" />
                    </div>
                    <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.2em] uppercase">{item.eyebrow}</p>
                    <h3 className="font-display text-pisao-cream mt-2 max-w-[15ch] text-3xl leading-[1.02] text-balance xl:text-4xl">{item.title}</h3>
                    <p className="text-pisao-cream-muted mt-3 max-w-[34rem] text-sm leading-6 text-pretty">{item.body}</p>
                    <span className="text-pisao-gold mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                      {item.cta} <ArrowRight className="size-4" />
                    </span>
                  </div>
                </>
              );

              const classes = "pisao-image-lift group relative block h-full min-h-[420px] w-full min-w-0 overflow-hidden rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche sm:min-h-[460px] xl:min-h-[500px]";

              return (
                <Reveal key={item.title} delay={index * 100} className="h-full min-w-0">
                  {item.external ? (
                    <a href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a>
                  ) : (
                    <Link href={item.href} className={classes}>{content}</Link>
                  )}
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-pisao-noche overflow-hidden py-20 sm:py-28">
        <Container>
          <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-pisao-gold text-xs font-semibold tracking-[0.25em] uppercase">Lo que vino a buscar</p>
              <h2 className="font-display text-pisao-cream mt-3 text-4xl leading-[.98] sm:text-6xl">
                La carta también puede ser una galería.
              </h2>
            </div>
            <Button href="/menu" variant="outline">Ver carta completa</Button>
          </Reveal>

          <div className="mt-12 grid auto-rows-[190px] gap-4 md:grid-cols-12 md:auto-rows-[170px]">
            {editorialPlates.map((plate, index) => (
              <Reveal key={plate.src} delay={index * 90} className={plate.className}>
                <Link href="/menu" className="pisao-image-lift group relative block h-full overflow-hidden rounded-[2rem] border border-pisao-gold/10">
                  <Image src={plate.src} alt={plate.alt} fill sizes="(min-width:768px) 55vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/5 to-transparent" />
                  <div className="absolute right-0 bottom-0 left-0 p-6">
                    <p className="font-display text-pisao-cream text-2xl sm:text-3xl">{plate.label}</p>
                    <span className="text-pisao-gold mt-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.18em] uppercase">
                      Llevar a mi mesa <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden border-y border-pisao-gold/10 py-20 sm:py-28">
        <div className="pisao-ambient-glow absolute -left-32 top-20 size-[34rem] rounded-full bg-pisao-gold/8 blur-[110px]" />
        <Container className="relative grid gap-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16">
          <Reveal className="relative min-h-[580px]">
            <div className="pisao-image-lift absolute top-0 left-0 h-[76%] w-[74%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/15">
              <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO al atardecer" fill sizes="(min-width:1024px) 40vw, 74vw" className="object-cover" />
            </div>
            <div className="pisao-float-slow pisao-image-lift absolute right-0 bottom-0 h-[56%] w-[54%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon bg-pisao-noche shadow-2xl">
              <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales en la terraza PISÁO" fill sizes="(min-width:1024px) 28vw, 54vw" className="object-cover" />
            </div>
            <div className="border-pisao-gold/20 bg-pisao-carbon/80 absolute bottom-[8%] left-[4%] max-w-[240px] rounded-2xl border p-4 backdrop-blur-xl">
              <p className="text-pisao-gold text-[9px] font-semibold tracking-[.2em] uppercase">La hora dorada</p>
              <p className="font-display mt-1 text-xl text-pisao-cream">La terraza cambia cuando cae la tarde.</p>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:pl-4">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">La experiencia</p>
            <h2 className="font-display text-pisao-cream mt-3 text-4xl leading-tight sm:text-6xl">No todo pasa en el plato.</h2>
            <p className="text-pisao-cream-muted mt-5 max-w-xl leading-relaxed">
              La luz cambia, llega la cerveza, alguien pide otra ronda y la mesa se alarga. La terraza es parte del producto: no un fondo, sino una razón para venir.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/reservas" variant="primary">Quiero venir</Button>
              <Button href="/galeria" variant="outline">Ver la experiencia</Button>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
          <Reveal>
            <div className="border-pisao-gold/15 bg-pisao-noche inline-flex items-center gap-2 rounded-full border px-4 py-2">
              <Sparkles className="text-pisao-gold size-3.5" />
              <span className="text-pisao-cream-muted text-xs font-semibold tracking-wider uppercase">Concierge IA PISÁO</span>
            </div>
            <h2 className="font-display text-pisao-cream mt-5 max-w-2xl text-4xl leading-tight sm:text-6xl">
              Menos chatbot.
              <span className="text-pisao-gold block">Más mesa.</span>
            </h2>
            <p className="text-pisao-cream-muted mt-5 max-w-xl leading-relaxed">
              El asistente consulta la carta disponible y ayuda a convertir una conversación en una decisión gastronómica concreta según grupo, gusto y presupuesto.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs">
              {["Recomendaciones", "Presupuesto", "Reservas", "Domicilios", "Eventos"].map((item) => (
                <span key={item} className="border-pisao-gold/15 text-pisao-cream-muted rounded-full border px-3 py-2">{item}</span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className="relative min-h-[510px]">
            <div className="pisao-image-lift absolute right-0 top-0 h-[78%] w-[66%] overflow-hidden rounded-[2.25rem] border border-pisao-gold/15">
              <Image src="/gallery/patacon_montanero.jpg" alt="Patacón Montañero" fill sizes="34vw" className="object-cover" />
            </div>
            <div className="border-pisao-gold/20 bg-pisao-noche/95 absolute bottom-0 left-0 z-10 w-[78%] rounded-[2rem] border p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <p className="text-pisao-cream-muted text-xs">Tú</p>
              <div className="bg-pisao-gold text-pisao-carbon mt-2 ml-auto max-w-[86%] rounded-2xl rounded-br-md px-4 py-3 text-sm">
                Somos 4. Queremos compartir y después algo fuerte. Presupuesto: $180.000.
              </div>
              <p className="text-pisao-cream-muted mt-5 text-xs">PISÁO Concierge</p>
              <div className="border-pisao-gold/10 bg-pisao-carbon text-pisao-cream mt-2 max-w-[94%] rounded-2xl rounded-bl-md border px-4 py-4 text-sm leading-relaxed">
                Te ayudo a construir una mesa con opciones reales de la carta y a ver el total antes de pedir.
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-pisao-carbon-soft/35 overflow-hidden py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <Reveal className="relative min-h-[430px]">
            <div className="pisao-image-lift absolute inset-y-0 left-0 w-[86%] overflow-hidden rounded-[2.5rem]">
              <Image src="/promo/domicilios-hamburguesas.jpg" alt="Promoción de domicilios PISÁO" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
            </div>
            <div className="bg-pisao-gold text-pisao-carbon absolute right-0 bottom-8 rounded-[1.75rem] px-6 py-5 shadow-2xl">
              <span className="font-display block text-5xl">{siteConfig.delivery.descuentoDomicilios}</span>
              <span className="mt-1 block max-w-28 text-xs font-bold uppercase">beneficio en domicilios</span>
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:pl-8">
            <p className="text-pisao-gold text-xs font-semibold tracking-[0.24em] uppercase">PISÁO donde estés</p>
            <h2 className="font-display text-pisao-cream mt-3 text-4xl leading-tight sm:text-6xl">El plan también puede llegar a tu casa.</h2>
            <p className="text-pisao-cream-muted mt-4 max-w-xl leading-relaxed">
              Haz tu pedido desde la carta o continúa por WhatsApp. El recorrido mantiene la misma identidad visual: primero antojo, después decisión.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/menu" variant="primary">Armar pedido</Button>
              <Button href={whatsappLink("Hola PISÁO, quiero hacer un pedido a domicilio.")} variant="outline" target="_blank" rel="noreferrer">
                Pedir por WhatsApp
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
