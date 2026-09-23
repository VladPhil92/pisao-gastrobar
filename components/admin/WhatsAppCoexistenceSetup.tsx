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
        setMessage("El onboarding fue cancelado antes de completarse.");
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

  function launch() {
    if (!window.FB || !appId || !configId) return;

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
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        auth_type: "rerequest",
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  }

  const ready = Boolean(appId && configId && sdkReady);

  return (
    <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initializeSdk}
      />

      <h2 className="font-display text-pisao-cream text-2xl">
        Conectar con Coexistence
      </h2>
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
          <span className={configId ? "text-emerald-300" : "text-amber-300"}>
            {configId ? "configurado" : "pendiente"}
          </span>
        </p>
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

      {!configId ? (
        <p className="mt-3 text-xs leading-relaxed text-amber-300">
          Falta el Configuration ID de Embedded Signup. Meta debe crearlo después
          de habilitar la app como Tech Provider/Embedded Signup.
        </p>
      ) : null}

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
