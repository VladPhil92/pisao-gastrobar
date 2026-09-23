export type CertificationState =
  | "BLOCKED"
  | "READY_FOR_TEST"
  | "CERTIFIED";

export type OverallCertificationState =
  | "ACTION_REQUIRED"
  | "TESTING"
  | "CERTIFIED";

export function deriveCertificationState(
  configured: boolean,
  liveEvidence: boolean,
): CertificationState {
  if (!configured) return "BLOCKED";
  return liveEvidence ? "CERTIFIED" : "READY_FOR_TEST";
}

export function deriveOverallCertification(
  states: CertificationState[],
): OverallCertificationState {
  if (states.length > 0 && states.every((state) => state === "CERTIFIED")) {
    return "CERTIFIED";
  }
  if (states.some((state) => state === "BLOCKED")) {
    return "ACTION_REQUIRED";
  }
  return "TESTING";
}
