"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

type EmbeddedSignupData = {
  waba_id?: string;
  phone_number_id?: string;
  current_step?: string;
  error_message?: string;
};

type EmbeddedSignupEvent = {
  type?: string;
  event?: string;
  data?: EmbeddedSignupData;
};

type FacebookSdk = {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

function parseEmbeddedSignupEvent(value: unknown): EmbeddedSignupEvent | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as EmbeddedSignupEvent;
    } catch {
      return null;
    }
  }

  if (value && typeof value === "object") {
    return value as EmbeddedSignupEvent;
  }

  return null;
}

export function WhatsAppCoexistenceSetup({
  appId,
  configId,
}: {
  appId: string | null;
  configId: string | null;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(configId);
  const [configDraft, setConfigDraft] = useState(configId ?? "");
  const [configSaving, setConfigSaving] = useState(false);
  const [authCode, setAuthCode] = useState<string | null>(null);
  const [wabaId, setWabaId] = useState<string | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [state, setState] = useState<
    "idle" | "waiting" | "saving" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const completionStarted = useRef(false);

  function initializeSdk() {
    if (!appId || !window.FB) return;
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: "v25.0",
    });
    setSdkReady(true);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      const parsed = parseEmbeddedSignupEvent(event.data);
      if (parsed?.type !== "WA_EMBEDDED_SIGNUP") return;

      if (
        parsed.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
        parsed.event === "FINISH"
      ) {
        if (parsed.data?.waba_id) setWabaId(parsed.data.waba_id);
        if (parsed.data?.phone_number_id) {
          setPhoneNumberId(parsed.data.phone_number_id);
        }
        setMessage(
          "Meta completó el vínculo. Estamos guardando la conexión segura.",
        );
      } else if (parsed.event === "CANCEL") {
        setState("idle");
        setMessage(
          parsed.data?.current_step
            ? `Meta canceló el onboarding en el paso “${parsed.data.current_step}”. Puedes reintentarlo sin perder la configuración.`
            : "El onboarding fue cancelado antes de completarse.",
        );
      } else if (parsed.event === "ERROR") {
        completionStarted.current = false;
        setState("error");
        setMessage(
          parsed.data?.error_message ||
            "Meta reportó un error durante Embedded Signup. Revisa la configuración v4, los permisos y el dominio permitido.",
        );
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!authCode || !wabaId || completionStarted.current) return;
    completionStarted.current = true;
    setState("saving");

    void fetch("/api/admin/whatsapp/embedded-signup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: authCode, wabaId, phoneNumberId }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          integration?: {
            displayPhoneNumber?: string | null;
          };
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "No fue posible guardar la conexión.");
        }

        setState("success");
        setMessage(
          `Coexistence quedó conectado${payload.integration?.displayPhoneNumber ? ` para ${payload.integration.displayPhoneNumber}` : ""}. Recarga esta página para ver el estado actualizado.`,
        );
      })
      .catch((error) => {
        completionStarted.current = false;
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "No fue posible completar la conexión.",
        );
      });
  }, [authCode, wabaId, phoneNumberId]);

  async function saveConfigId() {
    const value = configDraft.trim();
    if (!value) {
      setState("error");
      setMessage("Pega el Configuration ID generado por Meta.");
      return;
    }

    setConfigSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/whatsapp/meta-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: value }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        configId?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.configId) {
        throw new Error(payload.error || "No fue posible guardar el Configuration ID.");
      }

      setActiveConfigId(payload.configId);
      setConfigDraft(payload.configId);
      setState("idle");
      setMessage("Configuration ID guardado. Ya puedes abrir Embedded Signup sin hacer otro rebuild.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "No fue posible guardar el Configuration ID.",
      );
    } finally {
      setConfigSaving(false);
    }
  }

  function launch() {
    if (!window.FB || !appId || !activeConfigId) return;

    completionStarted.current = false;
    setAuthCode(null);
    setWabaId(null);
    setPhoneNumberId(null);
    setState("waiting");
    setMessage(
      "Completa el flujo de Meta y el QR desde WhatsApp Business. No cierres esta pestaña.",
    );

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setState("error");
          setMessage(
            "Meta no devolvió el código de autorización. Reintenta el flujo.",
          );
          return;
        }
        setAuthCode(code);
      },
      {
        config_id: activeConfigId,
        response_type: "code",
        override_default_response_type: true,
        auth_type: "rerequest",
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
        },
      },
    );
  }

  const ready = Boolean(appId && activeConfigId && sdkReady);

  return (
    <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initializeSdk}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-pisao-cream text-2xl">
          Conectar con Coexistence
        </h2>
        <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-gold">
          Embedded Signup v4
        </span>
      </div>
      <p className="text-pisao-cream-muted mt-2 text-sm leading-relaxed">
        Este flujo conserva WhatsApp Business en el teléfono y agrega Cloud API.
        No ejecuta migración convencional ni registra el número por fuera de
        Embedded Signup.
      </p>

      <div className="mt-4 grid gap-2 text-sm">
        <p className="text-pisao-cream-muted">
          Meta App ID:{" "}
          <span className={appId ? "text-emerald-300" : "text-amber-300"}>
            {appId ? "configurado" : "pendiente"}
          </span>
        </p>
        <p className="text-pisao-cream-muted">
          Embedded Signup Configuration ID:{" "}
          <span className={activeConfigId ? "text-emerald-300" : "text-amber-300"}>
            {activeConfigId ? "configurado" : "pendiente"}
          </span>
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-pisao-gold/10 bg-black/10 p-4">
        <label
          htmlFor="embedded-signup-config-id"
          className="text-pisao-cream text-xs font-semibold uppercase tracking-wider"
        >
          Configuration ID de Embedded Signup
        </label>
        <p className="text-pisao-cream-muted mt-1 text-xs leading-relaxed">
          No es un secreto. Cópialo desde la configuración de WhatsApp Embedded Signup en Meta y guárdalo aquí.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="embedded-signup-config-id"
            value={configDraft}
            onChange={(event) => setConfigDraft(event.target.value)}
            placeholder="Ej. 123456789012345"
            autoComplete="off"
            className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-pisao-gold/60"
          />
          <button
            type="button"
            onClick={() => void saveConfigId()}
            disabled={configSaving}
            className="border-pisao-gold/30 text-pisao-gold hover:bg-pisao-gold/10 min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {configSaving ? "Guardando…" : "Guardar ID"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={launch}
        disabled={!ready || state === "waiting" || state === "saving"}
        className="mt-5 rounded-xl bg-pisao-gold px-4 py-2.5 text-sm font-semibold text-pisao-carbon disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === "waiting"
          ? "Esperando a Meta…"
          : state === "saving"
            ? "Guardando conexión…"
            : "Conectar WhatsApp Business"}
      </button>

      {!activeConfigId ? (
        <p className="mt-3 text-xs leading-relaxed text-amber-300">
          Falta el Configuration ID. En Meta crea una configuración de Facebook Login
          for Business con la variación “WhatsApp Embedded Signup”, copia el ID resultante
          y pégalo aquí.
        </p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-emerald-300">
          Configuration ID listo. No necesitas volver a Render para este dato.
        </p>
      )}

      {message ? (
        <p
          className={`mt-3 text-sm ${state === "error" ? "text-red-300" : state === "success" ? "text-emerald-300" : "text-pisao-cream-muted"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
