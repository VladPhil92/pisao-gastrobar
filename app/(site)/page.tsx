import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageCircle, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { siteConfig, whatsappLink } from "@/lib/site-config";

const experiences = [
  {
    eyebrow: "Quiero comer ya",
    title: "Arma tu pedido",
    body: "Explora la carta, agrega al carrito y lleva el Caribe a tu mesa.",
    href: "/menu",
    cta: "Ver menú",
    icon: ShoppingBag,
  },
  {
    eyebrow: "Quiero salir",
    title: "Reserva con vista",
    body: "Planea tu visita a la Terraza Panorámica y asegura tu mesa.",
    href: "/reservas",
    cta: "Reservar",
    icon: CalendarCheck,
  },
  {
    eyebrow: "No sé qué elegir",
    title: "Pregúntale a PISÁO",
    body: "Nuestro concierge IA conoce la carta y te ayuda a elegir según tu plan, gustos y presupuesto.",
    href: whatsappLink("Hola PISÁO, quiero que me ayuden a elegir qué pedir."),
    cta: "Hablar con PISÁO",
    icon: MessageCircle,
    external: true,
  },
];

const signaturePlates = [
  {
    src: "/gallery/patacon_callejero.jpg",
    alt: "Patacón Callejero de PISÁO",
    label: "Patacones insignia",
  },
  {
    src: "/gallery/cayeyeCostilla.jpg",
    alt: "Cayeye con costilla de PISÁO",
    label: "Caribe servido en serio",
  },
  {
    src: "/gallery/laguna_azul_burger.jpg",
    alt: "Laguna Azul Burger de PISÁO",
    label: "Burgers con identidad",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-pisao-noche relative flex min-h-[82svh] items-end overflow-hidden lg:min-h-[calc(100svh-4rem)]">
        <Image
          src="/gallery/patacon_callejero.jpg"
          alt="Patacón insignia de PISÁO Gastrobar"
          fill
          priority
          sizes="100vw"
          className="scale-[1.02] object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18)_0%,rgba(17,17,17,.46)_44%,rgba(17,17,17,.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(199,154,58,.18),transparent_36%)]" />

        <Container className="relative w-full pb-14 pt-28 sm:pb-20 lg:pb-24">
          <div className="max-w-4xl">
            <div className="border-pisao-gold/30 bg-pisao-carbon/55 text-pisao-gold inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.24em] uppercase backdrop-blur">
              {siteConfig.location.label}
            </div>
            <h1 className="font-display text-pisao-cream mt-6 max-w-4xl text-5xl leading-[0.98] text-balance sm:text-7xl lg:text-8xl">
              El Caribe no se mira.
              <span className="text-pisao-gold block">Se muerde.</span>
            </h1>
            <p className="text-pisao-cream-muted mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
              Patacones, cayeye, burgers, cerveza y sabores que hablan cartagenero desde una terraza hecha para quedarse.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/menu" variant="primary">Pedir ahora</Button>
              <Button href="/reservas" variant="outline">Reservar mesa</Button>
              <Button
                href={whatsappLink("Hola PISÁO, ayúdame a elegir qué pedir.")}
                variant="ghost"
                target="_blank"
                rel="noreferrer"
              >
                Ayúdame a elegir
              </Button>
            </div>

            <div className="text-pisao-cream-muted mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <span>Terraza Panorámica · Mall Plaza Cartagena</span>
              <span>Pedidos · Reservas · Eventos</span>
              <span>Concierge IA disponible en la web</span>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-pisao-gold/10 border-y py-6">
        <Container className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-pisao-cream text-sm font-semibold">
            Llegaste con hambre. No te hagamos perder tiempo.
          </p>
          <Link href="/menu" className="text-pisao-gold inline-flex items-center gap-2 text-sm font-semibold">
            Ir directo a la carta <ArrowRight className="size-4" />
          </Link>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <p className="text-pisao-gold text-xs font-semibold tracking-[0.25em] uppercase">¿Qué plan tienes?</p>
            <h2 className="font-display text-pisao-cream mt-3 text-4xl leading-tight sm:text-5xl">
              Tú trae el antojo. Nosotros ponemos el resto.
            </h2>
            <p className="text-pisao-cream-muted mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              Comer aquí, pedir en casa o venir con gente. La experiencia empieza por decidir qué tipo de plan quieres hoy.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {experiences.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <div className="bg-pisao-gold/10 text-pisao-gold flex size-11 items-center justify-center rounded-2xl">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-pisao-gold mt-7 text-[11px] font-semibold tracking-[0.2em] uppercase">{item.eyebrow}</p>
                  <h3 className="font-display text-pisao-cream mt-2 text-3xl">{item.title}</h3>
                  <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed">{item.body}</p>
                  <span className="text-pisao-gold mt-7 inline-flex items-center gap-2 text-sm font-semibold">
                    {item.cta} <ArrowRight className="size-4" />
                  </span>
                </>
              );

              const classes =
                "border-pisao-gold/15 bg-pisao-noche hover:border-pisao-gold/40 group rounded-3xl border p-7 transition duration-300 hover:-translate-y-1";

              return item.external ? (
                <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className={classes}>{content}</a>
              ) : (
                <Link key={item.title} href={item.href} className={classes}>{content}</Link>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-pisao-noche py-20 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-pisao-gold text-xs font-semibold tracking-[0.25em] uppercase">Lo que vino a buscar</p>
              <h2 className="font-display text-pisao-cream mt-3 text-4xl sm:text-5xl">Comida que entra primero por los ojos.</h2>
            </div>
            <Button href="/menu" variant="outline">Ver carta completa</Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {signaturePlates.map((plate, index) => (
              <Link href="/menu" key={plate.src} className={`group relative overflow-hidden rounded-3xl ${index === 1 ? "md:translate-y-8" : ""}`}>
                <div className="relative aspect-[4/5]">
                  <Image
                    src={plate.src}
                    alt={plate.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute right-0 bottom-0 left-0 p-6">
                    <p className="font-display text-pisao-cream text-2xl">{plate.label}</p>
                    <span className="text-pisao-gold mt-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      Quiero esto <ArrowRight className="size-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-pisao-gold/10 py-20 sm:py-28">
        <Container className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-14">
          <div className="relative min-h-[520px]">
            <div className="absolute top-0 left-0 h-[72%] w-[72%] overflow-hidden rounded-[2rem] border border-pisao-gold/10">
              <Image
                src="/gallery/terraza-atardecer.jpg"
                alt="Terraza PISÁO al atardecer"
                fill
                sizes="(min-width: 1024px) 34vw, 72vw"
                className="object-cover"
              />
            </div>
            <div className="absolute right-0 bottom-0 h-[52%] w-[52%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon bg-pisao-noche shadow-2xl">
              <Image
                src="/gallery/terraza-cervezas.jpg"
                alt="Cervezas artesanales en la terraza PISÁO"
                fill
                sizes="(min-width: 1024px) 24vw, 52vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:pl-4">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">La experiencia</p>
            <h2 className="font-display text-pisao-cream mt-3 text-4xl leading-tight sm:text-5xl">
              No todo pasa en el plato.
            </h2>
            <p className="text-pisao-cream-muted mt-5 max-w-xl leading-relaxed">
              La luz cambia, llega la cerveza, alguien pide otra ronda y la mesa se alarga. La terraza es parte del producto: no un fondo, sino una razón para venir.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/reservas" variant="primary">Quiero venir</Button>
              <Button href="/galeria" variant="outline">Ver la experiencia</Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="border-pisao-gold/15 bg-pisao-noche inline-flex items-center gap-2 rounded-full border px-4 py-2">
              <span className="bg-pisao-gold size-2 rounded-full" />
              <span className="text-pisao-cream-muted text-xs font-semibold tracking-wider uppercase">Concierge IA PISÁO</span>
            </div>
            <h2 className="font-display text-pisao-cream mt-5 max-w-2xl text-4xl leading-tight sm:text-5xl">
              No necesitas estudiar el menú. Dinos qué se te antoja.
            </h2>
            <p className="text-pisao-cream-muted mt-5 max-w-xl leading-relaxed">
              El asistente de PISÁO consulta la carta disponible, entiende si vienes en pareja, familia o grupo y te ayuda a aterrizar una decisión rápidamente.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs">
              {["Recomendaciones", "Presupuesto", "Reservas", "Domicilios", "Eventos"].map((item) => (
                <span key={item} className="border-pisao-gold/15 text-pisao-cream-muted rounded-full border px-3 py-2">{item}</span>
              ))}
            </div>
            <p className="text-pisao-gold mt-7 text-sm font-semibold">Ábrelo desde el botón “¿Qué se te antoja?” en la esquina inferior.</p>
          </div>

          <div className="border-pisao-gold/20 bg-pisao-noche relative overflow-hidden rounded-[2rem] border p-3">
            <div className="border-pisao-gold/10 rounded-[1.5rem] border bg-black/30 p-5 sm:p-7">
              <p className="text-pisao-cream-muted text-xs">Tú</p>
              <div className="bg-pisao-gold text-pisao-carbon mt-2 ml-auto max-w-[82%] rounded-2xl rounded-br-md px-4 py-3 text-sm">
                Somos 4, queremos compartir algo y después pedir un plato fuerte. Sin gastar una fortuna.
              </div>
              <p className="text-pisao-cream-muted mt-6 text-xs">PISÁO Concierge · IA</p>
              <div className="border-pisao-gold/10 bg-pisao-carbon text-pisao-cream mt-2 max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-4 text-sm leading-relaxed">
                Perfecto. Te ayudo a armar una combinación equilibrada con opciones reales de la carta y te digo cuánto puede costar antes de que pidas.
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-pisao-carbon-soft/35 py-16 sm:py-20">
        <Container className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src="/promo/domicilios-hamburguesas.jpg"
              alt="Promoción de domicilios PISÁO"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="lg:pl-8">
            <p className="text-pisao-gold text-xs font-semibold tracking-[0.24em] uppercase">PISÁO donde estés</p>
            <h2 className="font-display text-pisao-cream mt-3 text-4xl sm:text-5xl">El plan también puede llegar a tu casa.</h2>
            <p className="text-pisao-cream-muted mt-4 max-w-xl leading-relaxed">
              Haz tu pedido desde la carta o continúa por WhatsApp. En domicilios aplica el beneficio vigente indicado por PISÁO.
            </p>
            <div className="border-pisao-gold/25 mt-6 inline-flex items-baseline gap-3 rounded-2xl border px-5 py-4">
              <span className="font-display text-pisao-gold text-4xl">{siteConfig.delivery.descuentoDomicilios}</span>
              <span className="text-pisao-cream-muted text-sm">de descuento en domicilios</span>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/menu" variant="primary">Armar pedido</Button>
              <Button
                href={whatsappLink("Hola PISÁO, quiero hacer un pedido a domicilio.")}
                variant="outline"
                target="_blank"
                rel="noreferrer"
              >
                Pedir por WhatsApp
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
