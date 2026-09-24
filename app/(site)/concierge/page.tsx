import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "PISÁO Concierge",
  description:
    "Plataforma de atención de PISÁO para WhatsApp Business, IA, handoff humano y operaciones.",
};

const capabilities = [
  {
    title: "WhatsApp Business",
    body: "Conexión autorizada con WhatsApp Business Platform para recibir y enviar mensajes de servicio.",
  },
  {
    title: "Asistente de IA",
    body: "Respuestas contextualizadas sobre menú, reservas, pedidos y experiencia PISÁO, con límites operativos y derivación humana.",
  },
  {
    title: "Handoff humano",
    body: "Cuando una persona del equipo interviene desde WhatsApp Business, el Concierge cede temporalmente la conversación para evitar respuestas dobles.",
  },
  {
    title: "Operación y seguridad",
    body: "Telemetría técnica, idempotencia de webhooks, cifrado de credenciales y controles de activación para minimizar errores y exposición de datos.",
  },
];

export default function ConciergePage() {
  return (
    <>
      <PageHero eyebrow="Tecnología de servicio" title="PISÁO Concierge" />
      <Container className="py-14 sm:py-20">
        <div className="max-w-4xl">
          <p className="max-w-3xl text-base leading-8 text-pisao-cream-muted">
            PISÁO Concierge es la capa de software que conecta los canales
            digitales de PISÁO con atención automatizada y humana. Su objetivo
            es facilitar preguntas, recomendaciones, reservas, seguimiento de
            pedidos y soporte sin reemplazar la supervisión del equipo.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-pisao-gold/15 bg-pisao-noche p-5"
              >
                <h2 className="font-display text-2xl text-pisao-gold">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-pisao-cream-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <section className="mt-10 rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft p-6">
            <h2 className="font-display text-2xl text-pisao-cream">
              Uso de datos y control
            </h2>
            <p className="mt-3 text-sm leading-7 text-pisao-cream-muted">
              Las conexiones empresariales requieren autorización explícita.
              Las credenciales de WhatsApp se almacenan cifradas; la consola
              operacional evita mostrar teléfonos y transcripciones; y las
              acciones sensibles conservan controles humanos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link
                href="/privacidad"
                className="text-pisao-gold underline-offset-4 hover:underline"
              >
                Política de privacidad
              </Link>
              <Link
                href="/eliminacion-datos"
                className="text-pisao-gold underline-offset-4 hover:underline"
              >
                Eliminación de datos
              </Link>
              <Link
                href="/legal"
                className="text-pisao-gold underline-offset-4 hover:underline"
              >
                Términos
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
