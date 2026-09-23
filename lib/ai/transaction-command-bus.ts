import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type TransactionCommandType =
  | "cart.commit"
  | "reservation.commit";

export type PreparedTransactionCommand = {
  id: string;
  type: TransactionCommandType;
  label: string;
  confirmationToken: string;
  expiresAt: string;
};

const SESSION_KEY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;
const COMMAND_TTL_MS = 10 * 60 * 1000;

function validSessionKey(value: unknown): value is string {
  return typeof value === "string" && SESSION_KEY_PATTERN.test(value);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function secureEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function commandLabel(type: TransactionCommandType) {
  return type === "cart.commit"
    ? "Confirmar en Mesa Visual"
    : "Confirmar reserva";
}

function idempotencyKey(params: {
  sessionKey: string;
  type: TransactionCommandType;
  payload: Prisma.InputJsonValue;
}) {
  return hash(
    JSON.stringify({
      version: 1,
      sessionKey: params.sessionKey,
      type: params.type,
      payload: params.payload,
    }),
  );
}

export async function prepareTransactionCommand(params: {
  sessionKey: unknown;
  type: TransactionCommandType;
  payload: Prisma.InputJsonValue;
  containsPii?: boolean;
}): Promise<PreparedTransactionCommand | null> {
  if (!validSessionKey(params.sessionKey)) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + COMMAND_TTL_MS);
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hash(token);
  const key = idempotencyKey({
    sessionKey: params.sessionKey,
    type: params.type,
    payload: params.payload,
  });

  // Opportunistic cleanup keeps short-lived PII commands from accumulating
  // without requiring a separate paid worker at current traffic levels.
  await prisma.aiTransactionCommand.deleteMany({
    where: {
      expiresAt: { lt: now },
      status: { in: ["PENDING", "CONFIRMED", "FAILED"] },
    },
  });

  const existing = await prisma.aiTransactionCommand.findUnique({
    where: { idempotencyKey: key },
  });

  if (existing?.status === "EXECUTED") {
    return null;
  }

  const command = existing
    ? await prisma.aiTransactionCommand.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          tokenHash,
          payload: params.payload,
          containsPii: Boolean(params.containsPii),
          expiresAt,
          confirmedAt: null,
          executedAt: null,
          failureCode: null,
        },
      })
    : await prisma.aiTransactionCommand.create({
        data: {
          sessionKey: params.sessionKey,
          type: params.type,
          status: "PENDING",
          tokenHash,
          idempotencyKey: key,
          payload: params.payload,
          containsPii: Boolean(params.containsPii),
          expiresAt,
        },
      });

  return {
    id: command.id,
    type: params.type,
    label: commandLabel(params.type),
    confirmationToken: token,
    expiresAt: command.expiresAt.toISOString(),
  };
}

export async function claimTransactionCommand(params: {
  commandId: unknown;
  confirmationToken: unknown;
  sessionKey: unknown;
}) {
  if (
    typeof params.commandId !== "string" ||
    typeof params.confirmationToken !== "string" ||
    !validSessionKey(params.sessionKey)
  ) {
    return { ok: false as const, code: "INVALID_COMMAND" as const };
  }

  const command = await prisma.aiTransactionCommand.findUnique({
    where: { id: params.commandId },
  });

  if (!command || command.sessionKey !== params.sessionKey) {
    return { ok: false as const, code: "COMMAND_NOT_FOUND" as const };
  }

  if (command.status === "EXECUTED") {
    return {
      ok: false as const,
      code: "ALREADY_EXECUTED" as const,
      command,
    };
  }

  if (command.expiresAt.getTime() <= Date.now()) {
    await prisma.aiTransactionCommand.update({
      where: { id: command.id },
      data: { status: "EXPIRED", failureCode: "EXPIRED" },
    });
    return { ok: false as const, code: "COMMAND_EXPIRED" as const };
  }

  if (!secureEquals(command.tokenHash, hash(params.confirmationToken))) {
    return { ok: false as const, code: "INVALID_TOKEN" as const };
  }

  if (command.status !== "PENDING") {
    return {
      ok: false as const,
      code: "COMMAND_NOT_PENDING" as const,
      command,
    };
  }

  const claimed = await prisma.aiTransactionCommand.updateMany({
    where: {
      id: command.id,
      status: "PENDING",
    },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      failureCode: null,
    },
  });

  if (claimed.count !== 1) {
    return { ok: false as const, code: "COMMAND_RACE" as const };
  }

  return {
    ok: true as const,
    command: {
      ...command,
      status: "CONFIRMED",
    },
  };
}

export async function completeTransactionCommand(params: {
  commandId: string;
  success: boolean;
  failureCode?: string;
}) {
  return prisma.aiTransactionCommand.update({
    where: { id: params.commandId },
    data: params.success
      ? {
          status: "EXECUTED",
          executedAt: new Date(),
          failureCode: null,
        }
      : {
          status: "FAILED",
          failureCode: (params.failureCode ?? "EXECUTION_FAILED").slice(0, 64),
        },
  });
}

export function transactionCommandHealth() {
  return {
    protocol: "explicit_confirmation_v1",
    ttlMinutes: COMMAND_TTL_MS / 60_000,
    tokenStorage: "sha256_only",
    idempotency: "enabled",
  };
}
