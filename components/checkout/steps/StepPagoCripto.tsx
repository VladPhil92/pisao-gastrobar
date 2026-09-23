"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  CrearCargoCriptoResult,
  CriptoMoneda,
} from "@/lib/payments/crypto";

type EvidenceUploadResponse = {
  ok?: boolean;
  error?: string;
  adminNotification?: "automatic" | "manual";
  notificationProvider?: "whatsapp_cloud" | "webhook" | "click_to_chat";
  whatsappUrl?: string;
};

type TxVerificationResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  retryable?: boolean;
  transaction?: {
    status: "OBSERVED" | "CONFIRMED";
    moneda: CriptoMoneda;
    red: string;
    txHash: string;
    amount: string;
    expectedAmount?: string | null;
    minimumAcceptedAmount?: string | null;
    amountSufficient?: boolean | null;
    quoteAvailable?: boolean;
    confirmations: number;
    requiredConfirmations: number;
    explorerUrl: string;
  };
};

async function copiarImagenAlPortapapeles(file: File): Promise<boolean> {
  try {
    if (!file.type.startsWith("image/")) return false;
    if (!navigator.clipboard || !("write" in navigator.clipboard)) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ [file.type]: file }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function StepPagoCripto({
  cargo,
  pedidoId,
  pedidoNumero,
  total,
  descuento,
  onContinuar,
}: {
  cargo: CrearCargoCriptoResult;
  pedidoId: string;
  pedidoNumero: number;
  total: number;
  descuento: number;
  onContinuar: () => void;
}) {
  const [moneda, setMoneda] = useState<CriptoMoneda | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [verificandoTx, setVerificandoTx] = useState(false);
  const [txVerificada, setTxVerificada] = useState(false);
  const [txInfo, setTxInfo] =
    useState<TxVerificationResponse["transaction"]>(undefined);
  const [subiendo, setSubiendo] = useState(false);
  const [subido, setSubido] = useState(false);
  const [fotoCopiada, setFotoCopiada] = useState(false);
  const [notificacionAutomatica, setNotificacionAutomatica] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const destino =
    cargo.opciones.find((item) => item.moneda === moneda) ?? null;

  const copiarDireccion = async () => {
    if (!destino) return;
    try {
      await navigator.clipboard.writeText(destino.direccion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setError(
        "No fue posible copiar la dirección. Puedes seleccionarla manualmente.",
      );
    }
  };

  const verificarTransaccion = async () => {
    if (!destino || !txHash.trim()) return;

    setVerificandoTx(true);
    setTxVerificada(false);
    setTxInfo(undefined);
    setError(null);

    try {
      const res = await fetch("/api/pagos/cripto/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId,
          criptoMoneda: destino.moneda,
          txHash: txHash.trim(),
        }),
      });
      const payload = (await res.json()) as TxVerificationResponse;

      if (!res.ok || !payload.transaction) {
        throw new Error(
          payload.error || "No se pudo verificar la transacción on-chain",
        );
      }

      setTxHash(payload.transaction.txHash);
      setTxInfo(payload.transaction);
      setTxVerificada(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo verificar la transacción on-chain",
      );
    } finally {
      setVerificandoTx(false);
    }
  };

  const subirComprobante = async (file: File) => {
    if (!destino || !txVerificada) return;

    setSubiendo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pedidoId", pedidoId);
      formData.append("criptoMoneda", destino.moneda);
      formData.append("comprobante", file);

      const res = await fetch("/api/pagos/comprobante", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as EvidenceUploadResponse;

      if (!res.ok) {
        throw new Error(payload.error || "No se pudo subir el comprobante");
      }

      const imagenCopiada = await copiarImagenAlPortapapeles(file);
      setFotoCopiada(imagenCopiada);
      setNotificacionAutomatica(payload.adminNotification === "automatic");
      setWhatsappUrl(payload.whatsappUrl ?? null);
      setSubido(true);

      if (
        payload.adminNotification !== "automatic" &&
        payload.whatsappUrl
      ) {
        window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al subir el comprobante",
      );
    } finally {
      setSubiendo(false);
    }
  };

  if (subido) {
    return (
      <div className="max-w-lg space-y-5">
        <CheckCircle2 className="h-10 w-10 text-pisao-gold" />
        <div>
          <h2 className="font-display text-2xl text-pisao-cream">
            Comprobante recibido
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-pisao-cream-muted">
            {notificacionAutomatica
              ? "PISÁO recibió tu evidencia, vinculó la transacción on-chain y notificó automáticamente al administrador con los datos del pedido y del pago."
              : "Tu evidencia y la transacción on-chain quedaron vinculadas al pedido. También abrimos WhatsApp con el resumen para que el administrador pueda validarlo."}
          </p>
        </div>

        {!notificacionAutomatica && whatsappUrl && (
          <Button
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            variant="primary"
            className="w-full"
          >
            Enviar aviso a WhatsApp
          </Button>
        )}

        {!notificacionAutomatica && fotoCopiada && (
          <p className="text-xs leading-relaxed text-pisao-cream-muted">
            La imagen del comprobante también se copió al portapapeles. Puedes
            pegarla directamente en el chat de WhatsApp.
          </p>
        )}

        <Button
          variant={notificacionAutomatica ? "primary" : "outline"}
          className="w-full"
          onClick={onContinuar}
        >
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-pisao-gold/20 bg-pisao-carbon-soft p-6">
        {descuento > 0 && (
          <p className="mb-2 inline-block rounded-full bg-pisao-gold/15 px-3 py-1 text-xs font-medium text-pisao-gold">
            Descuento cripto aplicado: -{formatCurrency(descuento)}
          </p>
        )}
        <p className="text-sm text-pisao-cream-muted">
          Pedido #{pedidoNumero} · total a pagar
        </p>
        <p className="font-display text-2xl text-pisao-gold">
          {formatCurrency(total)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">
          Envía el equivalente del total en la criptomoneda elegida. PISÁO
          comprobará que el TxID/TxHash realmente llegue a la wallet correcta
          antes de recibir el comprobante.
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-pisao-cream">
          1. Elige la criptomoneda
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cargo.opciones.map((opcion) => (
            <button
              key={opcion.moneda}
              type="button"
              onClick={() => {
                setMoneda(opcion.moneda);
                setCopiado(false);
                setTxHash("");
                setTxVerificada(false);
                setTxInfo(undefined);
                setError(null);
              }}
              className={cn(
                "rounded-xl border px-4 py-4 text-left transition-colors",
                moneda === opcion.moneda
                  ? "border-pisao-gold bg-pisao-gold/10"
                  : "border-pisao-cream-muted/20 hover:border-pisao-gold/40",
              )}
            >
              <span className="font-display text-lg text-pisao-cream">
                {opcion.moneda}
              </span>
              <span className="mt-1 block text-[10px] leading-snug text-pisao-cream-muted">
                {opcion.red}
              </span>
            </button>
          ))}
        </div>
      </div>

      {destino && (
        <div className="space-y-4 rounded-xl border border-pisao-gold/15 bg-pisao-noche/60 p-5">
          <div>
            <p className="text-sm font-medium text-pisao-cream">
              2. Paga por {destino.moneda}
            </p>
            <p className="mt-1 text-xs text-pisao-cream-muted">
              Red obligatoria:{" "}
              <strong className="text-pisao-cream">{destino.red}</strong>
            </p>
            {destino.quote ? (
              <div className="mt-3 rounded-xl border border-pisao-gold/20 bg-pisao-gold/5 p-3">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-pisao-gold uppercase">
                  Monto cotizado para este pedido
                </p>
                <p className="font-display mt-1 text-xl text-pisao-cream">
                  {destino.quote.amount} {destino.moneda}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-pisao-cream-muted">
                  Cotización fijada al crear el pedido. El sistema comparará el
                  valor recibido on-chain con este monto antes de permitir la
                  aprobación administrativa.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-amber-300">
                No fue posible fijar una cotización automática. El administrador
                deberá validar manualmente el equivalente recibido.
              </p>
            )}
          </div>

          <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl bg-white p-3">
            <Image
              src={destino.qrImageUrl}
              alt={`QR de recepción ${destino.moneda} en ${destino.red}`}
              width={296}
              height={296}
              className="h-auto w-full"
              priority
            />
          </div>

          <div>
            <p className="text-xs text-pisao-cream-muted">
              Dirección de recepción
            </p>
            <div className="mt-2 flex items-start gap-2">
              <code className="min-w-0 flex-1 rounded-lg bg-pisao-carbon-soft px-3 py-3 text-xs break-all text-pisao-cream">
                {destino.direccion}
              </code>
              <button
                type="button"
                onClick={() => void copiarDireccion()}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-pisao-gold/30 px-3 py-3 text-xs text-pisao-gold hover:bg-pisao-gold/10"
                aria-label="Copiar dirección"
              >
                {copiado ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-pisao-cream-muted">
            Verifica moneda y red antes de enviar. No envíes NFT. Los fondos
            enviados por una red distinta pueden perderse y no podrán validarse
            como pago del pedido.
          </div>

          <div className="rounded-xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4">
            <label
              htmlFor="crypto-tx-hash"
              className="text-sm font-medium text-pisao-cream"
            >
              3. Pega el TxID / TxHash de la transferencia
            </label>
            <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
              Lo encuentras en el detalle del retiro o transferencia de tu
              wallet o exchange. El sistema comprobará red, activo y dirección
              receptora.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                id="crypto-tx-hash"
                type="text"
                value={txHash}
                disabled={verificandoTx}
                onChange={(e) => {
                  setTxHash(e.target.value);
                  setTxVerificada(false);
                  setTxInfo(undefined);
                  setError(null);
                }}
                placeholder={destino.moneda === "BTC" ? "TxID de 64 caracteres" : "0x..."}
                className="min-w-0 flex-1 rounded-lg border border-pisao-cream-muted/20 bg-pisao-noche px-3 py-3 font-mono text-xs text-pisao-cream outline-none focus:border-pisao-gold"
              />
              <button
                type="button"
                disabled={!txHash.trim() || verificandoTx}
                onClick={() => void verificarTransaccion()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-pisao-gold px-4 py-3 text-xs font-bold text-pisao-carbon disabled:opacity-50"
              >
                {verificandoTx ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Verificar
              </button>
            </div>

            {txVerificada && txInfo && (
              <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs leading-relaxed text-pisao-cream-muted">
                <p className="flex items-center gap-2 font-semibold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Transacción encontrada hacia la wallet de PISÁO
                </p>
                <p className="mt-2">
                  Recibido on-chain:{" "}
                  <strong className="text-pisao-cream">
                    {txInfo.amount} {txInfo.moneda}
                  </strong>
                </p>
                {txInfo.expectedAmount && (
                  <p>
                    Monto esperado:{" "}
                    <strong className="text-pisao-cream">
                      {txInfo.expectedAmount} {txInfo.moneda}
                    </strong>
                    {txInfo.amountSufficient === true
                      ? " · monto suficiente"
                      : ""}
                  </p>
                )}
                <p>
                  Confirmaciones: {txInfo.confirmations} /{" "}
                  {txInfo.requiredConfirmations}
                  {txInfo.status === "OBSERVED"
                    ? " · visible en la red, aún confirmándose"
                    : " · confirmación mínima alcanzada"}
                </p>
                {txInfo.status === "OBSERVED" && (
                  <p className="mt-1 text-pisao-cream-muted">
                    No necesitas volver a verificar manualmente: PISÁO seguirá
                    consultando la blockchain y avisará al administrador cuando
                    alcance el mínimo de confirmaciones.
                  </p>
                )}
                <a
                  href={txInfo.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-pisao-gold underline"
                >
                  Ver en explorador <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-pisao-cream-muted">
              4. Sube tu comprobante
            </label>
            <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
              El comprobante se habilita cuando el TxID/TxHash haya sido
              comprobado contra la blockchain.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              disabled={!txVerificada || subiendo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subirComprobante(file);
              }}
              className="mt-2 block w-full text-sm text-pisao-cream-muted file:mr-4 file:rounded-full file:border-0 file:bg-pisao-gold file:px-4 file:py-2 file:text-sm file:font-medium file:text-pisao-carbon disabled:opacity-50"
            />
          </div>

          {subiendo && (
            <p className="flex items-center gap-2 text-xs text-pisao-cream-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando comprobante y notificando al administrador...
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {!destino && (
        <p className="text-xs text-pisao-cream-muted">
          Selecciona BNB, USDT, ETH o BTC para mostrar el QR y la dirección
          correctos.
        </p>
      )}
    </div>
  );
}
