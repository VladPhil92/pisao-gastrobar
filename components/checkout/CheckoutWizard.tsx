"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckoutSteps, type CheckoutStepId } from "./CheckoutSteps";
import { StepEntrega } from "./steps/StepEntrega";
import { StepMetodoPago } from "./steps/StepMetodoPago";
import { StepPagoQr } from "./steps/StepPagoQr";
import { StepPagoCripto } from "./steps/StepPagoCripto";
import { StepPagoTarjeta } from "./steps/StepPagoTarjeta";
import { StepConfirmacion } from "./steps/StepConfirmacion";
import { CHECKOUT_INICIAL, type CheckoutState } from "./types";
import { useCartStore, cartSubtotal } from "@/lib/cart/store";
import { formatCurrency } from "@/lib/utils";
import type { MetodoPago } from "@/lib/payments/types";
import type { CrearCargoCriptoResult } from "@/lib/payments/crypto";
import type { CrearLinkPagoResult } from "@/lib/payments/types";

interface PedidoCreadoResponse {
  pedido: { id: string; numero: number; total: string | number };
  cripto?: CrearCargoCriptoResult;
  tarjeta?: CrearLinkPagoResult;
}

export function CheckoutWizard() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const subtotal = cartSubtotal(items);

  const [step, setStep] = useState<CheckoutStepId>("entrega");
  const [state, setState] = useState<CheckoutState>(CHECKOUT_INICIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedidoData, setPedidoData] = useState<PedidoCreadoResponse | null>(
    null,
  );

  const crearPedido = async (metodoPago: MetodoPago) => {
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
      setState((s) => ({ ...s, metodoPago, pedidoId: data.pedido.id }));
      setStep("pago");
      clearCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step !== "confirmacion") {
    return (
      <p className="text-pisao-cream-muted text-sm">
        Tu carrito está vacío.{" "}
        <Link href="/menu" className="text-pisao-gold underline">
          Ve al menú
        </Link>{" "}
        para agregar productos.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <CheckoutSteps current={step} />

      <div className="border-pisao-gold/10 bg-pisao-carbon-soft flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
        <span className="text-pisao-cream-muted">Subtotal del carrito</span>
        <span className="text-pisao-cream font-semibold">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
        />
      )}

      {step === "pago" &&
        pedidoData &&
        state.metodoPago === "QR_TRANSFERENCIA" && (
          <StepPagoQr
            pedidoId={pedidoData.pedido.id}
            total={Number(pedidoData.pedido.total)}
            onUploaded={() => setStep("confirmacion")}
          />
        )}

      {step === "pago" &&
        pedidoData?.cripto &&
        state.metodoPago === "CRIPTO" && (
          <StepPagoCripto
            cargo={pedidoData.cripto}
            total={Number(pedidoData.pedido.total)}
            descuento={subtotal - Number(pedidoData.pedido.total)}
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
  );
}
