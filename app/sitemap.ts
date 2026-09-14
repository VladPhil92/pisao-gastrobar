import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

const routes = [
  "",
  "/menu",
  "/reservas",
  "/eventos",
  "/galeria",
  "/nosotros",
  "/contacto",
  "/cripto-beneficios",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency:
      route === "/menu" || route === "/eventos" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/menu" ? 0.95 : 0.75,
  }));
}
