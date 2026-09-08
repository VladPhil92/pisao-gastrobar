import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { drainCtgOneRewardOutbox } from "@/lib/ctgone/rewards";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.PISAO_REWARDS_WORKER_SECRET?.trim() ?? "";
  const supplied = request.headers.get("x-pisao-rewards-worker-secret")?.trim() ?? "";

  if (expected.length < 32 || !safeEqual(expected, supplied)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await drainCtgOneRewardOutbox(25);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
