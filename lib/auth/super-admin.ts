import "server-only";

export function federatedPisaoRole(email: string): "SUPER_ADMIN" | "ADMIN" {
  const allowlist = (process.env.PISAO_SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.trim().toLowerCase()) ? "SUPER_ADMIN" : "ADMIN";
}
