"use client";

import { useState } from "react";

type ReviewReadiness = {
  lifecycle: {
    accessVerificationStatus: string;
    accessVerificationUpdatedAt: string | null;
    appReviewStatus: string;
    appReviewUpdatedAt: string | null;
  };
  readyForSubmission: boolean;
  checklist: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
  permissions: Array<{
    id: string;
    label: string;
    purpose: string;
    evidence: string[];
    state: "WAITING_EXTERNAL" | "READY_TO_RECORD" | "EVIDENCE_AVAILABLE";
  }>;
  publicUrls: Record<string, string>;
};

function stateLabel(state: ReviewReadiness["permissions"][number]["state"]) {
  if (state === "EVIDENCE_AVAILABLE") return "EVIDENCIA DISPONIBLE";
  if (state === "READY_TO_RECORD") return "LISTO PARA GRABAR";
  return "ESPERANDO META";
}

function stateClass(state: ReviewReadiness["permissions"][number]["state"]) {
  if (state === "EVIDENCE_AVAILABLE") return "bg-emerald-500/15 text-emerald-300";
  if (state === "READY_TO_RECORD") return "bg-amber-500/15 text-amber-200";
  return "bg-pisao-cream/10 text-pisao-cream-muted";
}

export function MetaAppReviewEvidenceCenter({
  initial,
}: {
  initial: ReviewReadiness;
}) {
  const [accessStatus, setAccessStatus] = useState(
    initial.lifecycle.accessVerificationStatus,
  );
  const [appReviewStatus, setAppReviewStatus] = useState(
    initial.lifecycle.appReviewStatus,
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function updateReviewState(
    field: "accessVerificationStatus" | "appReviewStatus",
    value: string,
  ) {
    setSaving(field);
    setMessage("");
    try {
      const response = await fetch("/api/admin/whatsapp/meta-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        review?: {
          accessVerificationStatus?: string;
          appReviewStatus?: string;
        };
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No fue posible actualizar el estado.");
      }
      if (payload.review?.accessVerificationStatus) {
        setAccessStatus(payload.review.accessVerificationStatus);
      }
      if (payload.review?.appReviewStatus) {
        setAppReviewStatus(payload.review.appReviewStatus);
      }
      setMessage(
        "Estado actualizado. Recarga la página para recalcular todos los gates de evidencia.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el estado.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copiado al portapapeles.");
  }

  return (
    <section className="mt-6 rounded-3xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.18em] uppercase">
            Meta App Review · Evidence Center V8
          </p>
          <h2 className="font-display text-pisao-cream mt-2 text-3xl">
            Readiness para revisión de Meta
          </h2>
          <p className="text-pisao-cream-muted mt-3 max-w-3xl text-sm leading-relaxed">
            Separa estado externo de Meta, configuración técnica y evidencia real.
            Ningún permiso se marca como demostrado solo porque exista código o una
            variable de entorno.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            initial.readyForSubmission
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {initial.readyForSubmission
            ? "LISTO PARA APP REVIEW"
            : "AÚN NO ENVIAR"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <label className="text-pisao-cream text-xs font-semibold uppercase tracking-wider">
            Access Verification
          </label>
          <select
            value={accessStatus}
            onChange={(event) => {
              const value = event.target.value;
              setAccessStatus(value);
              void updateReviewState("accessVerificationStatus", value);
            }}
            disabled={saving !== null}
            className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            <option value="NOT_STARTED">No iniciada</option>
            <option value="PENDING">En revisión</option>
            <option value="VERIFIED">Verificada</option>
            <option value="REJECTED">Rechazada</option>
          </select>
        </div>

        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <label className="text-pisao-cream text-xs font-semibold uppercase tracking-wider">
            App Review
          </label>
          <select
            value={appReviewStatus}
            onChange={(event) => {
              const value = event.target.value;
              setAppReviewStatus(value);
              void updateReviewState("appReviewStatus", value);
            }}
            disabled={saving !== null}
            className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"
          >
            <option value="NOT_STARTED">No iniciada</option>
            <option value="READY">Lista para enviar</option>
            <option value="SUBMITTED">Enviada</option>
            <option value="APPROVED">Aprobada</option>
            <option value="REJECTED">Rechazada</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {initial.checklist.map((check) => (
          <div
            key={check.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-pisao-gold/10 bg-pisao-noche px-3 py-3 text-xs"
          >
            <div>
              <p className="text-pisao-cream">{check.label}</p>
              <p className="text-pisao-cream-muted mt-1">{check.detail}</p>
            </div>
            <span className={check.ok ? "text-emerald-300" : "text-amber-200"}>
              {check.ok ? "OK" : "PENDIENTE"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {initial.permissions.map((permission) => (
          <article
            key={permission.id}
            className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-pisao-cream font-semibold">{permission.label}</p>
                <code className="text-pisao-gold mt-1 block text-[11px]">
                  {permission.id}
                </code>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass(permission.state)}`}
              >
                {stateLabel(permission.state)}
              </span>
            </div>

            <p className="text-pisao-cream-muted mt-4 text-sm leading-relaxed">
              {permission.purpose}
            </p>

            <div className="mt-4 border-t border-pisao-gold/10 pt-4">
              <p className="text-pisao-gold text-[10px] font-semibold uppercase tracking-wider">
                Evidencia que debe mostrar el video
              </p>
              <ul className="text-pisao-cream-muted mt-3 space-y-2 text-xs leading-relaxed">
                {permission.evidence.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-5">
        <p className="text-pisao-gold text-[10px] font-semibold uppercase tracking-wider">
          URLs públicas para Meta
        </p>
        <div className="mt-4 grid gap-2">
          {Object.entries(initial.publicUrls).map(([key, url]) => (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-xl border border-pisao-gold/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-pisao-cream text-xs font-semibold">{key}</p>
                <p className="text-pisao-cream-muted mt-1 break-all text-xs">
                  {url}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copy(url)}
                className="border-pisao-gold/25 text-pisao-gold hover:bg-pisao-gold/10 rounded-lg border px-3 py-2 text-xs font-semibold"
              >
                Copiar
              </button>
            </div>
          ))}
        </div>
      </div>

      {message ? (
        <p className="text-pisao-cream-muted mt-4 text-sm">{message}</p>
      ) : null}
    </section>
  );
}
