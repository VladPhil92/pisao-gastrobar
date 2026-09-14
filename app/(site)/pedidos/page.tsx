import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, CreditCard, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";

export const metadata: Metadata = {
  title: "Tu pedido | PISÁO",
  description:
    "Revisa visualmente tu pedido PISÁO, define entrega y completa el método de pago.",
};

export default function PedidosPage() {
  return (
    <>
      <section className="border-pisao-gold/10 bg-pisao-noche relative overflow-hidden border-b">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
          <Image
            src="/gallery/cayeyeCostilla.jpg"
            alt="Cayeye con costilla de PISÁO Gastrobar"
            fill
            priority
            sizes="46vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,1)_0%,rgba(17,17,17,.68)_30%,rgba(17,17,17,.18)_100%)]" />
        </div>

        <Container className="relative py-14 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">
              Cierre de compra
            </p>
            <h1 className="font-display text-pisao-cream mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Tu mesa ya está armada.
              <span className="text-pisao-gold block">Solo falta cerrarla.</span>
            </h1>
            <p className="text-pisao-cream-muted mt-5 max-w-xl text-sm leading-relaxed sm:text-base">
              Revisa lo que elegiste, define cómo recibirlo y continúa con el método de pago disponible. La composición visual permanece contigo durante todo el proceso.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                { icon: CheckCircle2, label: "Revisión visual" },
                { icon: MapPin, label: "Entrega o recogida" },
                { icon: CreditCard, label: "Pago paso a paso" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="border-pisao-gold/15 bg-pisao-carbon/55 text-pisao-cream-muted inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs backdrop-blur"
                  >
                    <Icon className="text-pisao-gold size-3.5" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10 sm:py-14 lg:py-16">
        <CheckoutWizard />
      </Container>
    </>
  );
}
