import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function federationMessage(code: string | undefined) {
  if (code === "admin_required") {
    return "La cuenta autenticada en CTG One no tiene rol administrativo.";
  }
  if (code === "federation_unavailable") {
    return "La federación con CTG One no está disponible temporalmente.";
  }
  if (code === "federation_exchange_failed" || code === "federation_invalid") {
    return "No fue posible validar la sesión de CTG One. Intenta nuevamente.";
  }
  if (code === "local_actor_failed") {
    return "CTG One validó tu identidad, pero PISÁO no pudo preparar el actor administrativo local.";
  }
  return null;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params.ctgone;
  const code = Array.isArray(raw) ? raw[0] : raw;

  return <AdminLoginForm federationError={federationMessage(code)} />;
}
