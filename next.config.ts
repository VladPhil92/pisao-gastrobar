import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF primero (mejor compresión), WebP como respaldo. Next elige
    // automáticamente el mejor formato soportado por el navegador.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
