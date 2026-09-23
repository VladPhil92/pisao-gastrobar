"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, CheckCircle2, Copy, Loader2 } from "lucide-react";
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

  const subirComprobante = async (file: File) => {
    if (!destino) return;

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
              ? "PISÁO recibió tu evidencia y notificó automáticamente al administrador con los datos del pedido y del pago."
              : "Tu evidencia quedó guardada. También abrimos WhatsApp con el resumen del pedido para que el administrador pueda validarlo."}
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
          Envía el equivalente del total en la criptomoneda elegida. La
          validación del pago se realiza con el comprobante que subas.
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

          <div>
            <label className="text-sm text-pisao-cream-muted">
              3. Después de pagar, sube tu comprobante
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              disabled={subiendo}
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
