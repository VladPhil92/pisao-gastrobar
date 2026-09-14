import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, CreditCard, MapPin, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";
import { Reveal } from "@/components/visual/VisualMotion";

export const metadata: Metadata = {
  title: "Tu pedido | PISÁO",
  description:
    "Revisa visualmente tu pedido PISÁO, define entrega y completa el método de pago.",
};

const checkoutSteps = [
  { icon: CheckCircle2, number: "01", label: "Revisa tu mesa" },
  { icon: MapPin, number: "02", label: "Define entrega" },
  { icon: CreditCard, number: "03", label: "Completa el pago" },
];

export default function PedidosPage() {
  return (
    <>
      <section className="pisao-grain relative min-h-[64svh] overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image src="/gallery/cayeyeCostilla.jpg" alt="Cayeye con costilla de PISÁO Gastrobar" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.97)_0%,rgba(17,17,17,.82)_48%,rgba(17,17,17,.25)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,17,.95)_100%)]" />
        <div className="pisao-ambient-glow absolute right-[8%] top-[8%] size-[30rem] rounded-full bg-pisao-gold/14 blur-[105px]" />

        <Container className="relative grid min-h-[64svh] items-end gap-10 pb-14 pt-24 lg:grid-cols-[1fr_.85fr] lg:items-center lg:pb-16">
          <div className="max-w-3xl">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[.22em] uppercase">Cierre de compra</p>
            <h1 className="font-display mt-3 text-5xl leading-[.92] text-pisao-cream sm:text-7xl lg:text-[6.1rem]">
              Tu mesa ya existe.
              <span className="block text-pisao-gold">Ahora ciérrala sin perderla de vista.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-pisao-cream sm:text-lg">La compra mantiene continuidad visual: lo que elegiste sigue presente mientras defines cómo recibirlo y cómo pagar.</p>
          </div>

          <div className="relative hidden min-h-[430px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-0 top-[2%] h-[72%] w-[68%] overflow-hidden rounded-[2.5rem] border border-pisao-gold/20 shadow-2xl">
              <Image src="/gallery/patacon_callejero.jpg" alt="Patacón Callejero de PISÁO" fill sizes="34vw" className="object-cover" />
            </div>
            <div className="pisao-float-slower pisao-image-lift absolute bottom-0 left-[5%] h-[46%] w-[47%] overflow-hidden rounded-[2rem] border-4 border-pisao-carbon shadow-2xl">
              <Image src="/gallery/terraza-cervezas.jpg" alt="Cervezas artesanales PISÁO" fill sizes="24vw" className="object-cover" />
            </div>
            <div className="absolute bottom-[5%] right-[2%] rounded-2xl border border-pisao-gold/25 bg-pisao-carbon/88 p-4 backdrop-blur-xl">
              <ShoppingBag className="size-4 text-pisao-gold" />
              <p className="font-display mt-2 max-w-[190px] text-xl leading-tight text-pisao-cream">Del antojo al pedido, sin romper la experiencia.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-pisao-gold/10 bg-pisao-noche py-6">
        <Container className="grid gap-2 sm:grid-cols-3">
          {checkoutSteps.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.number} delay={index * 80}>
                <div className="flex items-center gap-3 rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/45 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-pisao-gold/10 text-pisao-gold"><Icon className="size-4" /></span>
                  <div>
                    <p className="text-[8px] font-bold tracking-[.18em] text-pisao-gold uppercase">Paso {item.number}</p>
                    <p className="mt-0.5 text-xs font-semibold text-pisao-cream">{item.label}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </Container>
      </section>

      <section className="relative overflow-hidden py-10 sm:py-14 lg:py-18">
        <div className="pisao-ambient-glow absolute -left-40 top-32 size-[32rem] rounded-full bg-pisao-gold/7 blur-[120px]" />
        <Container className="relative">
          <Reveal>
            <CheckoutWizard />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
