import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { siteConfig, whatsappLink } from "@/lib/site-config";

export default function HomePage() {
  return (
    <>
      <section className="bg-pisao-noche relative flex min-h-[70svh] items-center overflow-hidden sm:min-h-[80svh] lg:min-h-[calc(100svh-4rem)]">
        <Image
          src="/gallery/patacon-especial.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="via-pisao-carbon/70 to-pisao-carbon absolute inset-0 bg-linear-to-b from-black/40" />

        <Container className="relative py-24 text-center sm:text-left">
          <p className="text-pisao-gold text-xs font-semibold tracking-[0.3em] uppercase">
            {siteConfig.location.label}
          </p>
          <h1 className="font-display text-pisao-cream mt-4 max-w-2xl text-5xl leading-tight sm:text-6xl">
            Sabor caribeño, altura urbana.
          </h1>
          <p className="text-pisao-cream-muted mt-5 max-w-xl sm:text-lg">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/menu" variant="primary">
              Ver Menú
            </Button>
            <Button href="/reservas" variant="outline">
              Reservar
            </Button>
            <Button href="/menu" variant="ghost">
              Pedir Ahora
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Terraza panorámica",
              body: "Vive la experiencia PISÁO con vista privilegiada sobre Cartagena.",
            },
            {
              title: "Cocina de autor",
              body: "Cocina caribeña contemporánea con producto local e influencia urbana.",
            },
            {
              title: "Cripto beneficios",
              body: "Paga con criptomonedas y obtén un descuento especial en tu cuenta.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="border-pisao-gold/10 rounded-xl border p-6"
            >
              <h3 className="font-display text-pisao-gold text-xl">
                {f.title}
              </h3>
              <p className="text-pisao-cream-muted mt-2 text-sm">{f.body}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="bg-pisao-carbon-soft py-16">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-square overflow-hidden rounded-xl">
            <Image
              src="/promo/domicilios-hamburguesas.jpg"
              alt="Promoción de domicilios PISÁO: hamburguesas con 10% de descuento"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <p className="text-pisao-gold text-xs font-semibold tracking-[0.2em] uppercase">
              Pide a domicilio
            </p>
            <h2 className="font-display text-pisao-cream mt-2 text-3xl sm:text-4xl">
              Hamburguesas que saben a Caribe.
            </h2>
            <p className="text-pisao-cream-muted mt-4">
              Hechas con ingredientes reales, para momentos que sí valen.
            </p>

            <div className="border-pisao-gold/30 mt-6 inline-flex items-center gap-3 rounded-lg border px-4 py-3">
              <span className="font-display text-pisao-gold text-3xl">
                {siteConfig.delivery.descuentoDomicilios}
              </span>
              <span className="text-pisao-cream-muted text-sm">
                de descuento en domicilios
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                href={whatsappLink(
                  "Hola PISÁO, quiero hacer un pedido a domicilio.",
                )}
                variant="primary"
                target="_blank"
                rel="noreferrer"
              >
                Pedir por WhatsApp
              </Button>
              <Button href="/menu" variant="outline">
                Ver Menú
              </Button>
            </div>

            {siteConfig.delivery.rappi && (
              <p className="text-pisao-cream-muted mt-4 text-xs">
                También puedes pedirnos por Rappi.
              </p>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
