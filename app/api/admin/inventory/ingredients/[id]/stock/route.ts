import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { recomputeRecipeRiskForIngredient } from "@/lib/inventory/service";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";
import { recordAdminAudit } from "@/lib/admin/audit";

const TYPES = new Set(["CONTEO", "ENTRADA", "SALIDA", "MERMA", "AJUSTE"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user?.id || !["SUPER_ADMIN", "ADMIN"].includes(user.rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    tipo?: string;
    cantidad?: number;
    stockObjetivo?: number;
    motivo?: string;
  };
  const tipo = body.tipo ?? "CONTEO";

  if (!TYPES.has(tipo)) {
    return Response.json({ error: "Tipo de movimiento inválido." }, { status: 400 });
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const [ingredient] = await tx.$queryRaw<
        Array<{ id: string; stockActual: string }>
      >`
        SELECT "id", "stockActual"::text AS "stockActual"
        FROM "inventario_insumos"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!ingredient) throw new Error("INGREDIENT_NOT_FOUND");

      const previous = Number(ingredient.stockActual);
      let next = previous;

      if (tipo === "CONTEO" || tipo === "AJUSTE") {
        const target = Number(body.stockObjetivo);
        if (!Number.isFinite(target) || target < 0) {
          throw new Error("INVALID_STOCK");
        }
        next = target;
      } else {
        const amount = Number(body.cantidad);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("INVALID_AMOUNT");
        }
        next =
          tipo === "ENTRADA"
            ? previous + amount
            : previous - amount;
      }

      if (next < 0) throw new Error("NEGATIVE_STOCK");

      await tx.inventarioInsumo.update({
        where: { id },
        data: {
          stockActual: next,
          ultimaRevisionAt: new Date(),
        },
      });

      return tx.movimientoInventario.create({
        data: {
          insumoId: id,
          tipo: tipo as "CONTEO" | "ENTRADA" | "SALIDA" | "MERMA" | "AJUSTE",
          delta: next - previous,
          stockAnterior: previous,
          stockPosterior: next,
          motivo: body.motivo?.trim().slice(0, 180) || null,
          usuarioId: user.id!,
        },
      });
    });

    const affected = await recomputeRecipeRiskForIngredient(id);

    await recordAdminAudit({
      actorUserId: user.id,
      actorRole: user.rol ?? "UNKNOWN",
      action: "INVENTORY_STOCK_CHANGED",
      targetType: "InventarioInsumo",
      targetId: id,
      detail: {
        movementType: tipo,
        delta: Number(movement.delta),
        resultingStock: Number(movement.stockPosterior),
        affectedProducts: affected.length,
      },
    });

    void emitKevGovernanceEvent("pisao.inventory.stock_changed", {
      source: "inventory_v6",
      ingredient_ref: governanceRef(id),
      movement_type: tipo,
      delta: Number(movement.delta),
      resulting_stock: Number(movement.stockPosterior),
      affected_products: affected.length,
    });

    return Response.json({
      ok: true,
      stock: Number(movement.stockPosterior),
      affectedProducts: affected.length,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = {
      INGREDIENT_NOT_FOUND: "Insumo no encontrado.",
      INVALID_STOCK: "Conteo de stock inválido.",
      INVALID_AMOUNT: "Cantidad inválida.",
      NEGATIVE_STOCK: "El movimiento dejaría el stock en negativo.",
    };
    if (messages[code]) {
      return Response.json({ error: messages[code] }, { status: 400 });
    }
    console.error("[PISAO INVENTORY] stock movement", error);
    return Response.json(
      { error: "No fue posible registrar el movimiento." },
      { status: 500 },
    );
  }
}
