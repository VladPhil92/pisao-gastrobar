"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type {
  OrderTrackingTimelineState,
  OrderTrackingTone,
} from "@/lib/orders/tracking";

const STORAGE_KEY = "pisao.order-tracking-token.v1";

type TrackingSnapshot = {
  version: string;
  order: {
    numero: number;
    total: number;
    tipoEntrega: "DOMICILIO" | "RECOGIDA";
    estado: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
  payment: null | {
    metodo: "QR_TRANSFERENCIA" | "CRIPTO" | "TARJETA";
    estado: string;
    evidenceReceived: boolean;
    evidenceReceivedAt: string | null;
    verifiedAt: string | null;
    crypto: null | {
      moneda: string | null;
      txHash: string | null;
      confirmations: number;
      requiredConfirmations: number | null;
      state: string | null;
      network: string | null;
      explorerUrl: string | null;
      receivedAmount: string | null;
    };
  };
  stage: {
    code: string;
    label: string;
    description: string;
    tone: OrderTrackingTone;
  };
  timeline: Array<{
    id: string;
    label: string;
    description: string;
    state: OrderTrackingTimelineState;
  }>;
  progress: number;
  terminal: boolean;
  refreshAfterMs: number | null;
  generatedAt: string;
};

type RecoveryResponse = {
  ok?: boolean;
  error?: string;
  seguimiento?: {
    token: string;
    url: string;
    expiresAt: string;
  };
};

const toneClass: Record<OrderTrackingTone, string> = {
  neutral: "border-pisao-gold/15 bg-pisao-noche/70",
  progress: "border-pisao-gold/30 bg-pisao-gold/5",
  success: "border-emerald-400/25 bg-emerald-400/5",
  issue: "border-red-400/25 bg-red-400/5",
};

const methodLabel = {
  QR_TRANSFERENCIA: "QR · Bre-B · Bancolombia",
  CRIPTO: "Criptomonedas",
  TARJETA: "Tarjeta / PSE",
} as const;

function timelineIcon(state: OrderTrackingTimelineState) {
  if (state === "complete") return <Check className="size-4" />;
  if (state === "issue") return <AlertTriangle className="size-4" />;
  return <Clock3 className="size-4" />;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function OrderTrackingClient() {
  const [initialized, setInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [telefono, setTelefono] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const tokenFromHash = params.get("token");
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const resolved = tokenFromHash || stored;

      if (tokenFromHash) {
        window.localStorage.setItem(STORAGE_KEY, tokenFromHash);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }

      setToken(resolved);
      setInitialized(true);
    });
  }, []);

  const loadTracking = useCallback(
    async (currentToken: string, background = false) => {
      if (!background) setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/pedidos/seguimiento", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const payload = (await response.json()) as TrackingSnapshot & {
          error?: string;
          code?: string;
        };

        if (!response.ok) {
          if (
            response.status === 401 ||
            payload.code === "TRACKING_ACCESS_INVALID"
          ) {
            window.localStorage.removeItem(STORAGE_KEY);
            setToken(null);
            setSnapshot(null);
          }
          throw new Error(payload.error || "No se pudo consultar el pedido.");
        }

        setSnapshot(payload);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo consultar el pedido.",
        );
      } finally {
        if (!background) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!initialized || !token) return;

    queueMicrotask(() => {
      void loadTracking(token);
    });
  }, [initialized, token, loadTracking]);

  useEffect(() => {
    if (!token || snapshot?.terminal) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadTracking(token, true);
      }
    }, snapshot?.refreshAfterMs ?? 8_000);

    return () => window.clearInterval(interval);
  }, [token, snapshot?.terminal, snapshot?.refreshAfterMs, loadTracking]);

  const recover = async (event: FormEvent) => {
    event.preventDefault();
    setRecovering(true);
    setError(null);

    try {
      const response = await fetch("/api/pedidos/seguimiento/recuperar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ numero, telefono }),
      });
      const payload = (await response.json()) as RecoveryResponse;

      if (!response.ok || !payload.seguimiento?.token) {
        throw new Error(
          payload.error || "No fue posible recuperar el seguimiento.",
        );
      }

      window.localStorage.setItem(STORAGE_KEY, payload.seguimiento.token);
      setToken(payload.seguimiento.token);
      setSnapshot(null);
      setNumero("");
      setTelefono("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible recuperar el seguimiento.",
      );
    } finally {
      setRecovering(false);
    }
  };

  const copyPrivateLink = async () => {
    if (!token) return;

    try {
      const link = `${window.location.origin}/pedidos/seguimiento#token=${encodeURIComponent(token)}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No fue posible copiar el enlace privado.");
    }
  };

  const activeIndex = useMemo(
    () =>
      snapshot?.timeline.findIndex(
        (item) => item.state === "current" || item.state === "issue",
      ) ?? -1,
    [snapshot],
  );

  if (!initialized) {
    return (
      <div className="flex min-h-56 items-center justify-center text-pisao-cream-muted">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Preparando seguimiento...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border border-pisao-gold/15 bg-pisao-carbon-soft p-6 sm:p-8">
        <div className="flex size-11 items-center justify-center rounded-full bg-pisao-gold/10 text-pisao-gold">
          <Search className="size-5" />
        </div>
        <h2 className="font-display mt-4 text-3xl text-pisao-cream">
          Recupera el estado de tu pedido
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-pisao-cream-muted">
          Ingresa el número del pedido y el mismo teléfono utilizado al comprar.
          El sistema generará un nuevo acceso privado para este dispositivo.
        </p>

        <form className="mt-6 space-y-4" onSubmit={recover}>
          <label className="block">
            <span className="text-xs font-semibold text-pisao-cream">
              Número de pedido
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              required
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pisao-gold/15 bg-pisao-noche px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold"
              placeholder="Ej. 128"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-pisao-cream">
              Teléfono del pedido
            </span>
            <input
              type="tel"
              autoComplete="tel"
              required
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              className="mt-2 w-full rounded-xl border border-pisao-gold/15 bg-pisao-noche px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold"
              placeholder="318 000 0000"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={recovering}
          >
            {recovering ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Recuperar seguimiento"
            )}
          </Button>
        </form>

        <p className="mt-5 text-xs leading-relaxed text-pisao-cream-muted">
          Por seguridad no mostramos datos personales del pedido en esta pantalla
          y limitamos los intentos de recuperación.
        </p>
      </div>
    );
  }

  if (loading && !snapshot) {
    return (
      <div className="flex min-h-56 items-center justify-center text-pisao-cream-muted">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Consultando tu pedido...
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-xl rounded-[2rem] border border-red-400/20 bg-red-400/5 p-6">
        <AlertTriangle className="size-7 text-red-300" />
        <p className="mt-3 text-sm text-pisao-cream">
          {error || "No fue posible consultar el pedido."}
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => token && void loadTracking(token)}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-6">
        <div className={`rounded-[2rem] border p-6 sm:p-8 ${toneClass[snapshot.stage.tone]}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">
                Pedido #{snapshot.order.numero}
              </p>
              <h2 className="font-display mt-2 text-3xl leading-tight text-pisao-cream sm:text-4xl">
                {snapshot.stage.label}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pisao-cream-muted">
                {snapshot.stage.description}
              </p>
            </div>
            <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-noche/60 px-4 py-3 text-right">
              <p className="text-[9px] tracking-[.12em] text-pisao-cream-muted uppercase">
                Total
              </p>
              <p className="font-display mt-1 text-2xl text-pisao-gold">
                {formatCurrency(snapshot.order.total)}
              </p>
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-pisao-gold transition-[width] duration-500"
              style={{ width: `${Math.max(5, snapshot.progress)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-pisao-cream-muted">
            <span>{snapshot.progress}% del flujo registrado</span>
            <span>
              Actualizado {formatTime(snapshot.generatedAt)}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-pisao-gold/12 bg-pisao-carbon-soft p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">
                Línea de tiempo
              </p>
              <h3 className="font-display mt-1 text-2xl text-pisao-cream">
                Estado en tiempo real
              </h3>
            </div>
            {!snapshot.terminal && (
              <button
                type="button"
                onClick={() => void loadTracking(token, true)}
                className="inline-flex items-center gap-2 rounded-full border border-pisao-gold/20 px-3 py-2 text-xs text-pisao-gold hover:bg-pisao-gold/5"
              >
                <RefreshCw className="size-3.5" />
                Actualizar
              </button>
            )}
          </div>

          <div className="mt-6">
            {snapshot.timeline.map((item, index) => {
              const complete = item.state === "complete";
              const issue = item.state === "issue";
              const active = index === activeIndex;
              return (
                <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < snapshot.timeline.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px ${
                        complete ? "bg-pisao-gold/50" : "bg-white/10"
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${
                      complete
                        ? "border-pisao-gold bg-pisao-gold text-pisao-carbon"
                        : issue
                          ? "border-red-400/50 bg-red-400/10 text-red-300"
                          : active
                            ? "border-pisao-gold/60 bg-pisao-gold/10 text-pisao-gold"
                            : "border-white/10 bg-pisao-noche text-pisao-cream-muted"
                    }`}
                  >
                    {timelineIcon(item.state)}
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={`text-sm font-semibold ${
                        issue
                          ? "text-red-300"
                          : complete || active
                            ? "text-pisao-cream"
                            : "text-pisao-cream-muted"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-[2rem] border border-pisao-gold/12 bg-pisao-noche p-5 sm:p-6">
          <div className="flex items-center gap-2 text-pisao-gold">
            <ShieldCheck className="size-4" />
            <p className="text-[10px] font-semibold tracking-[.16em] uppercase">
              Seguimiento privado
            </p>
          </div>

          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-pisao-cream-muted">Entrega</dt>
              <dd className="font-medium text-pisao-cream">
                {snapshot.order.tipoEntrega === "DOMICILIO"
                  ? "Domicilio"
                  : "Recogida"}
              </dd>
            </div>
            {snapshot.payment && (
              <>
                <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-4">
                  <dt className="text-pisao-cream-muted">Método</dt>
                  <dd className="text-right font-medium text-pisao-cream">
                    {methodLabel[snapshot.payment.metodo]}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-4">
                  <dt className="text-pisao-cream-muted">Pago</dt>
                  <dd className="font-medium text-pisao-cream">
                    {snapshot.payment.estado}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {snapshot.payment?.crypto && (
            <div className="mt-5 rounded-xl border border-pisao-gold/15 bg-pisao-carbon-soft p-4 text-xs">
              <p className="font-semibold text-pisao-cream">
                {snapshot.payment.crypto.moneda || "Cripto"}
                {snapshot.payment.crypto.network
                  ? ` · ${snapshot.payment.crypto.network}`
                  : ""}
              </p>
              {snapshot.payment.crypto.txHash && (
                <p className="mt-2 font-mono text-pisao-cream-muted">
                  {snapshot.payment.crypto.txHash}
                </p>
              )}
              <p className="mt-2 text-pisao-cream-muted">
                Confirmaciones: {snapshot.payment.crypto.confirmations}
                {snapshot.payment.crypto.requiredConfirmations !== null
                  ? ` / ${snapshot.payment.crypto.requiredConfirmations}`
                  : ""}
              </p>
              {snapshot.payment.crypto.receivedAmount &&
                snapshot.payment.crypto.moneda && (
                  <p className="mt-1 text-pisao-cream-muted">
                    Recibido: {snapshot.payment.crypto.receivedAmount}{" "}
                    {snapshot.payment.crypto.moneda}
                  </p>
                )}
              {snapshot.payment.crypto.explorerUrl && (
                <a
                  href={snapshot.payment.crypto.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-pisao-gold underline"
                >
                  Ver transacción <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          <p className="mt-5 text-xs leading-relaxed text-pisao-cream-muted">
            Esta pantalla consulta directamente el estado registrado por PISÁO.
            Funciona aunque todavía no hayamos configurado las notificaciones
            automáticas por WhatsApp.
          </p>
        </div>

        <div className="rounded-[2rem] border border-pisao-gold/12 bg-pisao-carbon-soft p-5 sm:p-6">
          <CheckCircle2 className="size-6 text-pisao-gold" />
          <h3 className="font-display mt-3 text-xl text-pisao-cream">
            Guarda tu acceso
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">
            Este dispositivo conserva el acceso automáticamente. También puedes
            copiar un enlace privado para abrir el seguimiento en otro equipo.
            Quien tenga ese enlace podrá ver el estado del pedido.
          </p>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => void copyPrivateLink()}
          >
            <Copy className="mr-2 size-4" />
            {copied ? "Enlace copiado" : "Copiar enlace privado"}
          </Button>

          <button
            type="button"
            className="mt-4 w-full text-center text-xs text-pisao-cream-muted underline hover:text-pisao-cream"
            onClick={() => {
              window.localStorage.removeItem(STORAGE_KEY);
              setToken(null);
              setSnapshot(null);
              setError(null);
            }}
          >
            Consultar otro pedido
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-200">
            {error}
          </div>
        )}
      </aside>
    </div>
  );
}
