"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { CheckoutSteps, type CheckoutStepId } from "./CheckoutSteps";
import { StepEntrega } from "./steps/StepEntrega";
import { StepMetodoPago } from "./steps/StepMetodoPago";
import { StepPagoCripto } from "./steps/StepPagoCripto";
import { StepPagoTarjeta } from "./steps/StepPagoTarjeta";
import { StepConfirmacion } from "./steps/StepConfirmacion";
import { CHECKOUT_INICIAL, type CheckoutState } from "./types";
import { useCartStore, cartSubtotal } from "@/lib/cart/store";
import { getTableMoments } from "@/lib/cart/experience";
import type { CartItem } from "@/lib/cart/types";
import { formatCurrency } from "@/lib/utils";
import type { MetodoPago } from "@/lib/payments/types";
import type { CrearCargoCriptoResult } from "@/lib/payments/crypto";
import type { CrearLinkPagoResult } from "@/lib/payments/types";
import { MenuImageFallback } from "@/components/menu/MenuImageFallback";
import { VisualOrderRail } from "@/components/cart/VisualOrderRail";

interface PedidoCreadoResponse {
  pedido: { id: string; numero: number; total: string | number };
  cripto?: CrearCargoCriptoResult;
  tarjeta?: CrearLinkPagoResult;
}

export function CheckoutWizard() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const [step, setStep] = useState<CheckoutStepId>("entrega");
  const [state, setState] = useState<CheckoutState>(CHECKOUT_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedidoData, setPedidoData] = useState<PedidoCreadoResponse | null>(null);
  const [orderedItems, setOrderedItems] = useState<CartItem[] | null>(null);

  const summaryItems = orderedItems ?? items;
  const subtotal = cartSubtotal(summaryItems);
  const moments = useMemo(() => getTableMoments(summaryItems), [summaryItems]);
  const featuredItem = summaryItems.find((item) => item.imagenUrl) ?? summaryItems[0];

  const crearPedido = async (metodoPago: MetodoPago, avanzarAPago = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente: {
            nombre: state.cliente.nombre,
            telefono: state.cliente.telefono,
            email: state.cliente.email || undefined,
          },
          tipoEntrega: state.tipoEntrega,
          direccionEntrega: state.cliente.direccionEntrega || undefined,
          notas: state.cliente.notas || undefined,
          items,
          metodoPago,
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear el pedido");

      const data: PedidoCreadoResponse = await res.json();
      setPedidoData(data);
      setOrderedItems(items);
      setState((s) => ({ ...s, metodoPago, pedidoId: data.pedido.id }));
      if (avanzarAPago) setStep("pago");
      clearCart();
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !pedidoData) {
    return (
      <div className="border-pisao-gold/15 bg-pisao-noche rounded-[2rem] border px-6 py-14 text-center sm:px-10">
        <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.22em] uppercase">Tu mesa está vacía</p>
        <h2 className="font-display text-pisao-cream mt-3 text-3xl">Primero elige qué quieres comer.</h2>
        <p className="text-pisao-cream-muted mx-auto mt-3 max-w-md text-sm leading-relaxed">
          La experiencia de pago comienza cuando ya tienes una mesa armada. Vuelve a la carta y agrega tus platos.
        </p>
        <Link
          href="/menu"
          className="bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition"
        >
          <ArrowLeft className="size-4" /> Volver a la carta
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-10">
      <aside className="lg:sticky lg:top-24">
        <div className="border-pisao-gold/15 bg-pisao-noche overflow-hidden rounded-[2rem] border">
          <div className="relative aspect-[4/3] overflow-hidden bg-pisao-carbon-soft">
            {featuredItem?.imagenUrl ? (
              <Image
                src={featuredItem.imagenUrl}
                alt={featuredItem.nombre}
                fill
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-cover"
              />
            ) : featuredItem ? (
              <MenuImageFallback
                name={featuredItem.nombre}
                categorySlug={featuredItem.categoriaSlug}
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute right-0 bottom-0 left-0 p-5">
              <div className="flex items-center gap-2 text-pisao-gold">
                <Sparkles className="size-4" />
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase">Resumen visual</span>
              </div>
              <p className="font-display text-pisao-cream mt-2 text-2xl">Tu mesa antes de confirmar.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <VisualOrderRail items={summaryItems} maxItems={6} />

            <div className="mt-5 grid grid-cols-2 gap-2">
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] ${
                    moment.complete
                      ? "border-pisao-gold/20 bg-pisao-gold/5 text-pisao-cream"
                      : "border-white/8 text-pisao-cream-muted"
                  }`}
                >
                  <span
                    className={`flex size-4 items-center justify-center rounded-full ${
                      moment.complete ? "bg-pisao-gold text-pisao-carbon" : "border border-pisao-gold/20"
                    }`}
                  >
                    {moment.complete && <Check className="size-2.5" />}
                  </span>
                  {moment.label}
                </div>
              ))}
            </div>

            <div className="border-pisao-gold/10 mt-5 flex items-end justify-between border-t pt-5">
              <div>
                <p className="text-pisao-cream-muted text-[10px] tracking-[0.14em] uppercase">Subtotal de la mesa</p>
                <p className="font-display text-pisao-gold mt-1 text-3xl">{formatCurrency(subtotal)}</p>
              </div>
              {!pedidoData && (
                <Link href="/menu" className="text-pisao-gold text-xs font-semibold hover:underline">
                  Editar mesa
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="space-y-8">
        <CheckoutSteps current={step} />

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-[2rem] border p-5 sm:p-7">
          {step === "entrega" && (
            <StepEntrega
              cliente={state.cliente}
              tipoEntrega={state.tipoEntrega}
              onNext={(cliente, tipoEntrega) => {
                setState((s) => ({ ...s, cliente, tipoEntrega }));
                setStep("metodo");
              }}
            />
          )}

          {step === "metodo" && (
            <StepMetodoPago
              selected={state.metodoPago}
              onSelect={(metodo) => {
                if (!loading) crearPedido(metodo);
              }}
              onCrearPedidoQr={() => crearPedido("QR_TRANSFERENCIA", false)}
              onQrCompletado={() => setStep("confirmacion")}
            />
          )}

          {step === "pago" &&
            pedidoData?.cripto &&
            state.metodoPago === "CRIPTO" && (
              <StepPagoCripto
                cargo={pedidoData.cripto}
                total={Number(pedidoData.pedido.total)}
                descuento={Math.max(0, subtotal - Number(pedidoData.pedido.total))}
                onContinuar={() => setStep("confirmacion")}
              />
            )}

          {step === "pago" &&
            pedidoData?.tarjeta &&
            state.metodoPago === "TARJETA" && (
              <StepPagoTarjeta
                resultado={pedidoData.tarjeta}
                total={Number(pedidoData.pedido.total)}
                onContinuar={() => setStep("confirmacion")}
              />
            )}

          {step === "confirmacion" && pedidoData && state.metodoPago && (
            <StepConfirmacion
              numeroPedido={pedidoData.pedido.numero}
              metodoPago={state.metodoPago}
            />
          )}
        </div>
      </div>
    </div>
  );
}
