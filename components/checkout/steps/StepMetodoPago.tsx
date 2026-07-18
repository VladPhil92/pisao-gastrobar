"use client";

import { useState } from "react";
import Image from "next/image";
import { QrCode, Coins, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { DESCUENTO_CRIPTO_PORCENTAJE } from "@/lib/payments/crypto";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { datosTransferenciaBancaria } from "@/lib/payments/qr-transferencia";
import { whatsappLink } from "@/lib/site-config";
import { useCartStore } from "@/lib/cart/store";
import type { CartItem } from "@/lib/cart/types";
import type { MetodoPago } from "@/lib/payments/types";

const opciones: {
  metodo: MetodoPago;
  titulo: string;
  descripcion: string;
  icon: typeof QrCode;
}[] = [
  {
    metodo: "QR_TRANSFERENCIA",
    titulo: "QR / Transferencia",
    descripcion: "Paga por transferencia bancaria y sube tu comprobante.",
    icon: QrCode,
  },
  {
    metodo: "CRIPTO",
    titulo: "Criptomonedas",
    descripcion: `${DESCUENTO_CRIPTO_PORCENTAJE}% de descuento automático.`,
    icon: Coins,
  },
  {
    metodo: "TARJETA",
    titulo: "Tarjeta crédito/débito",
    descripcion: "Pago seguro con pasarela colombiana.",
    icon: CreditCard,
  },
];

interface PedidoCreado {
  pedido: {
    id: string;
    numero: number;
    total: string | number;
    clienteNombre?: string;
    tipoEntrega?: string;
    direccionEntrega?: string | null;
  };
}

function construirMensajeWhatsApp(
  pedido: {
    numero: number;
    total: number;
    clienteNombre?: string;
    tipoEntrega?: string;
    direccionEntrega?: string | null;
  },
  items: CartItem[],
  fotoCopiada: boolean,
) {
  const lineasProductos = items
    .map((item) => `- ${item.cantidad}x ${item.nombre} (${formatCurrency(item.precio * item.cantidad)})`)
    .join("\n");

  const entrega =
    pedido.tipoEntrega === "DOMICILIO"
      ? `Domicilio a: ${pedido.direccionEntrega ?? "(sin especificar)"}`
      : "Recogida en el local";

  const notaComprobante = fotoCopiada
    ? "Ya copié la foto del comprobante a mi portapapeles, la pego aquí abajo 👇"
    : "Adjunto la foto del comprobante de pago.";

  return [
    `Hola PISÁO 👋, quiero confirmar mi pago por transferencia.`,
    ``,
    `Pedido #${pedido.numero}${pedido.clienteNombre ? ` · ${pedido.clienteNombre}` : ""}`,
    lineasProductos,
    `Total: ${formatCurrency(pedido.total)}`,
    entrega,
    ``,
    notaComprobante,
  ].join("\n");
}

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
  /** Crea el pedido para el método QR sin avanzar de paso todavía. */
  onCrearPedidoQr: () => Promise<PedidoCreado | null>;
  /** Se llama cuando ya se subió el comprobante y se puede pasar a confirmación. */
  onQrCompletado: () => void;
}) {
  const [mostrarQr, setMostrarQr] = useState(false);
  const [pedido, setPedido] = useState<{
    id: string;
    numero: number;
    total: number;
    clienteNombre?: string;
    tipoEntrega?: string;
    direccionEntrega?: string | null;
  } | null>(null);
  const [itemsPedido, setItemsPedido] = useState<CartItem[]>([]);
  const [creando, setCreando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoCopiada, setFotoCopiada] = useState(false);
  const [subido, setSubido] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrirQr = async () => {
    setMostrarQr(true);
    setError(null);
    if (pedido) return;
    // Se toma una foto del carrito antes de crear el pedido, porque
    // crearPedido() lo vacía inmediatamente después de crear la orden.
    setItemsPedido(useCartStore.getState().items);
    setCreando(true);
    try {
      const data = await onCrearPedidoQr();
      if (!data) throw new Error("No se pudo crear el pedido");
      setPedido({
        id: data.pedido.id,
        numero: data.pedido.numero,
        total: Number(data.pedido.total),
        clienteNombre: data.pedido.clienteNombre,
        tipoEntrega: data.pedido.tipoEntrega,
        direccionEntrega: data.pedido.direccionEntrega,
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
      if (!res.ok) throw new Error("No se pudo subir el comprobante");

      const copiada = await copiarImagenAlPortapapeles(file);
      setFotoCopiada(copiada);

      const mensaje = construirMensajeWhatsApp(pedido, itemsPedido, copiada);
      window.open(whatsappLink(mensaje), "_blank", "noopener,noreferrer");

      setSubido(true);
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
    <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
      {opciones.map(({ metodo, titulo, descripcion, icon: Icon }) => (
        <button
          key={metodo}
          type="button"
          onClick={() =>
            metodo === "QR_TRANSFERENCIA" ? abrirQr() : onSelect(metodo)
          }
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors",
            selected === metodo
              ? "border-pisao-gold bg-pisao-gold/10"
              : "border-pisao-cream-muted/20 hover:border-pisao-gold/40",
          )}
        >
          <Icon className="text-pisao-gold h-6 w-6" />
          <span className="font-display text-pisao-cream text-lg">
            {titulo}
          </span>
          <span className="text-pisao-cream-muted text-xs">{descripcion}</span>
        </button>
      ))}

      <Modal
        open={mostrarQr}
        onClose={() => setMostrarQr(false)}
        title="Paga con QR / Transferencia"
      >
        {creando ? (
          <div className="text-pisao-cream-muted flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Creando tu pedido...
          </div>
        ) : subido ? (
          <div className="space-y-3">
            <CheckCircle2 className="text-pisao-gold h-8 w-8" />
            <p className="text-pisao-cream text-sm font-medium">
              Abrimos WhatsApp con el resumen de tu pedido.
            </p>
            <p className="text-pisao-cream-muted text-sm">
              {fotoCopiada
                ? "Ya copiamos la foto de tu comprobante: en la ventana de WhatsApp solo pega (Ctrl+V o mantén presionado y \"Pegar\") y presiona enviar."
                : "No pudimos copiar la imagen automáticamente: adjunta la foto del comprobante manualmente en WhatsApp y presiona enviar."}
            </p>
            <Button variant="primary" className="w-full" onClick={cerrarYContinuar}>
              Ya envié el mensaje, continuar
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-pisao-noche relative aspect-[9/16] w-full overflow-hidden rounded-lg">
              <Image
                src="/QR/QRTransferencia.jpeg"
                alt="Código QR para pagar por transferencia"
                fill
                sizes="384px"
                className="object-contain"
              />
            </div>

            {pedido && (
              <p className="text-pisao-cream-muted mt-3 text-xs">
                Pedido #{pedido.numero} · Total {formatCurrency(pedido.total)}
              </p>
            )}

            <div className="mt-4">
              <label className="text-pisao-cream-muted text-sm">
                Sube tu comprobante de pago (imagen o PDF)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                disabled={!pedido || subiendo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirComprobante(file);
                }}
                className="text-pisao-cream-muted file:bg-pisao-gold file:text-pisao-carbon mt-1 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium disabled:opacity-50"
              />
            </div>

            {subiendo && (
              <p className="text-pisao-cream-muted mt-2 flex items-center gap-2 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Subiendo comprobante y preparando WhatsApp...
              </p>
            )}

            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <p className="text-pisao-cream-muted mt-4 text-xs">
              Al subir tu comprobante abriremos WhatsApp con el resumen de tu
              pedido para el negocio ({datosTransferenciaBancaria.titular}) y
              copiaremos la foto a tu portapapeles para que solo la pegues y
              envíes.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
