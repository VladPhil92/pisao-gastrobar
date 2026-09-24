import { runtimeReleaseSha, shortReleaseSha } from "@/lib/release/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = runtimeReleaseSha();

  return Response.json(
    {
      app: "pisao-gastrobar",
      release: shortReleaseSha(),
      releaseSha: release,
      environment: process.env.RENDER ? "render" : process.env.VERCEL ? "vercel" : "unknown",
      branch: process.env.RENDER_GIT_BRANCH?.trim() || process.env.VERCEL_GIT_COMMIT_REF?.trim() || null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-PISAO-Release": release,
      },
    },
  );
}
