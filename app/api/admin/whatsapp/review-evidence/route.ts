import { auth } from "@/lib/auth";
import { getMetaAppReviewReadiness } from "@/lib/whatsapp/meta-review";
import {
  META_REVIEW_EVENTS,
  recordMetaReviewEvidence,
} from "@/lib/whatsapp/meta-review-evidence";

function authorized(role: string | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function GET() {
  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!user || !authorized(user.rol)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  return Response.json({
    ok: true,
    readiness: await getMetaAppReviewReadiness(),
  });
}

export async function POST() {
  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user || !authorized(user.rol)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const readiness = await getMetaAppReviewReadiness();
  await recordMetaReviewEvidence({
    event: META_REVIEW_EVENTS.reviewSnapshot,
    detail: {
      readyForSubmission: readiness.readyForSubmission,
      accessVerified:
        readiness.lifecycle.accessVerificationStatus === "VERIFIED",
      embeddedSignup: readiness.evidenceCoverage.embeddedSignup,
      graphProbe: readiness.evidenceCoverage.graphProbe,
      inbound: readiness.evidenceCoverage.inbound,
      aiOutbound: readiness.evidenceCoverage.aiOutbound,
      strictE2E: readiness.evidenceCoverage.strictE2E,
      generatedByAdmin: true,
    },
    dedupeMinutes: 1,
  });

  return Response.json({
    ok: true,
    readiness: await getMetaAppReviewReadiness(),
  });
}
