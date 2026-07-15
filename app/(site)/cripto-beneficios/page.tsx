import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { DESCUENTO_CRIPTO_PORCENTAJE } from "@/lib/payments/crypto";

export const metadata: Metadata = { title: "Cripto Beneficios" };

export default function CriptoBeneficiosPage() {
  return (
    <>
      <PageHero
        eyebrow="Paga distinto"
        title="Cripto Beneficios"
        description="En PISÁO premiamos a quienes pagan con criptomonedas."
      />
      <Container className="py-16">
        <div className="border-pisao-gold/20 bg-pisao-carbon-soft max-w-2xl rounded-xl border p-8">
          <p className="font-display text-pisao-gold text-3xl">
            {DESCUENTO_CRIPTO_PORCENTAJE}% de descuento
          </p>
          <p className="text-pisao-cream-muted mt-3">
            Al elegir pago en criptomonedas durante el checkout, el descuento se
            aplica automáticamente sobre el subtotal de tu pedido. La
            confirmación se realiza al detectar las confirmaciones on-chain de
            la transacción, y el hash queda asociado a tu pedido para
            trazabilidad.
          </p>
          <ul className="text-pisao-cream-muted mt-6 space-y-2 text-sm">
            <li>
              · Selecciona &quot;Criptomonedas&quot; como método de pago en el
              checkout.
            </li>
            <li>· Escanea la dirección/QR entregado por nuestro gateway.</li>
            <li>
              · Tu pedido se confirma automáticamente al validarse la
              transacción.
            </li>
          </ul>
          <Button href="/menu" variant="primary" className="mt-8">
            Ver Menú
          </Button>
        </div>
      </Container>
    </>
  );
}
