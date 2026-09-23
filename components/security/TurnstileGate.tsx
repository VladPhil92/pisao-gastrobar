"use client";

import Script from "next/script";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

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
  remove(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileGateHandle = {
  token(): string | null;
  reset(): void;
  required(): boolean;
  ready(): boolean;
};

export const TurnstileGate = forwardRef<
  TurnstileGateHandle,
  { action: string; className?: string; onReadyChange?: (ready: boolean) => void }
>(function TurnstileGate({ action, className, onReadyChange }, ref) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const notify = useCallback(
    (ready: boolean) => onReadyChange?.(ready),
    [onReadyChange],
  );

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      appearance: "interaction-only",
      callback: (token) => {
        tokenRef.current = token;
        notify(true);
      },
      "expired-callback": () => {
        tokenRef.current = null;
        notify(false);
        if (widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current);
        }
      },
      "error-callback": () => {
        tokenRef.current = null;
        notify(false);
      },
    });
  }, [action, notify, siteKey]);

  useImperativeHandle(
    ref,
    () => ({
      token: () => tokenRef.current,
      required: () => Boolean(siteKey),
      ready: () => !siteKey || Boolean(tokenRef.current),
      reset: () => {
        tokenRef.current = null;
        notify(!siteKey);
        if (widgetIdRef.current) {
          window.turnstile?.reset(widgetIdRef.current);
        }
      },
    }),
    [notify, siteKey],
  );

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
});
