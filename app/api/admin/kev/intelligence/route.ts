import { auth } from "@/lib/auth";
import { fetchKevIntelligenceSnapshot } from "@/lib/governance/kev-intelligence";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(role ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const intelligence = await fetchKevIntelligenceSnapshot();
  return Response.json(intelligence, {
    status: intelligence.available ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
