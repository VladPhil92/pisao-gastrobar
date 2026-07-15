import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { ReservaForm } from "./ReservaForm";

export const metadata: Metadata = { title: "Reservas" };

export default function ReservasPage() {
  return (
    <>
      <PageHero
        eyebrow="Aparta tu mesa"
        title="Reservas"
        description="Cuéntanos fecha, hora y número de personas. Confirmamos automáticamente."
      />
      <Container className="py-16">
        <ReservaForm />
      </Container>
    </>
  );
}
