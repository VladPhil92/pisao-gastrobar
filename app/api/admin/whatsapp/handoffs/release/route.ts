import { auth } from "@/lib/auth";
import { releaseWhatsAppHumanHandoff } from "@/lib/whatsapp/state";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { conversationId?: unknown }
    | null;
  const conversationId =
    typeof body?.conversationId === "string"
      ? body.conversationId.trim()
      : "";

  if (!conversationId) {
    return Response.json(
      { error: "conversationId requerido." },
      { status: 400 },
    );
  }

  try {
    await releaseWhatsAppHumanHandoff(conversationId);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "No fue posible liberar el handoff." },
      { status: 404 },
    );
  }
}
