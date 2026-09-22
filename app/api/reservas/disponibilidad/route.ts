import { handleReservationAvailabilityRequest } from "@/lib/reservas/availability-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleReservationAvailabilityRequest(request);
}
