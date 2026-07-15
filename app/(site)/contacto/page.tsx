import type { Metadata } from "next";
import { MapPin, MessageCircle, Mail } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Container";
import { InstagramIcon } from "@/components/ui/SocialIcons";
import { siteConfig, whatsappLink } from "@/lib/site-config";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <>
      <PageHero eyebrow="Escríbenos" title="Contacto" />
      <Container className="grid gap-10 py-16 lg:grid-cols-2">
        <div className="text-pisao-cream-muted space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="text-pisao-gold mt-0.5 h-5 w-5 shrink-0" />
            <span>
              {siteConfig.location.label}
              <br />
              {siteConfig.location.address}
            </span>
          </div>
          <a
            href={whatsappLink("Hola PISÁO, quiero hacer una consulta.")}
            target="_blank"
            rel="noreferrer"
            className="hover:text-pisao-gold flex items-center gap-2"
          >
            <MessageCircle className="text-pisao-gold h-5 w-5 shrink-0" />
            {siteConfig.contact.phone}
          </a>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="hover:text-pisao-gold flex items-center gap-2"
          >
            <Mail className="text-pisao-gold h-5 w-5 shrink-0" />
            {siteConfig.contact.email}
          </a>
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noreferrer"
            className="hover:text-pisao-gold flex items-center gap-2"
          >
            <InstagramIcon className="text-pisao-gold h-5 w-5 shrink-0" />
            @pisaogastrobar
          </a>
        </div>
        <div className="bg-pisao-carbon-soft aspect-video overflow-hidden rounded-xl">
          <iframe
            title="Ubicación PISÁO Gastrobar"
            src={siteConfig.location.googleMapsEmbedUrl}
            className="h-full w-full border-0"
            loading="lazy"
          />
        </div>
      </Container>
    </>
  );
}
