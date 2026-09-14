import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut, ReceiptText, CalendarDays, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  CTG_ONE_SESSION_COOKIE,
  readCustomerSession,
} from "@/lib/auth/ctgone-federation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(value);
}

function formatMoney(value: { toString(): string }) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value.toString()));
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase("es-CO");
}

export default async function MiCuentaPage() {
  const store = await cookies();
  const session = readCustomerSession(store.get(CTG_ONE_SESSION_COOKIE)?.value);
  if (!session) redirect("/auth/ctgone/start?next=/micuenta");

  let dataAvailable = true;
  let pedidos: Array<{
    id: string;
    numero: number;
    total: { toString(): string };
    estado: string;
    createdAt: Date;
  }> = [];
  let reservas: Array<{
    id: string;
    fecha: Date;
    hora: string;
    personas: number;
    estado: string;
  }> = [];

  try {
    [pedidos, reservas] = await Promise.all([
      prisma.pedido.findMany({
        where: { clienteEmail: { equals: session.email, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, numero: true, total: true, estado: true, createdAt: true },
      }),
      prisma.reserva.findMany({
        where: { email: { equals: session.email, mode: "insensitive" } },
        orderBy: { fecha: "desc" },
        take: 12,
        select: { id: true, fecha: true, hora: true, personas: true, estado: true },
      }),
    ]);
  } catch {
    dataAvailable = false;
  }

  return (
    <main className="py-12 sm:py-16">
      <Container>
        <section className="border-pisao-gold/20 bg-pisao-carbon-soft/60 rounded-3xl border p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-pisao-gold flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Identidad verificada por CTG One
              </div>
              <h1 className="font-display text-pisao-cream mt-3 text-3xl sm:text-4xl">Mi cuenta PISÁO</h1>
              <p className="text-pisao-cream-muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
                Tu identidad se valida en CTG One. PISÁO recibe únicamente tu identificador canónico y correo verificado; no recibe tu KYC, Wallet ni permisos administrativos.
              </p>
              <p className="text-pisao-cream mt-4 text-sm">{session.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="https://ctgone.com/dashboard" target="_blank" rel="noopener noreferrer" variant="outline">
                Volver a CTG One <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button href="/auth/ctgone/signout" variant="ghost">
                Cerrar sesión <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        {!dataAvailable && (
          <div className="border-pisao-gold/15 text-pisao-cream-muted mt-8 rounded-2xl border p-5 text-sm">
            Tu identidad está activa, pero el historial transaccional no está disponible en este momento.
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="pedidos-title">
            <div className="mb-4 flex items-center gap-3">
              <ReceiptText className="text-pisao-gold h-5 w-5" aria-hidden="true" />
              <h2 id="pedidos-title" className="font-display text-pisao-cream text-2xl">Mis pedidos</h2>
            </div>
            <div className="space-y-3">
              {pedidos.length === 0 ? (
                <div className="border-pisao-gold/15 text-pisao-cream-muted rounded-2xl border p-5 text-sm">
                  No encontramos pedidos asociados a este correo.
                </div>
              ) : pedidos.map((pedido) => (
                <article key={pedido.id} className="border-pisao-gold/15 bg-pisao-carbon-soft/40 rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-pisao-cream font-semibold">Pedido #{pedido.numero}</p>
                      <p className="text-pisao-cream-muted mt-1 text-xs">{formatDate(pedido.createdAt)}</p>
                    </div>
                    <span className="text-pisao-gold text-xs font-semibold capitalize">{statusLabel(pedido.estado)}</span>
                  </div>
                  <p className="text-pisao-cream mt-4 text-lg font-semibold">{formatMoney(pedido.total)}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="reservas-title">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDays className="text-pisao-gold h-5 w-5" aria-hidden="true" />
              <h2 id="reservas-title" className="font-display text-pisao-cream text-2xl">Mis reservas</h2>
            </div>
            <div className="space-y-3">
              {reservas.length === 0 ? (
                <div className="border-pisao-gold/15 text-pisao-cream-muted rounded-2xl border p-5 text-sm">
                  No encontramos reservas asociadas a este correo.
                </div>
              ) : reservas.map((reserva) => (
                <article key={reserva.id} className="border-pisao-gold/15 bg-pisao-carbon-soft/40 rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-pisao-cream font-semibold">{formatDate(reserva.fecha)} · {reserva.hora}</p>
                      <p className="text-pisao-cream-muted mt-1 text-xs">{reserva.personas} {reserva.personas === 1 ? "persona" : "personas"}</p>
                    </div>
                    <span className="text-pisao-gold text-xs font-semibold capitalize">{statusLabel(reserva.estado)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
