import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink, LogOut, ReceiptText, CalendarDays, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/visual/VisualMotion";
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
    <main>
      <section className="pisao-grain relative overflow-hidden border-b border-pisao-gold/10 bg-pisao-noche">
        <Image src="/gallery/terraza-atardecer.jpg" alt="Terraza PISÁO" fill priority sizes="100vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.97)_0%,rgba(17,17,17,.85)_52%,rgba(17,17,17,.45)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,17,.95)_100%)]" />
        <div className="pisao-ambient-glow absolute right-[10%] top-[12%] size-[30rem] rounded-full bg-pisao-gold/12 blur-[100px]" />

        <Container className="relative grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_.8fr] lg:items-center lg:py-24">
          <div>
            <div className="flex items-center gap-2 text-pisao-gold">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <p className="text-[10px] font-semibold tracking-[.2em] uppercase">Identidad verificada por CTG One</p>
            </div>
            <h1 className="font-display mt-4 text-5xl leading-[.94] text-pisao-cream sm:text-7xl">Tu relación con PISÁO,<span className="block text-pisao-gold">en un solo lugar.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-pisao-cream-muted sm:text-base">Consulta pedidos y reservas asociados a tu correo verificado. PISÁO no recibe KYC, Wallet ni permisos administrativos de CTG One.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="https://ctgone.com/dashboard" target="_blank" rel="noopener noreferrer" variant="outline">Volver a CTG One <ExternalLink className="size-4" aria-hidden="true" /></Button>
              <Button href="/auth/ctgone/signout" variant="ghost">Cerrar sesión <LogOut className="size-4" aria-hidden="true" /></Button>
            </div>
          </div>

          <div className="relative hidden min-h-[360px] lg:block">
            <div className="pisao-float-slow pisao-image-lift absolute right-0 top-0 h-[82%] w-[70%] overflow-hidden rounded-[2.25rem] border border-pisao-gold/15 shadow-2xl">
              <Image src="/gallery/patacon_callejero.jpg" alt="Patacón Callejero PISÁO" fill sizes="35vw" className="object-cover" />
            </div>
            <div className="absolute bottom-0 left-[2%] max-w-[270px] rounded-[1.75rem] border border-pisao-gold/20 bg-pisao-carbon/90 p-5 backdrop-blur-xl">
              <Sparkles className="size-4 text-pisao-gold" />
              <p className="mt-3 text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Sesión PISÁO</p>
              <p className="mt-2 break-all text-sm font-semibold text-pisao-cream">{session.email}</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
        <div className="pisao-ambient-glow absolute -left-40 top-28 size-[32rem] rounded-full bg-pisao-gold/7 blur-[120px]" />
        <Container className="relative">
          {!dataAvailable && (
            <div className="mb-8 rounded-2xl border border-pisao-gold/15 bg-pisao-noche p-5 text-sm text-pisao-cream-muted">Tu identidad está activa, pero el historial transaccional no está disponible en este momento.</div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            <Reveal>
              <section aria-labelledby="pedidos-title" className="h-full rounded-[2.25rem] border border-pisao-gold/12 bg-pisao-noche/70 p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-pisao-gold/10 text-pisao-gold"><ReceiptText className="size-5" aria-hidden="true" /></span><div><p className="text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Historial</p><h2 id="pedidos-title" className="font-display text-2xl text-pisao-cream">Mis pedidos</h2></div></div>
                  <span className="rounded-full border border-pisao-gold/15 px-3 py-1.5 text-[10px] font-semibold text-pisao-cream-muted">{pedidos.length}</span>
                </div>
                <div className="space-y-3">
                  {pedidos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-pisao-gold/15 p-6 text-sm text-pisao-cream-muted">No encontramos pedidos asociados a este correo.</div>
                  ) : pedidos.map((pedido) => (
                    <article key={pedido.id} className="group rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-5 transition hover:border-pisao-gold/30">
                      <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-pisao-cream">Pedido #{pedido.numero}</p><p className="mt-1 text-xs text-pisao-cream-muted">{formatDate(pedido.createdAt)}</p></div><span className="rounded-full bg-pisao-gold/10 px-3 py-1.5 text-[10px] font-semibold capitalize text-pisao-gold">{statusLabel(pedido.estado)}</span></div>
                      <p className="font-display mt-4 text-2xl text-pisao-gold">{formatMoney(pedido.total)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal delay={100}>
              <section aria-labelledby="reservas-title" className="h-full rounded-[2.25rem] border border-pisao-gold/12 bg-pisao-noche/70 p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-pisao-gold/10 text-pisao-gold"><CalendarDays className="size-5" aria-hidden="true" /></span><div><p className="text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Terraza</p><h2 id="reservas-title" className="font-display text-2xl text-pisao-cream">Mis reservas</h2></div></div>
                  <span className="rounded-full border border-pisao-gold/15 px-3 py-1.5 text-[10px] font-semibold text-pisao-cream-muted">{reservas.length}</span>
                </div>
                <div className="space-y-3">
                  {reservas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-pisao-gold/15 p-6 text-sm text-pisao-cream-muted">No encontramos reservas asociadas a este correo.</div>
                  ) : reservas.map((reserva) => (
                    <article key={reserva.id} className="group rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-5 transition hover:border-pisao-gold/30">
                      <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-pisao-cream">{formatDate(reserva.fecha)} · {reserva.hora}</p><p className="mt-1 text-xs text-pisao-cream-muted">{reserva.personas} {reserva.personas === 1 ? "persona" : "personas"}</p></div><span className="rounded-full bg-pisao-gold/10 px-3 py-1.5 text-[10px] font-semibold capitalize text-pisao-gold">{statusLabel(reserva.estado)}</span></div>
                    </article>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>
        </Container>
      </section>
    </main>
  );
}
