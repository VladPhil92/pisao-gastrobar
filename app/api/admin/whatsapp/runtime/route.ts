import { auth } from "@/lib/auth";
import {
  getWhatsAppRuntimeState,
  setWhatsAppRuntimeEnabled,
} from "@/lib/whatsapp/meta-config";
import { probeWhatsAppIntegration } from "@/lib/whatsapp/readiness";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(role ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  return Response.json(await getWhatsAppRuntimeState());
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user || user.rol !== "SUPER_ADMIN") {
    return Response.json(
      { error: "Solo SUPER_ADMIN puede cambiar el estado operativo." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { enabled?: unknown }
    | null;
  if (typeof body?.enabled !== "boolean") {
    return Response.json(
      { error: "Estado operativo inválido." },
      { status: 400 },
    );
  }

  if (body.enabled) {
    const readiness = await probeWhatsAppIntegration(user.id);
    if (!readiness.ok) {
      return Response.json(
        {
          error:
            "La conexión con Meta no pasó la verificación. Corrige los gates pendientes antes de activar el Concierge.",
          readiness,
        },
        { status: 409 },
      );
    }
  }

  try {
    await setWhatsAppRuntimeEnabled(body.enabled, user.id);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "WHATSAPP_FORCE_DISABLED"
    ) {
      return Response.json(
        {
          error:
            "La activación está bloqueada por WHATSAPP_WEBHOOK_FORCE_DISABLED.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json({
    ok: true,
    ...(await getWhatsAppRuntimeState()),
  });
}
