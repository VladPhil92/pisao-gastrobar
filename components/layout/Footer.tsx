import Link from "next/link";
import Image from "next/image";
import { MapPin, MessageCircle, Mail } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { InstagramIcon, FacebookIcon } from "@/components/ui/SocialIcons";
import { siteConfig, whatsappLink } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-pisao-gold/15 bg-pisao-carbon-soft border-t">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/brand/pisao-logo.png"
            alt={siteConfig.name}
            width={220}
            height={200}
            className="h-24 w-auto"
          />
          <p className="text-pisao-cream-muted mt-3 text-sm">
            {siteConfig.description}
          </p>
          <div className="mt-4 flex gap-4">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon className="text-pisao-cream-muted hover:text-pisao-gold h-5 w-5 transition-colors" />
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <FacebookIcon className="text-pisao-cream-muted hover:text-pisao-gold h-5 w-5 transition-colors" />
            </a>
          </div>
        </div>

        <div>
          <p className="text-pisao-cream text-sm font-semibold">Explorar</p>
          <ul className="mt-3 space-y-2">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-pisao-cream-muted hover:text-pisao-gold text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-pisao-cream text-sm font-semibold">Ubicación</p>
          <div className="text-pisao-cream-muted mt-3 flex items-start gap-2 text-sm">
            <MapPin className="text-pisao-gold mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {siteConfig.location.label}
              <br />
              {siteConfig.location.address}
            </span>
          </div>
          <div className="text-pisao-cream-muted mt-3 space-y-2 text-sm">
            {siteConfig.hours.map((h) => (
              <p key={h.dia}>
                {h.dia}: {h.horario}
              </p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-pisao-cream text-sm font-semibold">Contacto</p>
          <div className="text-pisao-cream-muted mt-3 space-y-2 text-sm">
            <a
              href={whatsappLink("Hola PISÁO, quiero hacer un pedido.")}
              target="_blank"
              rel="noreferrer"
              className="hover:text-pisao-gold flex items-center gap-2"
            >
              <MessageCircle className="text-pisao-gold h-4 w-4" />{" "}
              {siteConfig.contact.phone}
            </a>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="hover:text-pisao-gold flex items-center gap-2"
            >
              <Mail className="text-pisao-gold h-4 w-4" />{" "}
              {siteConfig.contact.email}
            </a>
          </div>
          <div className="text-pisao-cream-muted/80 mt-4 flex gap-4 text-xs">
            <Link href="/legal" className="hover:text-pisao-gold">
              Términos y privacidad
            </Link>
          </div>
        </div>
      </Container>

      <div className="border-pisao-gold/10 text-pisao-cream-muted/70 space-y-1 border-t py-4 text-center text-xs">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos
          reservados.
        </p>
        <p>
          {siteConfig.partner.label}{" "}
          <span className="text-pisao-cream-muted">
            {siteConfig.partner.name}
          </span>
        </p>
      </div>
    </footer>
  );
}
