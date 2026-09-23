import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservaSchema } from "@/lib/reservas/schema";
import {
  createConfirmedReservation,
  reservationAlternatives,
  ReservationConflictError,
} from "@/lib/reservas/create-reservation";
import {
  claimTransactionCommand,
  completeTransactionCommand,
} from "@/lib/ai/transaction-command-bus";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { captureServerError } from "@/lib/observability/sentry-transport";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";

type CartCommitPayload = {
  proposalId?: unknown;
  items?: unknown;
};

function parseCartPayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const payload = value as CartCommitPayload;
  if (!Array.isArray(payload.items)) return null;

  const items = payload.items
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as { productId?: unknown; quantity?: unknown };
      if (
        typeof item.productId !== "string" ||
        typeof item.quantity !== "number" ||
        !Number.isFinite(item.quantity)
      ) {
        return null;
      }
      return {
        productId: item.productId,
        quantity: Math.min(20, Math.max(1, Math.round(item.quantity))),
      };
    })
    .filter(
      (item): item is { productId: string; quantity: number } => Boolean(item),
    )
    .slice(0, 24);

  if (!items.length) return null;

  return {
    proposalId:
      typeof payload.proposalId === "string"
        ? payload.proposalId.slice(0, 240)
        : "concierge-command",
    items,
  };
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `concierge-command:${identity}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de confirmación." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const body = (await request.json()) as {
    commandId?: unknown;
    confirmationToken?: unknown;
    sessionKey?: unknown;
  };

  const security = await verifyTurnstile({
    token: request.headers.get("x-turnstile-token"),
    remoteIp: identity,
    expectedAction: "concierge_command",
  });

  if (!security.ok) {
    return NextResponse.json(
      {
        error: "No pudimos validar la verificación de seguridad. Intenta nuevamente.",
        code: security.code,
      },
      { status: 403 },
    );
  }

  const claimed = await claimTransactionCommand({
    commandId: body.commandId,
    confirmationToken: body.confirmationToken,
    sessionKey: body.sessionKey,
  });

  if (!claimed.ok) {
    return NextResponse.json(
      {
        error: "El comando ya no puede ejecutarse.",
        code: claimed.code,
      },
      {
        status:
          claimed.code === "COMMAND_NOT_FOUND"
            ? 404
            : claimed.code === "ALREADY_EXECUTED"
              ? 409
              : 400,
      },
    );
  }

  const { command } = claimed;

  try {
    if (command.type === "cart.commit") {
      const payload = parseCartPayload(command.payload);

      if (!payload) {
        await completeTransactionCommand({
          commandId: command.id,
          success: false,
          failureCode: "INVALID_CART_PAYLOAD",
        });
        return NextResponse.json(
          { error: "La propuesta ya no es válida.", code: "INVALID_CART_PAYLOAD" },
          { status: 400 },
        );
      }

      const ids = [...new Set(payload.items.map((item) => item.productId))];
      const products = await prisma.producto.findMany({
        where: {
          id: { in: ids },
          disponible: true,
          categoria: { activa: true },
        },
        include: {
          categoria: {
            select: { slug: true },
          },
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      const cartItems = payload.items.flatMap((entry) => {
        const product = productMap.get(entry.productId);
        if (!product) return [];

        return [
          {
            productoId: product.id,
            nombre: product.nombre,
            slug: product.slug,
            precio: Number(product.precio),
            imagenUrl: product.imagenUrl,
            categoriaSlug: product.categoria.slug,
            cantidad: entry.quantity,
          },
        ];
      });

      if (cartItems.length !== payload.items.length) {
        await completeTransactionCommand({
          commandId: command.id,
          success: false,
          failureCode: "CATALOG_CHANGED",
        });

        return NextResponse.json(
          {
            error:
              "La carta cambió desde que armamos la propuesta. Pídeme actualizar la mesa antes de continuar.",
            code: "CATALOG_CHANGED",
          },
          { status: 409 },
        );
      }

      const total = cartItems.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0,
      );

      await completeTransactionCommand({
        commandId: command.id,
        success: true,
      });

      void emitKevGovernanceEvent("pisao.concierge.command_executed", {
        source: "transaction_command_bus",
        command: "cart.commit",
        item_count: cartItems.reduce((sum, item) => sum + item.cantidad, 0),
        total,
      });

      return NextResponse.json({
        command: {
          id: command.id,
          type: command.type,
          status: "EXECUTED",
        },
        cart: {
          proposalId: payload.proposalId,
          total,
          items: cartItems,
        },
      });
    }

    if (command.type === "reservation.commit") {
      const parsed = reservaSchema.safeParse(command.payload);

      if (!parsed.success) {
        await completeTransactionCommand({
          commandId: command.id,
          success: false,
          failureCode: "INVALID_RESERVATION_PAYLOAD",
        });
        return NextResponse.json(
          {
            error: "Los datos de la reserva ya no son válidos.",
            code: "INVALID_RESERVATION_PAYLOAD",
          },
          { status: 400 },
        );
      }

      try {
        const reserva = await createConfirmedReservation(
          parsed.data,
          "concierge_command_bus",
        );

        await completeTransactionCommand({
          commandId: command.id,
          success: true,
        });

        void emitKevGovernanceEvent("pisao.concierge.command_executed", {
          source: "transaction_command_bus",
          command: "reservation.commit",
          personas: reserva.personas,
          fecha: reserva.fecha,
          hora: reserva.hora,
        });

        return NextResponse.json({
          command: {
            id: command.id,
            type: command.type,
            status: "EXECUTED",
          },
          reserva,
        });
      } catch (error) {
        if (error instanceof ReservationConflictError) {
          const alternatives =
            error.code === "NO_AVAILABILITY"
              ? await reservationAlternatives({
                  fecha: parsed.data.fecha,
                  personas: parsed.data.personas,
                })
              : [];

          await completeTransactionCommand({
            commandId: command.id,
            success: false,
            failureCode: error.code,
          });

          return NextResponse.json(
            {
              error: error.message,
              code: error.code,
              alternatives,
            },
            { status: 409 },
          );
        }

        throw error;
      }
    }

    await completeTransactionCommand({
      commandId: command.id,
      success: false,
      failureCode: "UNSUPPORTED_COMMAND",
    });

    return NextResponse.json(
      { error: "Tipo de comando no soportado.", code: "UNSUPPORTED_COMMAND" },
      { status: 400 },
    );
  } catch (error) {
    void captureServerError(error, {
      surface: "concierge_command",
      command: command.type,
    });

    await completeTransactionCommand({
      commandId: command.id,
      success: false,
      failureCode: error instanceof Error ? error.name : "EXECUTION_FAILED",
    });

    void emitKevGovernanceEvent("pisao.concierge.command_rejected", {
      source: "transaction_command_bus",
      command: command.type,
      reason: error instanceof Error ? error.name : "EXECUTION_FAILED",
    });

    return NextResponse.json(
      {
        error:
          "No fue posible ejecutar la acción. Puedes intentarlo nuevamente.",
        code: "COMMAND_EXECUTION_FAILED",
      },
      { status: 503 },
    );
  }
}
