import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { CheckoutWizard } from "@/components/checkout/CheckoutWizard";

export const metadata: Metadata = { title: "Tu pedido" };

export default function PedidosPage() {
  return (
    <>
      <PageHero eyebrow="Checkout" title="Completa tu pedido" />
      <Container className="py-12">
        <CheckoutWizard />
      </Container>
    </>
  );
}
