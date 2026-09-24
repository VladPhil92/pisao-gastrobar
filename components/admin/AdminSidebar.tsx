"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  BarChart3,
  Sparkles,
  MousePointerClick,
  Zap,
  FlaskConical,
  Radar,
  WalletCards,
  MessageCircle,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/auth/roles";

const items = [
  {
    href: "/admin/dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"],
  },
  {
    href: "/admin/ia",
    label: "Centro IA",
    icon: Sparkles,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/kev",
    label: "Kev Control Plane",
    icon: BrainCircuit,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/certificacion",
    label: "Certificación",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/acciones",
    label: "Acciones IA",
    icon: Zap,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/experimentos",
    label: "Experimentos",
    icon: FlaskConical,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/politicas",
    label: "Políticas IA",
    icon: Radar,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
    roles: ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"],
  },
  {
    href: "/admin/menu",
    label: "Menú",
    icon: UtensilsCrossed,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/reservas",
    label: "Reservas",
    icon: CalendarDays,
    roles: ["SUPER_ADMIN", "ADMIN", "CAJERO"],
  },
  {
    href: "/admin/comportamiento",
    label: "Comportamiento",
    icon: MousePointerClick,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/cripto",
    label: "Cripto",
    icon: WalletCards,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
] as const;

export function AdminSidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {items
        .filter((item) => (item.roles as readonly string[]).includes(rol))
        .map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                active
                  ? "bg-pisao-gold/15 text-pisao-gold"
                  : "text-pisao-cream-muted hover:bg-pisao-carbon-soft hover:text-pisao-cream",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
