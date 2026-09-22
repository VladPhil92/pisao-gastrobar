import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const strict = new URL(request.url).searchParams.get("strict") === "1";

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        app: "pisao-gastrobar",
        database: "available",
        timestamp: new Date().toISOString(),
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("[PISAO HEALTH] Database unavailable", error);

    return Response.json(
      {
        status: "degraded",
        app: "pisao-gastrobar",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      },
      {
        status: strict ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
