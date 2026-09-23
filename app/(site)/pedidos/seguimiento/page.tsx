import type { Metadata } from "next";
import { Activity, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/visual/VisualMotion";
import { OrderTrackingClient } from "@/components/orders/OrderTrackingClient";

export const metadata: Metadata = {
  title: "Seguimiento de pedido | PISÁO",
  description:
    "Consulta de forma privada el estado de pago, validación y preparación de tu pedido PISÁO.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SeguimientoPedidoPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche pt-28 pb-10 sm:pt-32 sm:pb-14">
        <div className="pisao-ambient-glow absolute -right-36 top-0 size-[30rem] rounded-full bg-pisao-gold/10 blur-[120px]" />
        <Container className="relative">
          <Reveal>
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-pisao-gold">
                <Activity className="size-4" />
                <p className="text-[10px] font-semibold tracking-[.22em] uppercase">
                  Estado operativo del pedido
                </p>
              </div>
              <h1 className="font-display mt-4 text-5xl leading-[.95] text-pisao-cream sm:text-6xl">
                Sigue tu pedido
                <span className="block text-pisao-gold">sin depender del chat.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base">
                PISÁO consulta directamente el estado registrado por pagos,
                blockchain y operación. Los cambios aparecen aquí de forma
                automática mientras la página esté abierta.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-pisao-gold/15 bg-pisao-carbon/60 px-3 py-2 text-xs text-pisao-cream-muted">
                <ShieldCheck className="size-3.5 text-pisao-gold" />
                El acceso es privado y no muestra tus datos personales.
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="relative overflow-hidden py-10 sm:py-14 lg:py-16">
        <div className="pisao-ambient-glow absolute -left-40 top-20 size-[32rem] rounded-full bg-pisao-gold/6 blur-[120px]" />
        <Container className="relative">
          <Reveal>
            <OrderTrackingClient />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
