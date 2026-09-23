import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

type Body = {
  costoUnitario?: number | null;
  disponible?: boolean;
  inventarioBajo?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || user?.rol !== "ADMIN") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Body;

  if (
    body.costoUnitario !== undefined &&
    body.costoUnitario !== null &&
    (!Number.isFinite(body.costoUnitario) ||
      body.costoUnitario < 0 ||
      body.costoUnitario > 100_000_000)
  ) {
    return Response.json({ error: "Costo inválido." }, { status: 400 });
  }

  if (
    body.disponible === undefined &&
    body.inventarioBajo === undefined &&
    body.costoUnitario === undefined
  ) {
    return Response.json({ error: "Sin cambios." }, { status: 400 });
  }

  const current = await prisma.producto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      precio: true,
      costoUnitario: true,
      disponible: true,
      inventarioBajo: true,
    },
  });

  if (!current) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  const nextDisponible = body.disponible ?? current.disponible;
  const data = {
    ...(body.costoUnitario !== undefined
      ? {
          costoUnitario: body.costoUnitario,
          costoActualizadoAt: new Date(),
        }
      : {}),
    ...(body.disponible !== undefined
      ? { disponible: body.disponible }
      : {}),
    ...(body.inventarioBajo !== undefined
      ? { inventarioBajo: body.inventarioBajo }
      : {}),
    ...(!nextDisponible ? { inventarioBajo: false } : {}),
  };

  const updated = await prisma.producto.update({
    where: { id },
    data,
    select: {
      id: true,
      nombre: true,
      precio: true,
      costoUnitario: true,
      costoActualizadoAt: true,
      disponible: true,
      inventarioBajo: true,
    },
  });

  const price = Number(updated.precio);
  const cost =
    updated.costoUnitario === null ? null : Number(updated.costoUnitario);
  const marginPct =
    cost === null || price <= 0 ? null : ((price - cost) / price) * 100;

  void emitKevGovernanceEvent("pisao.catalog.economics_updated", {
    source: "admin_product_economics",
    product_ref: governanceRef(updated.id),
    available: updated.disponible,
    low_inventory: updated.inventarioBajo,
    cost_configured: cost !== null,
    contribution_margin_pct:
      marginPct === null ? null : Number(marginPct.toFixed(2)),
  });

  return Response.json({
    ok: true,
    product: {
      ...updated,
      precio: price,
      costoUnitario: cost,
      contributionMarginPct:
        marginPct === null ? null : Number(marginPct.toFixed(2)),
    },
  });
}
