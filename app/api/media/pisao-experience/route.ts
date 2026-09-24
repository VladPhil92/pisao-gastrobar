import { NextResponse } from "next/server";

const DRIVE_FILE_ID = "1lY9FmPQBnsyzMcPFd1fQZziMqMZ34UkH";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = [
    `https://drive.usercontent.google.com/download?id=${DRIVE_FILE_ID}&export=download&confirm=t`,
    `https://drive.google.com/thumbnail?id=${DRIVE_FILE_ID}&sz=w1600`,
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        redirect: "follow",
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) continue;
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength) continue;
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        },
      });
    } catch {}
  }
  return NextResponse.json({ error: "Image unavailable" }, { status: 502 });
}
