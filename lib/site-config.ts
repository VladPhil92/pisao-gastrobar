/**
 * Información de negocio centralizada. Ajustar aquí (no en componentes)
 * cuando cambien datos de contacto, redes o ubicación.
 */
export const siteConfig = {
  name: "PISÁO Gastrobar",
  shortName: "PISÁO",
  description:
    "Gastrobar contemporáneo de carácter caribeño y urbano en la Terraza Panorámica del C.C. Mall Plaza Cartagena.",
  url: "https://pisaogastrobar.com",
  location: {
    label: "Módulo TR4, Terraza Panorámica",
    address: "C.C. Mall Plaza Cartagena, Cartagena de Indias, Colombia",
    googleMapsUrl: "https://maps.google.com/?q=Mall+Plaza+Cartagena",
    googleMapsEmbedUrl:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ??
      "https://www.google.com/maps/embed?pb=PLACEHOLDER_EMBED_ID",
  },
  contact: {
    // formato E.164 sin '+'
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573246015877",
    email: "cerveceriacartagena@gmail.com",
    phone: "+57 324 601 5877",
  },
  social: {
    instagram: "https://instagram.com/pisaogastrobar",
    facebook: "https://facebook.com/pisaogastrobar",
    tiktok: "https://tiktok.com/@pisaogastrobar",
  },
  /** Alianza comercial a destacar en el sitio (footer / nosotros). */
  partner: {
    name: "Cervecería Cartagena S.A.S.",
    label: "En alianza con",
  },
  delivery: {
    descuentoDomicilios: "10%",
    rappi: true,
  },
  hours: [
    { dia: "Martes a jueves", horario: "5:00 p. m. – 12:00 a. m." },
    { dia: "Viernes y sábado", horario: "5:00 p. m. – 2:00 a. m." },
    { dia: "Domingo", horario: "4:00 p. m. – 11:00 p. m." },
  ],
  nav: [
    { href: "/nosotros", label: "Nosotros" },
    { href: "/menu", label: "Menú" },
    { href: "/reservas", label: "Reservas" },
    { href: "/eventos", label: "Eventos" },
    { href: "/cripto-beneficios", label: "Cripto Beneficios" },
    { href: "/galeria", label: "Galería" },
    { href: "/contacto", label: "Contacto" },
  ],
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${siteConfig.contact.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
