"use client";

import type {
  BehaviorDimensions,
  BehaviorEventName,
  BehaviorSurface,
} from "@/lib/analytics/behavioral-contract";

const SESSION_KEY = "pisao-behavior-session-v1";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "_");
  }

  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function getSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const created = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return createSessionId();
  }
}

function getDeviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 639px)").matches) return "mobile";
  if (window.matchMedia("(max-width: 1023px)").matches) return "tablet";
  return "desktop";
}

export function classifyBehaviorSurface(pathname: string): BehaviorSurface {
  if (pathname === "/") return "home";
  if (pathname === "/menu") return "menu";
  if (pathname.startsWith("/menu/")) return "product";
  if (pathname.startsWith("/pedidos")) return "checkout";
  if (pathname.startsWith("/reservas")) return "reservation";
  if (pathname.startsWith("/eventos")) return "events";
  if (pathname.startsWith("/galeria")) return "gallery";
  if (pathname.startsWith("/micuenta")) return "account";
  if (pathname.startsWith("/contacto")) return "contact";
  return "site";
}

export function trackBehavior(
  eventName: BehaviorEventName,
  dimensions: BehaviorDimensions = {},
) {
  if (typeof window === "undefined") return;

  const sessionId = getSessionId();
  if (!sessionId) return;

  const payload = {
    eventName,
    sessionId,
    pathname: window.location.pathname.slice(0, 180),
    deviceClass: getDeviceClass(),
    ...dimensions,
  };

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Telemetry must never interrupt the customer journey.
  });
}
