import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  getEmbeddedSignupConfigId,
  getMetaReviewLifecycle,
  normalizeEmbeddedSignupConfigId,
  saveEmbeddedSignupConfigId,
  saveMetaReviewLifecycle,
} from "@/lib/whatsapp/meta-config";

function authorized(role: string | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function GET() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;
  if (!session?.user || !authorized(role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [configId, review] = await Promise.all([
    getEmbeddedSignupConfigId(),
    getMetaReviewLifecycle(),
  ]);

  return NextResponse.json({ configId, review });
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user || !authorized(user.rol)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        configId?: unknown;
        accessVerificationStatus?: unknown;
        appReviewStatus?: unknown;
      }
    | null;

  if (body?.configId !== undefined) {
    const configId = normalizeEmbeddedSignupConfigId(body.configId);
    if (!configId) {
      return NextResponse.json(
        { error: "Configuration ID inválido." },
        { status: 400 },
      );
    }

    await saveEmbeddedSignupConfigId(configId, user.id);
    return NextResponse.json({ ok: true, configId });
  }

  try {
    await saveMetaReviewLifecycle({
      accessVerificationStatus: body?.accessVerificationStatus,
      appReviewStatus: body?.appReviewStatus,
      updatedByUserId: user.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Estado de revisión de Meta inválido." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    review: await getMetaReviewLifecycle(),
  });
}
