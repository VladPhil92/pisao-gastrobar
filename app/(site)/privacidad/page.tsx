import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo PISÁO Gastrobar trata datos personales, datos de pedidos, reservas, WhatsApp y PISÁO Concierge.",
};

const sections = [
  {
    title: "1. Responsable y alcance",
    body: (
      <>
        <p>
          Esta política describe el tratamiento de información realizado a
          través de {siteConfig.name}, su sitio web, sus cuentas de cliente,
          pedidos, reservas, canales de atención y PISÁO Concierge.
        </p>
        <p className="mt-3">
          Para consultas de privacidad puedes escribir a{" "}
          <a
            className="text-pisao-gold underline-offset-4 hover:underline"
            href={`mailto:${siteConfig.contact.email}`}
          >
            {siteConfig.contact.email}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    title: "2. Datos que podemos tratar",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Datos de cuenta: nombre, correo, teléfono y credenciales protegidas
          cuando una persona crea un perfil.
        </li>
        <li>
          Datos transaccionales: pedidos, reservas, dirección de entrega,
          estado de pago y comprobantes que el usuario decide cargar.
        </li>
        <li>
          WhatsApp Business: contenido necesario para atender una conversación
          mientras se procesa, identificadores técnicos y metadatos mínimos de
          entrega. La consola operacional no almacena transcripciones ni
          teléfonos de clientes.
        </li>
        <li>
          PISÁO Concierge: señales anónimas de preferencia, estado operativo,
          intención, uso de herramientas y telemetría de calidad. No se
          conserva el transcript completo como memoria persistente.
        </li>
        <li>
          Analítica first-party: identificadores efímeros de sesión, páginas
          visitadas y eventos de producto sin texto libre.
        </li>
      </ul>
    ),
  },
  {
    title: "3. Para qué usamos la información",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Procesar pedidos, pagos, reservas y solicitudes de soporte.</li>
        <li>
          Operar WhatsApp Business y PISÁO Concierge, incluyendo respuestas
          automatizadas y transferencia a atención humana.
        </li>
        <li>
          Proteger la seguridad del servicio, prevenir duplicados y mantener
          trazabilidad técnica.
        </li>
        <li>
          Medir calidad, disponibilidad y desempeño del servicio con
          telemetría limitada.
        </li>
        <li>
          Cumplir obligaciones legales y responder solicitudes de titulares.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Proveedores y transferencias",
    body: (
      <p>
        Para prestar el servicio podemos utilizar proveedores de
        infraestructura, procesamiento de pagos, mensajería, inteligencia
        artificial y observabilidad. Cuando una conversación usa WhatsApp,
        también intervienen los servicios de Meta/WhatsApp. Estos proveedores
        reciben únicamente la información necesaria para la función que
        prestan y están sujetos a sus propios términos y medidas de seguridad.
      </p>
    ),
  },
  {
    title: "5. Inteligencia artificial",
    body: (
      <p>
        PISÁO Concierge puede enviar el contenido necesario de una conversación
        a un proveedor de modelos de IA para generar una respuesta. PISÁO
        aplica controles para limitar datos innecesarios, no usa esa función
        para tomar decisiones legales o financieras sobre las personas y
        mantiene posibilidad de atención humana.
      </p>
    ),
  },
  {
    title: "6. Conservación",
    body: (
      <p>
        Conservamos la información durante el tiempo razonablemente necesario
        para prestar el servicio, resolver disputas, cumplir obligaciones
        contables o legales y mantener seguridad. Los identificadores técnicos
        y la telemetría se diseñan para minimizar información personal.
      </p>
    ),
  },
  {
    title: "7. Derechos y eliminación",
    body: (
      <p>
        Puedes solicitar consulta, actualización, corrección o eliminación de
        tus datos cuando corresponda. Para instrucciones y seguimiento de
        solicitudes relacionadas con Meta, consulta{" "}
        <Link
          className="text-pisao-gold underline-offset-4 hover:underline"
          href="/eliminacion-datos"
        >
          Eliminación de datos
        </Link>
        .
      </p>
    ),
  },
  {
    title: "8. Cookies e identificadores técnicos",
    body: (
      <p>
        El sitio puede utilizar cookies e identificadores técnicos necesarios
        para autenticación, seguridad, continuidad de sesión y analítica
        first-party. No utilizamos estos identificadores para vender datos
        personales a terceros.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacidad" title="Política de privacidad" />
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl space-y-10 text-sm leading-7 text-pisao-cream-muted">
          <p>
            Última actualización: 24 de septiembre de 2026. Esta política se
            aplica al ecosistema digital de PISÁO y complementa los términos
            publicados en este sitio.
          </p>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-pisao-gold">
                {section.title}
              </h2>
              <div className="mt-3">{section.body}</div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
