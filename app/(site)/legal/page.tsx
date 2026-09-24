import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos de uso de los servicios digitales de PISÁO Gastrobar.",
};

export default function LegalPage() {
  return (
    <>
      <PageHero eyebrow="Información legal" title="Términos y condiciones" />
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl space-y-9 text-sm leading-7 text-pisao-cream-muted">
          <p>Última actualización: 24 de septiembre de 2026.</p>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">Uso del sitio</h2>
            <p className="mt-3">
              Este sitio permite consultar información de {siteConfig.name},
              realizar reservas, iniciar pedidos, acceder a canales de soporte
              y utilizar funciones de PISÁO Concierge. El usuario debe aportar
              información veraz cuando una operación lo requiera.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">Pedidos, reservas y pagos</h2>
            <p className="mt-3">
              La disponibilidad de productos, mesas y medios de pago puede
              cambiar. Una operación solo se considera confirmada cuando el
              sistema o el equipo de PISÁO muestra expresamente el estado
              correspondiente. Los comprobantes de pago pueden requerir
              validación humana antes de confirmar un pedido.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">PISÁO Concierge</h2>
            <p className="mt-3">
              El Concierge ayuda con información, recomendaciones y acciones
              soportadas por la plataforma. Algunas respuestas se generan con
              inteligencia artificial y pueden requerir confirmación humana.
              La IA no sustituye confirmaciones de pago, disponibilidad real ni
              decisiones que el sistema reserve al personal autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">Privacidad</h2>
            <p className="mt-3">
              El tratamiento de información se describe en la{" "}
              <Link href="/privacidad" className="text-pisao-gold hover:underline">
                Política de privacidad
              </Link>
              . Las instrucciones para solicitudes de eliminación están en{" "}
              <Link href="/eliminacion-datos" className="text-pisao-gold hover:underline">
                Eliminación de datos
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">Contacto</h2>
            <p className="mt-3">
              Para soporte o preguntas sobre estos términos escribe a{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-pisao-gold hover:underline">
                {siteConfig.contact.email}
              </a>
              .
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
