"use client";

import { useState } from "react";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="border-pisao-gold/25 text-pisao-gold hover:bg-pisao-gold/10 rounded-lg border px-3 py-1.5 text-[11px] font-semibold"
    >
      {copied ? "Copiado" : label}
    </button>
  );
}

function Step({
  index,
  title,
  detail,
  done,
}: {
  index: number;
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-pisao-gold/10 bg-pisao-noche p-4">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-pisao-gold/10 text-pisao-gold"
        }`}
      >
        {done ? "✓" : index}
      </div>
      <div>
        <p className="text-pisao-cream text-sm font-semibold">{title}</p>
        <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">
          {detail}
        </p>
      </div>
    </div>
  );
}

export function MetaEmbeddedSignupGuide({
  appId,
  configIdReady,
  appSecretReady,
  webhookTokenReady,
  vaultReady,
}: {
  appId: string | null;
  configIdReady: boolean;
  appSecretReady: boolean;
  webhookTokenReady: boolean;
  vaultReady: boolean;
}) {
  const metaAppUrl = appId
    ? `https://developers.facebook.com/apps/${encodeURIComponent(appId)}/`
    : "https://developers.facebook.com/apps/";

  const publicDomain = "pisaogastrobar.com";
  const adminUrl = "https://pisaogastrobar.com/admin/whatsapp";
  const webhookUrl = "https://pisaogastrobar.com/api/whatsapp/webhook";

  return (
    <section className="mt-6 rounded-3xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold uppercase tracking-[.16em]">
            Meta Setup Wizard V6
          </p>
          <h2 className="font-display text-pisao-cream mt-1 text-2xl">
            Embedded Signup v4 · Coexistence
          </h2>
          <p className="text-pisao-cream-muted mt-2 max-w-3xl text-sm leading-relaxed">
            Este asistente resume lo que debes crear en Meta para vincular el
            mismo número que ya usa WhatsApp Business App, sin migrarlo fuera
            del teléfono.
          </p>
        </div>

        <a
          href={metaAppUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-pisao-gold text-pisao-carbon inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Abrir mi app en Meta
        </a>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Step
          index={1}
          title="Facebook Login for Business"
          detail="En la app de Meta, agrega o abre Facebook Login for Business. Luego entra a Configurations / Configuraciones."
        />
        <Step
          index={2}
          title="Crear configuración v4"
          detail="Create configuration → Login variation: WhatsApp Embedded Signup. Usa un nombre como “PISÁO Embedded Signup v4”."
        />
        <Step
          index={3}
          title="Producto y activos"
          detail="Selecciona WhatsApp Cloud API. En Assets, selecciona WhatsApp accounts. Añade Marketing Messages solo si vas a usar ese producto."
        />
        <Step
          index={4}
          title="Permisos mínimos"
          detail="Selecciona whatsapp_business_management y whatsapp_business_messaging. Evita permisos extra que PISÁO no necesita."
        />
        <Step
          index={5}
          title="Login settings"
          detail="En Settings de Facebook Login for Business habilita Client OAuth Login, Web OAuth Login, Enforce HTTPS, Embedded Browser OAuth Login, Strict Mode y Login with JavaScript SDK."
        />
        <Step
          index={6}
          title="Dominio público"
          detail="Añade pisaogastrobar.com como dominio permitido para JavaScript SDK y usa únicamente URLs HTTPS estáticas."
        />
        <Step
          index={7}
          title="Copiar Configuration ID"
          detail="Al terminar, copia el Configuration ID que genera Meta y pégalo en la sección Conectar con Coexistence de esta página."
          done={configIdReady}
        />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-pisao-gold/10 bg-black/10 p-4">
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Dominio
          </p>
          <p className="text-pisao-cream mt-2 break-all text-sm">
            {publicDomain}
          </p>
          <div className="mt-3">
            <CopyButton value={publicDomain} label="Copiar dominio" />
          </div>
        </div>

        <div className="rounded-xl border border-pisao-gold/10 bg-black/10 p-4">
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Página que lanza Embedded Signup
          </p>
          <p className="text-pisao-cream mt-2 break-all text-sm">{adminUrl}</p>
          <div className="mt-3">
            <CopyButton value={adminUrl} label="Copiar URL" />
          </div>
        </div>

        <div className="rounded-xl border border-pisao-gold/10 bg-black/10 p-4">
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Webhook
          </p>
          <p className="text-pisao-cream mt-2 break-all text-sm">{webhookUrl}</p>
          <div className="mt-3">
            <CopyButton value={webhookUrl} label="Copiar webhook" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Meta App ID", Boolean(appId)],
          ["Meta App Secret", appSecretReady],
          ["Webhook Token", webhookTokenReady],
          ["Token Vault", vaultReady],
          ["Configuration ID", configIdReady],
        ].map(([label, ok]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3"
          >
            <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
              {String(label)}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${
                ok ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              {ok ? "LISTO" : "PENDIENTE"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-500/[.05] p-4">
        <p className="text-amber-200 text-xs font-semibold uppercase tracking-wider">
          Importante para Coexistence
        </p>
        <p className="text-pisao-cream-muted mt-2 text-xs leading-relaxed">
          Cuando pulses “Conectar WhatsApp Business”, PISÁO solicita el flujo
          de WhatsApp Business App onboarding. Debes elegir el portafolio de
          negocio correcto y el número que actualmente usas en la app de
          WhatsApp Business. No hagas una migración convencional del número.
        </p>
      </div>
    </section>
  );
}
