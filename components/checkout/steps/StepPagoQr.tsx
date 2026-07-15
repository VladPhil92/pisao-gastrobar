"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { datosTransferenciaBancaria } from "@/lib/payments/qr-transferencia";
import { formatCurrency } from "@/lib/utils";

export function StepPagoQr({
  pedidoId,
  total,
  onUploaded,
}: {
  pedidoId: string;
  total: number;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subir = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("pedidoId", pedidoId);
      formData.append("comprobante", file);
      const res = await fetch("/api/pagos/qr/comprobante", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("No se pudo subir el comprobante");
      onUploaded();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al subir el comprobante",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="border-pisao-gold/20 bg-pisao-carbon-soft rounded-xl border p-6">
        <p className="text-pisao-cream-muted text-sm">Total a pagar</p>
        <p className="font-display text-pisao-gold text-2xl">
          {formatCurrency(total)}
        </p>

        <div className="bg-pisao-noche mt-4 aspect-square w-40 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG placeholder, no benefit from next/image optimization */}
          <img
            src={datosTransferenciaBancaria.qrImageUrl}
            alt="Código QR para transferencia"
            className="h-full w-full object-contain"
          />
        </div>

        <dl className="text-pisao-cream-muted mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Banco</dt>
            <dd className="text-pisao-cream">
              {datosTransferenciaBancaria.banco}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Titular</dt>
            <dd className="text-pisao-cream">
              {datosTransferenciaBancaria.titular}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Cuenta {datosTransferenciaBancaria.tipoCuenta}</dt>
            <dd className="text-pisao-cream">
              {datosTransferenciaBancaria.numeroCuenta}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>NIT</dt>
            <dd className="text-pisao-cream">
              {datosTransferenciaBancaria.nit}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <label className="text-pisao-cream-muted text-sm">
          Sube tu comprobante de pago (imagen o PDF)
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-pisao-cream-muted file:bg-pisao-gold file:text-pisao-carbon mt-1 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button variant="primary" disabled={!file || loading} onClick={subir}>
        {loading ? "Subiendo..." : "Enviar comprobante"}
      </Button>

      <p className="text-pisao-cream-muted text-xs">
        Tu pedido quedará como <strong>pendiente de verificación</strong> hasta
        que nuestro equipo confirme el pago.
      </p>
    </div>
  );
}
