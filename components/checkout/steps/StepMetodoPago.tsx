"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  KeyRound,
  Loader2,
  QrCode,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { datosTransferenciaBancaria } from "@/lib/payments/qr-transferencia";
import type { MetodoPago } from "@/lib/payments/types";

const cardPaymentsEnabled =
  process.env.NEXT_PUBLIC_CARD_PAYMENTS_ENABLED === "true";
const cryptoPaymentsEnabled =
  process.env.NEXT_PUBLIC_CRYPTO_PAYMENTS_ENABLED === "true";

const opciones: Array<{
  metodo: MetodoPago;
  titulo: string;
  descripcion: string;
  icon: typeof QrCode;
  enabled: boolean;
}> = [
  {
    metodo: "QR_TRANSFERENCIA",
    titulo: "QR · Bre-B · Bancolombia",
    descripcion: "Método disponible hoy. El pago se valida con tu comprobante.",
    icon: QrCode,
    enabled: true,
  },
  ...(cryptoPaymentsEnabled
    ? [
        {
          metodo: "CRIPTO" as const,
          titulo: "Criptomonedas",
          descripcion: "Pago digital habilitado.",
          icon: Coins,
          enabled: true,
        },
      ]
    : []),
  {
    metodo: "TARJETA",
    titulo: "Tarjeta / PSE",
    descripcion: cardPaymentsEnabled
      ? "Pago seguro mediante pasarela."
      : "Disponible en octubre. Por ahora usa QR, Bre-B o transferencia.",
    icon: CreditCard,
    enabled: cardPaymentsEnabled,
  },
];

interface PedidoCreado {
  pedido: {
    id: string;
    numero: number;
    total: string | number;
  };
}

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

export function StepMetodoPago({
  selected,
  onSelect,
  onCrearPedidoQr,
  onQrCompletado,
}: {
  selected: MetodoPago | null;
  onSelect: (metodo: MetodoPago) => void;
  onCrearPedidoQr: () => Promise<PedidoCreado | null>;
  onQrCompletado: () => void;
}) {
  const [mostrarQr, setMostrarQr] = useState(false);
  const [pedido, setPedido] = useState<{
    id: string;
    numero: number;
    total: number;
  } | null>(null);
  const [creando, setCreando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoCopiada, setFotoCopiada] = useState(false);
  const [subido, setSubido] = useState(false);
  const [notificacionAutomatica, setNotificacionAutomatica] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abrirQr = async () => {
    setMostrarQr(true);
    setError(null);
    if (pedido) return;

    setCreando(true);
    try {
      const data = await onCrearPedidoQr();
      if (!data) throw new Error("No se pudo crear el pedido");
      setPedido({
        id: data.pedido.id,
        numero: data.pedido.numero,
        total: Number(data.pedido.total),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCreando(false);
    }
  };

  const subirComprobante = async (file: File) => {
    if (!pedido) return;

    setSubiendo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pedidoId", pedido.id);
      formData.append("comprobante", file);

      const res = await fetch("/api/pagos/qr/comprobante", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as EvidenceUploadResponse;

      if (!res.ok) {
        throw new Error(payload.error || "No se pudo subir el comprobante");
      }

      const copiada = await copiarImagenAlPortapapeles(file);
      setFotoCopiada(copiada);
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

  const cerrarYContinuar = () => {
    setMostrarQr(false);
    onQrCompletado();
  };

  return (
    <div className="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        {opciones.map(({ metodo, titulo, descripcion, icon: Icon, enabled }) => (
          <button
            key={metodo}
            type="button"
            disabled={!enabled}
            onClick={() => {
              if (!enabled) return;
              if (metodo === "QR_TRANSFERENCIA") {
                void abrirQr();
              } else {
                onSelect(metodo);
              }
            }}
            className={cn(
              "relative flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors",
              !enabled &&
                "cursor-not-allowed border-white/8 bg-white/[.02] opacity-60",
              enabled &&
                selected === metodo &&
                "border-pisao-gold bg-pisao-gold/10",
              enabled &&
                selected !== metodo &&
                "border-pisao-cream-muted/20 hover:border-pisao-gold/40",
            )}
          >
            {!enabled && (
              <span className="absolute top-3 right-3 rounded-full border border-pisao-gold/15 px-2 py-1 text-[9px] font-semibold tracking-[.12em] text-pisao-gold uppercase">
                Próximamente
              </span>
            )}
            <Icon className="h-6 w-6 text-pisao-gold" />
            <span className="font-display text-lg text-pisao-cream">
              {titulo}
            </span>
            <span className="text-xs text-pisao-cream-muted">{descripcion}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-pisao-gold/10 bg-pisao-noche/60 px-4 py-3 text-xs leading-relaxed text-pisao-cream-muted">
        <strong className="text-pisao-cream">Método vigente:</strong> todos los
        pedidos se pagan actualmente mediante el QR oficial de PISÁO, Llave
        Bre-B o transferencia directa a Bancolombia.
      </div>

      <Modal
        open={mostrarQr}
        onClose={() => setMostrarQr(false)}
        title="Paga con QR, Bre-B o Bancolombia"
      >
        {creando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-pisao-cream-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creando tu pedido...
          </div>
        ) : subido ? (
          <div className="space-y-4">
            <CheckCircle2 className="h-9 w-9 text-pisao-gold" />
            <div>
              <p className="text-sm font-medium text-pisao-cream">
                Comprobante recibido.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-pisao-cream-muted">
                {notificacionAutomatica
                  ? "El sistema notificó automáticamente al equipo de pagos de PISÁO y adjuntó la evidencia disponible."
                  : "El comprobante ya quedó guardado en PISÁO. Abrimos WhatsApp con el resumen del pedido para avisar al administrador."}
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
                También copiamos la imagen al portapapeles. Si quieres que el
                administrador la reciba dentro del chat, pégala en WhatsApp
                antes de enviar.
              </p>
            )}

            <Button
              variant={notificacionAutomatica ? "primary" : "outline"}
              className="w-full"
              onClick={cerrarYContinuar}
            >
              Continuar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-pisao-noche">
              <Image
                src={datosTransferenciaBancaria.qrImageUrl}
                alt="QR oficial de PISÁO para pago por transferencia"
                fill
                sizes="384px"
                className="object-contain"
              />
            </div>

            {pedido && (
              <div className="mt-4 rounded-xl border border-pisao-gold/10 bg-pisao-noche/60 p-4">
                <p className="text-xs text-pisao-cream-muted">
                  Pedido #{pedido.numero}
                </p>
                <p className="font-display mt-1 text-2xl text-pisao-gold">
                  {formatCurrency(pedido.total)}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-2 rounded-xl border border-pisao-gold/10 bg-pisao-noche/50 p-4 text-xs">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-pisao-gold" />
                <div>
                  <p className="font-semibold text-pisao-cream">
                    {datosTransferenciaBancaria.banco}
                  </p>
                  <p className="mt-0.5 text-pisao-cream-muted">
                    {datosTransferenciaBancaria.titular}
                  </p>
                  {datosTransferenciaBancaria.numeroCuenta && (
                    <p className="mt-1 font-mono text-pisao-cream">
                      {datosTransferenciaBancaria.tipoCuenta
                        ? `${datosTransferenciaBancaria.tipoCuenta} · `
                        : ""}
                      {datosTransferenciaBancaria.numeroCuenta}
                    </p>
                  )}
                </div>
              </div>

              {datosTransferenciaBancaria.brebKey && (
                <div className="flex items-start gap-3 border-t border-pisao-gold/10 pt-3">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-pisao-gold" />
                  <div>
                    <p className="font-semibold text-pisao-cream">Llave Bre-B</p>
                    <p className="mt-0.5 font-mono text-pisao-cream">
                      {datosTransferenciaBancaria.brebKeyType
                        ? `${datosTransferenciaBancaria.brebKeyType}: `
                        : ""}
                      {datosTransferenciaBancaria.brebKey}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="text-sm text-pisao-cream-muted">
                Después de pagar, sube tu comprobante
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={!pedido || subiendo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void subirComprobante(file);
                }}
                className="mt-2 block w-full text-sm text-pisao-cream-muted file:mr-4 file:rounded-full file:border-0 file:bg-pisao-gold file:px-4 file:py-2 file:text-sm file:font-medium file:text-pisao-carbon disabled:opacity-50"
              />
            </div>

            {subiendo && (
              <p className="mt-2 flex items-center gap-2 text-xs text-pisao-cream-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando comprobante y notificando al equipo...
              </p>
            )}

            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <p className="mt-4 text-xs leading-relaxed text-pisao-cream-muted">
              El administrador valida manualmente el pago antes de confirmar el
              pedido. Tarjeta y PSE se habilitarán cuando la pasarela productiva
              esté lista.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
