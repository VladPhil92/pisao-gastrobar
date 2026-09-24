import { NextResponse } from "next/server";

const DRIVE_FILE_ID = "1lY9FmPQBnsyzMcPFd1fQZziMqMZ34UkH";
const MIN_IMAGE_WIDTH = 1188;
const MIN_IMAGE_HEIGHT = 1600;
const MIN_IMAGE_BYTES = 120_000;

export const dynamic = "force-dynamic";

function readJpegDimensions(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;

  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  let offset = 2;
  while (offset + 3 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = view.getUint8(offset + 1);
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (marker === 0xda || offset + 2 > view.byteLength) break;

    const segmentLength = view.getUint16(offset, false);
    if (segmentLength < 2 || offset + segmentLength > view.byteLength) break;

    if (sofMarkers.has(marker) && segmentLength >= 7) {
      return {
        height: view.getUint16(offset + 3, false),
        width: view.getUint16(offset + 5, false),
      };
    }

    offset += segmentLength;
  }

  return null;
}

export async function GET() {
  const sources = [
    {
      label: "drive-original",
      url: `https://drive.usercontent.google.com/download?id=${DRIVE_FILE_ID}&export=download&confirm=t`,
    },
    {
      label: "drive-thumbnail",
      url: `https://drive.google.com/thumbnail?id=${DRIVE_FILE_ID}&sz=w1600`,
    },
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        redirect: "follow",
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/jpeg")) continue;

      const bytes = await response.arrayBuffer();
      const dimensions = readJpegDimensions(bytes);
      const isHd =
        bytes.byteLength >= MIN_IMAGE_BYTES &&
        dimensions &&
        dimensions.width >= MIN_IMAGE_WIDTH &&
        dimensions.height >= MIN_IMAGE_HEIGHT;

      if (!isHd || !dimensions) continue;

      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(bytes.byteLength),
          "Content-Disposition": 'inline; filename="pisao-experience.jpg"',
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
          "X-PISAO-Image-Quality": "hd-certified",
          "X-PISAO-Image-Width": String(dimensions.width),
          "X-PISAO-Image-Height": String(dimensions.height),
          "X-PISAO-Image-Source": source.label,
        },
      });
    } catch {}
  }

  return NextResponse.json(
    { error: "HD experience image unavailable" },
    {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
