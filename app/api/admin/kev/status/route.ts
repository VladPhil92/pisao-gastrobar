import { auth } from "@/lib/auth";
import { getKevControlPlaneSnapshot } from "@/lib/governance/kev-control-plane";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(role ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const snapshot = await getKevControlPlaneSnapshot();
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
