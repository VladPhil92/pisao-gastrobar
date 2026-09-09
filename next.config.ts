import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
