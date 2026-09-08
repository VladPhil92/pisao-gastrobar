import Link from "next/link";
import { getCtgOneCustomerSession } from "@/lib/ctgone/customer-session";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MiCuentaPage() {
  const session = await getCtgOneCustomerSession();

  if (!session) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-pisao-gold text-xs font-semibold uppercase tracking-[0.2em]">
          CTG One · PISÁO
        </p>
        <h1 className="font-display text-pisao-cream mt-3 text-4xl">Mi PISÁO</h1>
        <p className="text-pisao-cream-muted mx-auto mt-4 max-w-xl">
          Conecta tu identidad CTG One para consultar en un solo lugar tus pedidos,
          reservas y actividad elegible para beneficios del ecosistema.
        </p>
        <a
          href="/auth/ctgone/start"
          className="bg-pisao-gold text-pisao-carbon mt-8 inline-flex rounded-full px-5 py-3 text-sm font-semibold"
        >
          Entrar con CTG One
        </a>
      </section>
    );
  }

  const [pedidos, reservas, rewards] = await Promise.all([
    prisma.pedido.findMany({
      where: { ctgOneSubject: session.sub },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, numero: true, total: true, estado: true, createdAt: true },
    }),
    prisma.reserva.findMany({
      where: { ctgOneSubject: session.sub },
      orderBy: { fecha: "desc" },
      take: 25,
      select: { id: true, fecha: true, hora: true, personas: true, estado: true },
    }),
    prisma.ctgOneRewardOutbox.findMany({
      where: { ctgOneSubject: session.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { type: true, status: true, createdAt: true },
    }),
  ]);

  const fulfilled = rewards.filter((event) => event.type === "ORDER_FULFILLED").length;
  const completedReservations = rewards.filter((event) => event.type === "RESERVATION_COMPLETED").length;
  const pendingSync = rewards.filter((event) => event.status !== "DELIVERED").length;

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold uppercase tracking-[0.2em]">
            Identidad conectada · CTG One
          </p>
          <h1 className="font-display text-pisao-cream mt-2 text-4xl">Mi PISÁO</h1>
          <p className="text-pisao-cream-muted mt-2 text-sm">{session.email}</p>
        </div>
        <Link
          href="https://ctgone.com/dashboard"
          className="border-pisao-gold/30 text-pisao-gold rounded-full border px-4 py-2 text-sm"
        >
          Ir a CTG One
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Metric label="Pedidos cumplidos" value={fulfilled} />
        <Metric label="Reservas completadas" value={completedReservations} />
        <Metric label="Eventos por sincronizar" value={pendingSync} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-pisao-cream text-2xl">Pedidos</h2>
          <div className="border-pisao-gold/10 mt-4 overflow-hidden rounded-xl border">
            {pedidos.length === 0 ? (
              <Empty text="Aún no tienes pedidos vinculados a CTG One." />
            ) : (
              pedidos.map((pedido) => (
                <div key={pedido.id} className="border-pisao-gold/10 flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-pisao-cream text-sm font-medium">Pedido #{pedido.numero}</p>
                    <p className="text-pisao-cream-muted mt-1 text-xs">
                      {pedido.createdAt.toLocaleDateString("es-CO")} · {pedido.estado}
                    </p>
                  </div>
                  <span className="text-pisao-gold text-sm">{formatCurrency(Number(pedido.total))}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-pisao-cream text-2xl">Reservas</h2>
          <div className="border-pisao-gold/10 mt-4 overflow-hidden rounded-xl border">
            {reservas.length === 0 ? (
              <Empty text="Aún no tienes reservas vinculadas a CTG One." />
            ) : (
              reservas.map((reserva) => (
                <div key={reserva.id} className="border-pisao-gold/10 flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0">
                  <div>
                    <p className="text-pisao-cream text-sm font-medium">
                      {reserva.fecha.toLocaleDateString("es-CO")} · {reserva.hora}
                    </p>
                    <p className="text-pisao-cream-muted mt-1 text-xs">
                      {reserva.personas} personas · {reserva.estado}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-pisao-cream-muted mt-8 text-xs leading-relaxed">
        PISÁO conserva el historial operativo. CTG One consolida los beneficios del ecosistema.
        Una falla temporal de sincronización no afecta tu pedido ni tu reserva.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-pisao-gold/10 bg-pisao-carbon-soft rounded-xl border p-4">
      <p className="text-pisao-cream-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="font-display text-pisao-gold mt-2 text-3xl">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-pisao-cream-muted px-4 py-6 text-sm">{text}</p>;
}
