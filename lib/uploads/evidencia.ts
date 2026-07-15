import { randomUUID } from "crypto";

/**
 * Sube el comprobante de pago (imagen/PDF) a almacenamiento persistente.
 *
 * IMPORTANTE: el filesystem de Vercel es efímero/solo-lectura en
 * producción. Esta función debe reemplazarse por una subida real a un
 * bucket (Supabase Storage, S3, Cloudinary...) usando las credenciales
 * en `UPLOADS_*` de `.env`. Se deja aquí como único punto de entrada
 * para que ese cambio no afecte a las rutas de API que la consumen.
 */
export async function subirComprobantePago(file: File): Promise<string> {
  const extension = file.name.split(".").pop() ?? "bin";
  const key = `comprobantes/${randomUUID()}.${extension}`;

  // TODO: reemplazar por la subida real, ej.:
  // const { url } = await storageClient.upload(key, await file.arrayBuffer());
  // return url;

  return `${process.env.UPLOADS_BASE_URL ?? "https://placeholder-bucket.example.com"}/${key}`;
}
