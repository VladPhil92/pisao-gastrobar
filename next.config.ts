import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build de producción autónomo (solo el código realmente usado, sin
  // depender del árbol completo de node_modules en runtime). Reduce
  // significativamente la memoria y el tamaño del proceso `next start`
  // en el servidor de 512MB de Render. Ver package.json ("postbuild"
  // y "start") para el paso de copiado de assets que requiere.
  output: "standalone",
  images: {
    // AVIF primero (mejor compresión), WebP como respaldo. Next elige
    // automáticamente el mejor formato soportado por el navegador.
    formats: ["image/avif", "image/webp"],
    // Menos variantes de tamaño = menos transformaciones simultáneas de
    // sharp (y menos memoria por transformación) en la instancia de
    // 512MB. Ajustado a los anchos reales usados por los <Image> del
    // sitio (tarjetas de menú, galería, hero, banner promocional).
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256],
    // Las fotos del menú/galería son estáticas y cambian por nombre de
    // archivo (no por contenido), así que un caché largo es seguro y
    // evita reprocesar la misma imagen una y otra vez.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
