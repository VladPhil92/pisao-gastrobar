import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Eliminación de datos",
  description:
    "Instrucciones para solicitar eliminación de datos relacionados con PISÁO y Meta.",
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const safeCode =
    typeof code === "string" && /^[a-f0-9]{32}$/i.test(code) ? code : null;

  const request = safeCode
    ? await prisma.metaDataDeletionRequest.findUnique({
        where: { confirmationCode: safeCode },
        select: {
          confirmationCode: true,
          status: true,
          requestedAt: true,
          completedAt: true,
        },
      })
    : null;

  return (
    <>
      <PageHero eyebrow="Privacidad" title="Eliminación de datos" />
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl space-y-8 text-sm leading-7 text-pisao-cream-muted">
          {request ? (
            <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Solicitud registrada
              </p>
              <p className="mt-3 text-pisao-cream">
                Código de confirmación:{" "}
                <strong>{request.confirmationCode}</strong>
              </p>
              <p className="mt-2">
                Estado: completado. PISÁO no conserva el identificador personal
                de Facebook asociado a esta solicitud; únicamente mantiene una
                huella irreversible para auditoría de cumplimiento.
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">
              Cómo solicitar eliminación
            </h2>
            <p className="mt-3">
              Puedes solicitar la eliminación o revisión de información
              personal vinculada a los servicios digitales de PISÁO escribiendo
              a{" "}
              <a
                className="text-pisao-gold underline-offset-4 hover:underline"
                href={`mailto:${siteConfig.contact.email}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos%20PIS%C3%81O`}
              >
                {siteConfig.contact.email}
              </a>
              . Indica el correo o número de contacto utilizado en PISÁO y qué
              servicio deseas revisar: cuenta, pedido, reserva o WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">
              Solicitudes iniciadas desde Meta
            </h2>
            <p className="mt-3">
              Meta puede enviar a PISÁO una solicitud firmada de eliminación.
              El servidor valida criptográficamente la firma antes de
              procesarla. PISÁO no almacena en claro el identificador personal
              de Facebook recibido en ese proceso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">
              Qué puede conservarse
            </h2>
            <p className="mt-3">
              Cierta información puede mantenerse cuando sea necesaria para
              cumplir obligaciones legales, contables, antifraude o de
              seguridad. Cuando no sea necesario conservar información
              identificable, procuramos eliminarla, anonimizarla o mantener
              únicamente evidencia técnica irreversible.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-pisao-gold">
              Tiempo de respuesta
            </h2>
            <p className="mt-3">
              Confirmaremos la recepción de solicitudes directas y
              gestionaremos cada caso de acuerdo con la naturaleza de los datos
              y las obligaciones aplicables. Si necesitamos verificar tu
              identidad, te pediremos únicamente la información necesaria.
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
