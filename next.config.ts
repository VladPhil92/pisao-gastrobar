import type { NextConfig } from "next";

const releaseSha =
  process.env.RENDER_GIT_COMMIT?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  "unknown";

const securityHeaders = [
  { key: "X-PISAO-Release", value: releaseSha },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Content-Security-Policy",
    value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  },
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
  deploymentId: releaseSha === "unknown" ? undefined : releaseSha,
  // TypeScript ya es un gate obligatorio en GitHub CI (npx tsc --noEmit).
  // En Render evitamos repetir ese chequeo dentro de next build porque la
  // instancia de build de 512 MB agotó el heap al duplicar el typecheck.
  // El flag solo se habilita explícitamente en Render; CI sigue validando tipos.
  typescript: {
    ignoreBuildErrors: process.env.RENDER_SKIP_NEXT_TYPECHECK === "true",
  },

  // Render usa el bundle standalone para ejecutar la app con una huella
  // reducida. Vercel 16.3+ inyecta su build adapter y actualmente no
  // emite next-server.js.nft.json cuando `output: standalone` está activo;
  // por eso dejamos que Vercel use su output nativo y conservamos
  // standalone para despliegues fuera de Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
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
