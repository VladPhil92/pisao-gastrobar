/**
 * Pre-genera variantes WebP de todas las imagenes estaticas de /public.
 *
 * Motivo: el optimizador de Next.js codifica bajo demanda, en el primer
 * request de cada variante. En la instancia gratuita de Render (CPU muy
 * limitada, 1 worker) eso costaba entre 1s y 9s por imagen, y paginas
 * como /menu piden ~38 imagenes distintas. Peor aun: el sistema de
 * archivos de Render es efimero y el servicio se suspende tras 15 min de
 * inactividad, asi que la cache en disco de Next se borra constantemente
 * y casi todas las visitas volvian a pagar ese costo.
 *
 * Con este script las variantes se generan UNA vez, en build, y en runtime
 * solo se sirven archivos estaticos (CPU ~0, inmune al borrado de cache).
 * Ver lib/image-loader.ts, que resuelve cada src+width al archivo generado.
 */
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PUBLIC_DIR = "public";
/** Carpetas de /public que contienen imagenes servidas por next/image. */
const SOURCE_DIRS = ["gallery", "brand", "promo", "QR"];
/** Salida de las variantes generadas (ignorada por git, se recrea en build). */
const OUT_DIR = path.join(PUBLIC_DIR, "_img");
const MANIFEST_PATH = path.join("lib", "generated", "image-manifest.ts");

/**
 * Anchos a generar. Debe coincidir con deviceSizes + imageSizes de
 * next.config.ts, que son los anchos que Next pedira al loader.
 */
const WIDTHS = [128, 256, 384, 640, 828, 1200, 1920];
const WEBP_QUALITY = 80;

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function collectImages() {
  const found = [];
  for (const dir of SOURCE_DIRS) {
    const abs = path.join(PUBLIC_DIR, dir);
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      continue; // carpeta opcional
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!SUPPORTED.has(path.extname(entry.name).toLowerCase())) continue;
      found.push(path.join(abs, entry.name));
    }
  }
  return found.sort();
}

async function main() {
  const files = await collectImages();
  if (files.length === 0) {
    console.warn("optimize-images: no se encontraron imagenes.");
  }

  const manifest = {};
  let generated = 0;
  let reused = 0;
  let bytesOut = 0;

  for (const file of files) {
    const meta = await sharp(file).metadata();
    if (!meta.width) {
      console.warn("optimize-images: sin ancho legible, se omite " + file);
      continue;
    }

    // Ruta publica original, ej. /gallery/agua.jpg
    const publicPath =
      "/" + path.relative(PUBLIC_DIR, file).split(path.sep).join("/");
    const relNoExt = publicPath.replace(/\.[^./]+$/, "");
    const outSubdir = path.join(OUT_DIR, path.dirname(relNoExt));
    await mkdir(outSubdir, { recursive: true });

    // Nunca escalamos hacia arriba: cada ancho se limita al ancho real.
    // Varios anchos del ladder pueden colapsar al mismo tamano real, asi
    // que deduplicamos para no generar archivos identicos.
    const actualWidths = [
      ...new Set(WIDTHS.map((w) => Math.min(w, meta.width))),
    ].sort((a, b) => a - b);

    for (const width of actualWidths) {
      const outPath = path.join(OUT_DIR, relNoExt + "-" + width + ".webp");
      let needsWrite = true;
      try {
        // Si ya existe y es mas nuevo que el original, se reutiliza. Hace
        // que re-ejecutar el script sea barato en desarrollo.
        const [srcStat, outStat] = await Promise.all([
          stat(file),
          stat(outPath),
        ]);
        if (outStat.mtimeMs >= srcStat.mtimeMs) needsWrite = false;
      } catch {
        // no existe todavia
      }

      if (needsWrite) {
        await sharp(file)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY, effort: 4 })
          .toFile(outPath);
        generated++;
      } else {
        reused++;
      }
      bytesOut += (await stat(outPath)).size;
    }

    manifest[publicPath] = actualWidths;
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  const banner =
    "// Archivo generado por scripts/optimize-images.mjs - NO editar a mano.\n";
  await writeFile(
    MANIFEST_PATH,
    banner +
      "export const imageManifest: Record<string, number[]> = " +
      JSON.stringify(manifest, null, 2) +
      ";\n",
    "utf8",
  );

  console.log(
    "optimize-images: " +
      files.length +
      " imagenes - " +
      generated +
      " variantes generadas - " +
      reused +
      " reutilizadas - " +
      (bytesOut / 1024 / 1024).toFixed(1) +
      "MB en " +
      OUT_DIR,
  );
}

main().catch((error) => {
  console.error("optimize-images fallo:", error);
  process.exit(1);
});
