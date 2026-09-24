import { auth } from "@/lib/auth";
import { probeWhatsAppIntegration } from "@/lib/whatsapp/readiness";

export async function POST() {
  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;

  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await probeWhatsAppIntegration(user.id);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
