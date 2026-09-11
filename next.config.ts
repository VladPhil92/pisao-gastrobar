import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Build de producción autónomo (solo el código realmente usado, sin
  // depender del árbol completo de node_modules en runtime). Reduce
  // significativamente la memoria y el tamaño del proceso `next start`
  // en el servidor de 512MB de Render. Ver package.json ("postbuild"
  // y "start") para el paso de copiado de assets que requiere.
  output: "standalone",
  images: {
    // Las imágenes se pre-generan en build (scripts/optimize-images.mjs)
    // y este loader apunta directo a esos archivos estáticos, en vez de
    // optimizar bajo demanda.
    //
    // Por qué: en la instancia gratuita de Render el optimizador tardaba
    // 6-9s por variante AVIF (1-1.5s en WebP) y /menu pide ~38 imágenes
    // distintas. Como el disco es efímero y el servicio se suspende tras
    // 15 min de inactividad, la caché se borraba constantemente y casi
    // toda visita volvía a pagar ese costo. Sirviendo estáticos el costo
    // de CPU en runtime es ~0.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Anchos que Next pedirá al loader. Deben coincidir con WIDTHS en
    // scripts/optimize-images.mjs para que siempre exista el archivo.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
