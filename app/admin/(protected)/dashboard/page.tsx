import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getKevControlPlaneSnapshot } from "@/lib/governance/kev-control-plane";
import { prisma } from "@/lib/prisma";
import { paymentReviewSlaMinutes } from "@/lib/notifications/payment-ops";
import { formatCurrency } from "@/lib/utils";

function bogotaDayStart(daysAgo = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() - daysAgo * 86_400_000));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00-05:00`);
}

async function getCommandCenter() {
  const today = bogotaDayStart();
  const sevenDaysAgo = bogotaDayStart(6);
  const paymentSlaMinutes = paymentReviewSlaMinutes();
  const paymentSlaCutoff = new Date(Date.now() - paymentSlaMinutes * 60_000);

  try {
    const [
      pedidosHoy,
      pedidosActivos,
      pagosPorVerificar,
      pagosFueraSla,
      reservasHoy,
      ventasHoy,
      ventas7d,
      clientes,
      productosConRiesgo,
      accionesPendientes,
      experimentosActivos,
      whatsapp,
      topItems,
    ] = await Promise.all([
      prisma.pedido.count({ where: { createdAt: { gte: today } } }),
      prisma.pedido.count({
        where: {
          estado: {
            in: ["CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO"],
          },
        },
      }),
      prisma.pago.count({ where: { estado: "EN_VERIFICACION" } }),
      prisma.pago.count({
        where: {
          estado: "EN_VERIFICACION",
          comprobanteRecibidoEn: { lte: paymentSlaCutoff },
          pedido: { is: { estado: "PENDIENTE_VERIFICACION" } },
        },
      }),
      prisma.reserva.count({
        where: { fecha: { gte: today }, estado: "CONFIRMADA" },
      }),
      prisma.pedido.aggregate({
        where: {
          createdAt: { gte: today },
          estado: { not: "CANCELADO" },
        },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.pedido.aggregate({
        where: {
          createdAt: { gte: sevenDaysAgo },
          estado: { not: "CANCELADO" },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.cliente.count({ where: { activo: true } }),
      prisma.producto.count({
        where: {
          disponible: true,
          OR: [{ inventarioBajo: true }, { inventarioBajoReceta: true }],
        },
      }),
      prisma.revenueAction.count({ where: { status: "PENDING" } }),
      prisma.revenueExperiment.count({
        where: { status: { in: ["RUNNING", "ACTIVE"] } },
      }),
      prisma.whatsAppIntegration.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { status: true, verifiedName: true, lastVerifiedAt: true },
      }),
      prisma.itemPedido.groupBy({
        by: ["productoId"],
        where: {
          pedido: {
            createdAt: { gte: sevenDaysAgo },
            estado: { not: "CANCELADO" },
          },
        },
        _sum: { cantidad: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 5,
      }),
    ]);

    const products = topItems.length
      ? await prisma.producto.findMany({
          where: { id: { in: topItems.map((item) => item.productoId) } },
          select: { id: true, nombre: true },
        })
      : [];
    const productName = new Map(products.map((product) => [product.id, product.nombre]));

    return {
      conectado: true,
      pedidosHoy,
      pedidosActivos,
      pagosPorVerificar,
      pagosFueraSla,
      reservasHoy,
      ventasHoy: Number(ventasHoy._sum.total ?? 0),
      ticketPromedio: Number(ventasHoy._avg.total ?? 0),
      ventas7d: Number(ventas7d._sum.total ?? 0),
      pedidos7d: ventas7d._count._all,
      clientes,
      productosConRiesgo,
      accionesPendientes,
      experimentosActivos,
      whatsapp,
      topProducts: topItems.map((item) => ({
        id: item.productoId,
        nombre: productName.get(item.productoId) ?? "Producto",
        cantidad: item._sum.cantidad ?? 0,
      })),
    };
  } catch {
    return {
      conectado: false,
      pedidosHoy: 0,
      pedidosActivos: 0,
      pagosPorVerificar: 0,
      pagosFueraSla: 0,
      reservasHoy: 0,
      ventasHoy: 0,
      ticketPromedio: 0,
      ventas7d: 0,
      pedidos7d: 0,
      clientes: 0,
      productosConRiesgo: 0,
      accionesPendientes: 0,
      experimentosActivos: 0,
      whatsapp: null,
      topProducts: [] as Array<{ id: string; nombre: string; cantidad: number }>,
    };
  }
}

export default async function AdminDashboardPage() {
  const [data, session, kev] = await Promise.all([
    getCommandCenter(),
    auth(),
    getKevControlPlaneSnapshot(),
  ]);
  const rol = (session?.user as { rol?: string } | undefined)?.rol ?? "COCINA";
  const isSuperAdmin = rol === "SUPER_ADMIN";

  const primary = [
    {
      label: "Ventas hoy",
      value: formatCurrency(data.ventasHoy),
      detail: `Ticket promedio ${formatCurrency(data.ticketPromedio)}`,
      icon: CircleDollarSign,
      href: "/admin/reportes",
    },
    {
      label: "Pedidos hoy",
      value: String(data.pedidosHoy),
      detail: `${data.pedidosActivos} en operación`,
      icon: ShoppingBag,
      href: "/admin/pedidos",
    },
    {
      label: "Reservas hoy",
      value: String(data.reservasHoy),
      detail: "Reservas confirmadas",
      icon: CalendarDays,
      href: "/admin/reservas",
    },
    {
      label: "Clientes con cuenta",
      value: String(data.clientes),
      detail: "Perfiles activos PISÁO",
      icon: Users,
      href: "/admin/comportamiento",
    },
  ];

  const alerts = [
    {
      label: "Pagos por verificar",
      value: data.pagosPorVerificar,
      href: "/admin/pedidos",
      icon: WalletCards,
    },
    {
      label: "Pagos fuera de SLA",
      value: data.pagosFueraSla,
      href: "/admin/pedidos",
      icon: Clock3,
    },
    {
      label: "Productos con riesgo",
      value: data.productosConRiesgo,
      href: "/admin/inventario",
      icon: PackageSearch,
    },
    {
      label: "Acciones IA pendientes",
      value: data.accionesPendientes,
      href: "/admin/acciones",
      icon: Bot,
    },
    {
      label: "Experimentos activos",
      value: data.experimentosActivos,
      href: "/admin/experimentos",
      icon: Sparkles,
    },
  ];

  const whatsappHealthy = data.whatsapp?.status === "CONNECTED" || data.whatsapp?.status === "ACTIVE";
  const kevHealthy = kev.state === "RECEIVING";
  const kevLabel =
    kev.state === "RECEIVING"
      ? "Gobernanza activa"
      : kev.state === "DEGRADED"
        ? "Atención requerida"
        : kev.state === "UNCONFIGURED"
          ? "Sin configurar"
          : "Listo · sin evidencia";

  return (
    <div className="mx-auto max-w-[1500px] space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold tracking-[.22em] text-pisao-gold uppercase">
              PISÁO Command Center
            </p>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pisao-gold/20 bg-pisao-gold/10 px-2.5 py-1 text-[9px] font-bold tracking-[.12em] text-pisao-gold uppercase">
                <ShieldCheck className="size-3" />
                Super Admin
              </span>
            )}
          </div>
          <h1 className="font-display mt-2 text-4xl text-pisao-cream sm:text-5xl">
            Operación, ventas e inteligencia en una sola vista.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Prioriza lo que necesita intervención ahora y entra al módulo correspondiente sin recorrer el backoffice.
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche px-4 py-3">
          <p className="text-[9px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">Ventas últimos 7 días</p>
          <p className="font-display mt-1 text-2xl text-pisao-gold">{formatCurrency(data.ventas7d)}</p>
          <p className="mt-1 text-[11px] text-pisao-cream-muted">{data.pedidos7d} pedidos registrados</p>
        </div>
      </header>

      {!data.conectado && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          El Command Center no pudo consultar la base de datos. Los módulos permanecen accesibles, pero los indicadores están temporalmente en cero.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-[1.5rem] border border-pisao-gold/10 bg-pisao-carbon-soft p-5 transition hover:border-pisao-gold/35 hover:bg-pisao-gold/[.035]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-pisao-gold/10 text-pisao-gold">
                  <Icon className="size-4" />
                </span>
                <ChevronRight className="size-4 text-pisao-cream-muted transition group-hover:translate-x-0.5 group-hover:text-pisao-gold" />
              </div>
              <p className="mt-5 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">{card.label}</p>
              <p className="font-display mt-1 text-3xl text-pisao-gold">{card.value}</p>
              <p className="mt-2 text-xs text-pisao-cream-muted">{card.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[1.75rem] border border-pisao-gold/10 bg-pisao-noche p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Atención operativa</p>
              <h2 className="font-display mt-1 text-2xl text-pisao-cream">Lo que requiere acción</h2>
            </div>
            <Clock3 className="size-5 text-pisao-gold" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link key={alert.label} href={alert.href} className="flex items-center justify-between gap-4 rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4 transition hover:border-pisao-gold/30">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-pisao-gold/10 text-pisao-gold"><Icon className="size-4" /></span>
                    <span className="text-sm font-semibold text-pisao-cream">{alert.label}</span>
                  </div>
                  <span className="font-display text-2xl text-pisao-gold">{alert.value}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-pisao-gold/10 bg-pisao-noche p-5 sm:p-6">
          <p className="text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Integraciones</p>
          <h2 className="font-display mt-1 text-2xl text-pisao-cream">Estado de operación digital</h2>
          <div className="mt-5 space-y-3">
            <Link href="/admin/whatsapp" className="flex items-center justify-between rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4">
              <div className="flex items-center gap-3"><MessageCircle className="size-4 text-pisao-gold" /><span className="text-sm font-semibold text-pisao-cream">WhatsApp</span></div>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${whatsappHealthy ? "text-emerald-300" : "text-amber-300"}`}>
                {whatsappHealthy ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                {data.whatsapp?.status ?? "Sin certificar"}
              </span>
            </Link>
            <Link href="/admin/ia" className="flex items-center justify-between rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4">
              <div className="flex items-center gap-3"><Bot className="size-4 text-pisao-gold" /><span className="text-sm font-semibold text-pisao-cream">IA / Concierge</span></div>
              <span className="text-xs font-semibold text-pisao-gold">Abrir centro IA</span>
            </Link>
            <Link href="/admin/kev" className="flex items-center justify-between rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4">
              <div className="flex items-center gap-3"><BrainCircuit className="size-4 text-pisao-gold" /><span className="text-sm font-semibold text-pisao-cream">Kev · Gobernanza</span></div>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${kevHealthy ? "text-emerald-300" : "text-amber-300"}`}>
                {kevHealthy ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                {kevLabel}
              </span>
            </Link>
            <Link href="/admin/certificacion" className="flex items-center justify-between rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4">
              <div className="flex items-center gap-3"><ShieldCheck className="size-4 text-pisao-gold" /><span className="text-sm font-semibold text-pisao-cream">Certificación técnica</span></div>
              <span className="text-xs font-semibold text-pisao-gold">Ver evidencias</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-pisao-gold/10 bg-pisao-noche p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold tracking-[.16em] text-pisao-gold uppercase">Demanda</p>
            <h2 className="font-display mt-1 text-2xl text-pisao-cream">Productos más pedidos · 7 días</h2>
          </div>
          <Link href="/admin/reportes" className="text-xs font-semibold text-pisao-gold">Ver reportes →</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {data.topProducts.length ? data.topProducts.map((product, index) => (
            <div key={product.id} className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon/55 p-4">
              <p className="text-[9px] font-bold tracking-[.14em] text-pisao-gold uppercase">#{index + 1}</p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-pisao-cream">{product.nombre}</p>
              <p className="font-display mt-3 text-2xl text-pisao-gold">{product.cantidad}</p>
              <p className="text-[10px] text-pisao-cream-muted">unidades</p>
            </div>
          )) : (
            <p className="text-sm text-pisao-cream-muted">Todavía no hay suficiente actividad para construir este ranking.</p>
          )}
        </div>
      </section>

      {isSuperAdmin && (
        <section className="rounded-[1.75rem] border border-pisao-gold/20 bg-pisao-gold/[.045] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-pisao-gold/15 text-pisao-gold">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-[9px] font-bold tracking-[.18em] text-pisao-gold uppercase">Gobernanza Super Admin</p>
              <h2 className="font-display mt-1 text-2xl text-pisao-cream">Autoridad propietaria activa</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
                Esta sesión puede acceder a toda la operación administrativa. Las próximas capacidades exclusivas de gobierno —roles, integraciones críticas y configuración propietaria— quedarán reservadas a SUPER_ADMIN.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
