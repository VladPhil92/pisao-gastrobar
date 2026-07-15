"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/auth/roles";

const items = [
  {
    href: "/admin/dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    roles: ["ADMIN", "CAJERO", "COCINA"],
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
    roles: ["ADMIN", "CAJERO", "COCINA"],
  },
  {
    href: "/admin/menu",
    label: "Menú",
    icon: UtensilsCrossed,
    roles: ["ADMIN"],
  },
  {
    href: "/admin/reservas",
    label: "Reservas",
    icon: CalendarDays,
    roles: ["ADMIN", "CAJERO"],
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    icon: BarChart3,
    roles: ["ADMIN"],
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
