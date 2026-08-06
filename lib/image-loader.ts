import { imageManifest } from "@/lib/generated/image-manifest";

/**
 * Loader personalizado de next/image.
 *
 * En lugar de pedirle a Next que optimice cada imagen bajo demanda
 * (costoso en la instancia gratuita de Render: 1-9s de CPU por variante,
 * y la cache en disco se pierde en cada suspension del servicio), este
 * loader apunta a las variantes WebP que scripts/optimize-images.mjs ya
 * genero en build dentro de /public/_img.
 *
 * Si una imagen no esta en el manifest (p. ej. un SVG, o una ruta nueva
 * que aun no se ha pre-generado) se devuelve el src original sin tocar,
 * de modo que nunca se rompe: en el peor caso se sirve el archivo tal cual.
 */
export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const available = imageManifest[src];
  if (!available || available.length === 0) return src;

  // El ancho mas pequeno que aun cubre lo solicitado; si se pide mas que
  // el maximo disponible (imagen de origen pequena) se usa el mayor.
  const chosen = available.find((w) => w >= width) ?? available[available.length - 1];

  const base = src.replace(/\.[^./]+$/, "");
  return `/_img${base}-${chosen}.webp`;
}
