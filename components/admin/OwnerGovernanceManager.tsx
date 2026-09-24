"use client";

import { useState } from "react";
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

type StaffUser = {
  id: string;
  nombre: string;
  email: string;
  rawEmail: string | null;
  rol: "SUPER_ADMIN" | "ADMIN" | "CAJERO" | "COCINA";
  activo: boolean;
  authSource: "CTG_ONE" | "LOCAL";
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditEvent = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  detail: Record<string, string | number | boolean | null> | null;
  createdAt: string;
};

type Snapshot = {
  users: StaffUser[];
  audit: AuditEvent[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    activeSuperAdmins: number;
    localUsers: number;
    federatedActors: number;
  };
};

const roles = ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"] as const;

function StaffCard({
  user,
  currentUserId,
  busy,
  onPatch,
}: {
  user: StaffUser;
  currentUserId: string;
  busy: boolean;
  onPatch: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(user.nombre);
  const [password, setPassword] = useState("");
  const federated = user.authSource === "CTG_ONE";
  const self = user.id === currentUserId;

  return (
    <article className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-pisao-cream">{user.nombre}</p>
            <span className="rounded-full bg-pisao-gold/10 px-2 py-1 text-[9px] font-bold tracking-wider text-pisao-gold">
              {user.rol}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold tracking-wider ${
                user.activo
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {user.activo ? "ACTIVO" : "INACTIVO"}
            </span>
            {federated ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[9px] font-bold tracking-wider text-sky-300">
                CTG ONE
              </span>
            ) : null}
            {self ? (
              <span className="rounded-full bg-pisao-cream/10 px-2 py-1 text-[9px] font-bold tracking-wider text-pisao-cream-muted">
                TU SESIÓN
              </span>
            ) : null}
          </div>
          <p className="mt-2 break-all text-xs text-pisao-cream-muted">
            {user.email}
          </p>
          <p className="mt-1 text-[11px] text-pisao-cream-muted">
            Último acceso:{" "}
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString("es-CO")
              : "Sin acceso local registrado"}
          </p>
        </div>
      </div>

      {federated ? (
        <p className="mt-4 rounded-xl border border-sky-400/10 bg-sky-400/[.04] p-3 text-xs leading-relaxed text-pisao-cream-muted">
          Actor protegido de federación. Su autoridad se deriva de CTG One y no
          se modifica con credenciales locales.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-pisao-cream-muted">
              Nombre
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-pisao-gold/15 bg-pisao-carbon px-3 py-2 text-sm text-pisao-cream"
              />
              <button
                type="button"
                disabled={busy || name.trim() === user.nombre}
                onClick={() => void onPatch(user.id, { nombre: name })}
                className="rounded-lg border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-pisao-cream-muted">
              Rol
            </label>
            <select
              value={user.rol}
              disabled={busy || self}
              onChange={(event) =>
                void onPatch(user.id, { rol: event.target.value })
              }
              className="mt-1 min-h-10 w-full rounded-lg border border-pisao-gold/15 bg-pisao-carbon px-3 text-sm text-pisao-cream"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-pisao-cream-muted">
              Nueva contraseña interna
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                value={password}
                minLength={12}
                placeholder="Mínimo 12 caracteres"
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-pisao-gold/15 bg-pisao-carbon px-3 py-2 text-sm text-pisao-cream"
              />
              <button
                type="button"
                disabled={busy || password.length < 12}
                onClick={async () => {
                  await onPatch(user.id, { resetPassword: password });
                  setPassword("");
                }}
                className="rounded-lg border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
              >
                <KeyRound className="mr-1 inline size-3" />
                Cambiar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={busy || self}
              onClick={() =>
                void onPatch(user.id, { activo: !user.activo })
              }
              className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${
                user.activo
                  ? "border-red-400/20 text-red-300"
                  : "border-emerald-400/20 text-emerald-300"
              }`}
            >
              {user.activo ? "Desactivar acceso" : "Reactivar acceso"}
            </button>
            <button
              type="button"
              disabled={busy || self}
              onClick={() => void onPatch(user.id, { revokeSessions: true })}
              className="min-h-10 rounded-lg border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
            >
              Revocar sesiones
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function OwnerGovernanceManager({
  initial,
  currentUserId,
}: {
  initial: Snapshot;
  currentUserId: string;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [create, setCreate] = useState({
    nombre: "",
    email: "",
    rol: "CAJERO",
    temporaryPassword: "",
  });

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible actualizar.");
      setSnapshot(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const payload = (await response.json()) as {
        error?: string;
        snapshot?: Snapshot;
      };
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error || "No fue posible crear el usuario.");
      }
      setSnapshot(payload.snapshot);
      setCreate({
        nombre: "",
        email: "",
        rol: "CAJERO",
        temporaryPassword: "",
      });
      setMessage("Usuario interno creado. Entrégale la contraseña por un canal seguro.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function patchUser(id: string, payload: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        error?: string;
        snapshot?: Snapshot;
      };
      if (!response.ok || !body.snapshot) {
        throw new Error(body.error || "No fue posible modificar el acceso.");
      }
      setSnapshot(body.snapshot);
      setMessage("Gobernanza actualizada y registrada en auditoría.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Usuarios", snapshot.summary.totalUsers],
          ["Activos", snapshot.summary.activeUsers],
          ["Super Admin", snapshot.summary.activeSuperAdmins],
          ["Cuentas locales", snapshot.summary.localUsers],
          ["Actores CTG One", snapshot.summary.federatedActors],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-pisao-cream-muted">
              {String(label)}
            </p>
            <p className="font-display mt-1 text-3xl text-pisao-gold">
              {String(value)}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <UserPlus className="mt-1 size-5 text-pisao-gold" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-pisao-gold">
              Alta de empleado
            </p>
            <h2 className="font-display mt-1 text-2xl text-pisao-cream">
              Credencial interna PISÁO
            </h2>
          </div>
        </div>
        <form onSubmit={createUser} className="mt-5 grid gap-3 lg:grid-cols-4">
          <input
            required
            placeholder="Nombre"
            value={create.nombre}
            onChange={(e) => setCreate({ ...create, nombre: e.target.value })}
            className="rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <input
            required
            type="email"
            placeholder="Correo"
            value={create.email}
            onChange={(e) => setCreate({ ...create, email: e.target.value })}
            className="rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <select
            value={create.rol}
            onChange={(e) => setCreate({ ...create, rol: e.target.value })}
            className="rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            required
            type="password"
            minLength={12}
            placeholder="Contraseña temporal · 12+"
            value={create.temporaryPassword}
            onChange={(e) =>
              setCreate({ ...create, temporaryPassword: e.target.value })
            }
            className="rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-3 py-2.5 text-sm text-pisao-cream"
          />
          <button
            type="submit"
            disabled={busy}
            className="bg-pisao-gold text-pisao-carbon rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 lg:col-span-4"
          >
            Crear acceso interno
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-pisao-gold">
              Identity & Access Management
            </p>
            <h2 className="font-display mt-1 text-2xl text-pisao-cream">
              Equipo y permisos
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-lg border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-40"
          >
            <RefreshCw className="mr-1 inline size-3" />
            Actualizar
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {snapshot.users.map((user) => (
            <StaffCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              busy={busy}
              onPatch={patchUser}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 text-pisao-gold" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-pisao-gold">
              Audit Ledger
            </p>
            <h2 className="font-display mt-1 text-2xl text-pisao-cream">
              Actividad administrativa reciente
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-pisao-cream-muted">
              Registro append-only de acciones sensibles. No contiene
              contraseñas, tokens ni cuerpos de mensajes.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {snapshot.audit.length ? (
            snapshot.audit.map((event) => (
              <div
                key={event.id}
                className="grid gap-2 rounded-xl border border-pisao-gold/10 bg-pisao-noche px-3 py-3 text-xs lg:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-pisao-cream">
                    {event.action}
                  </p>
                  <p className="mt-1 text-pisao-cream-muted">
                    {event.actorName} · {event.actorRole}
                  </p>
                </div>
                <div>
                  <p className="text-pisao-cream">
                    {event.targetType}
                    {event.targetId ? ` · ${event.targetId.slice(0, 12)}…` : ""}
                  </p>
                  <p className="mt-1 text-pisao-cream-muted">
                    {event.detail
                      ? Object.entries(event.detail)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")
                      : "Sin metadatos adicionales"}
                  </p>
                </div>
                <div className="lg:text-right">
                  <p
                    className={
                      event.outcome === "SUCCESS"
                        ? "font-semibold text-emerald-300"
                        : "font-semibold text-amber-300"
                    }
                  >
                    {event.outcome}
                  </p>
                  <p className="mt-1 text-pisao-cream-muted">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-pisao-gold/10 bg-pisao-noche p-4">
              <UsersRound className="size-4 text-pisao-gold" />
              <p className="text-xs text-pisao-cream-muted">
                La bitácora comenzará a poblarse con las próximas acciones administrativas.
              </p>
            </div>
          )}
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-pisao-gold/10 bg-pisao-gold/[.04] p-3 text-sm text-pisao-cream-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
