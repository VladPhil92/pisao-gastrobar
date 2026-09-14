import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const socialProfiles = Object.values(siteConfig.social);

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Cocina caribeña en Cartagena`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description:
    "Patacones, cayeye, burgers, cerveza artesanal y cocina caribeña contemporánea en la Terraza Panorámica de Mall Plaza Cartagena. Consulta el menú, pide o reserva.",
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "PISÁO Gastrobar",
    "gastrobar Cartagena",
    "restaurante Cartagena",
    "patacón Cartagena",
    "cayeye Cartagena",
    "comida caribeña Cartagena",
    "Mall Plaza Cartagena",
    "Terraza Panorámica Cartagena",
  ],
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "PISÁO Gastrobar | El Caribe se muerde",
    description:
      "Cocina caribeña contemporánea, patacones, cayeye, burgers y cerveza en la Terraza Panorámica de Mall Plaza Cartagena.",
    images: [
      {
        url: "/gallery/patacon_callejero.jpg",
        alt: "Patacón insignia de PISÁO Gastrobar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PISÁO Gastrobar | El Caribe se muerde",
    description:
      "Cocina caribeña contemporánea en la Terraza Panorámica de Mall Plaza Cartagena.",
    images: ["/gallery/patacon_callejero.jpg"],
  },
  icons: {
    icon: "/brand/pisao-mark.png",
    apple: "/brand/pisao-mark.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${siteConfig.url}/#restaurant`,
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  image: [
    `${siteConfig.url}/gallery/patacon_callejero.jpg`,
    `${siteConfig.url}/gallery/cayeyeCostilla.jpg`,
    `${siteConfig.url}/gallery/laguna_azul_burger.jpg`,
  ],
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  servesCuisine: ["Caribeña", "Colombiana", "Contemporánea"],
  menu: `${siteConfig.url}/menu`,
  acceptsReservations: `${siteConfig.url}/reservas`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Módulo TR4, Terraza Panorámica, C.C. Mall Plaza Cartagena",
    addressLocality: "Cartagena de Indias",
    addressRegion: "Bolívar",
    addressCountry: "CO",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "16:00",
      closes: "22:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Friday", "Saturday", "Sunday"],
      opens: "14:00",
      closes: "22:00",
    },
  ],
  sameAs: socialProfiles,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="bg-pisao-carbon text-pisao-cream flex min-h-full flex-col">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(restaurantSchema).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
