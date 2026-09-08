import { NextResponse } from "next/server";

import { getCtgOneCustomerSession } from "@/lib/ctgone/customer-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCtgOneCustomerSession();
  const response = NextResponse.json(
    session
      ? { connected: true, email: session.email }
      : { connected: false },
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
