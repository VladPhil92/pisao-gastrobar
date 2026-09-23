import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["ADMIN", "CAJERO"].includes(role ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const pago = await prisma.pago.findUnique({
    where: { pedidoId: id },
    select: {
      comprobanteBytes: true,
      comprobanteMime: true,
      comprobanteNombre: true,
    },
  });

  if (!pago?.comprobanteBytes) {
    return Response.json({ error: "Comprobante no encontrado." }, { status: 404 });
  }

  const fileName = pago.comprobanteNombre || `comprobante-${id}`;
  const encodedName = encodeURIComponent(fileName);

  return new Response(Buffer.from(pago.comprobanteBytes), {
    status: 200,
    headers: {
      "Content-Type": pago.comprobanteMime || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
