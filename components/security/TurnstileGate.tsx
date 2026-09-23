"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileGate({
  action,
  className,
  resetKey = 0,
  onTokenChange,
}: {
  action: string;
  className?: string;
  resetKey?: number;
  onTokenChange: (token: string | null) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      appearance: "interaction-only",
      callback: (token) => onTokenChange(token),
      "expired-callback": () => {
        onTokenChange(null);
        if (widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current);
        }
      },
      "error-callback": () => onTokenChange(null),
    });
  }, [action, onTokenChange, siteKey]);

  useEffect(() => {
    if (!siteKey || !widgetIdRef.current || !window.turnstile) return;
    onTokenChange(null);
    window.turnstile.reset(widgetIdRef.current);
  }, [onTokenChange, resetKey, siteKey]);

  return (
    <>
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => {
            setLoaded(true);
            queueMicrotask(renderWidget);
          }}
        />
      )}
      <div
        ref={containerRef}
        data-turnstile-ready={loaded ? "true" : "false"}
        className={className}
        aria-label={siteKey ? "Verificación de seguridad" : undefined}
      />
    </>
  );
}
