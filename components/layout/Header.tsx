"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag, UserCircle, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";
import { useCartStore, cartItemCount } from "@/lib/cart/store";

const visualLinks = [
  { href: "/menu", label: "Carta", image: "/gallery/patacon_callejero.jpg" },
  { href: "/reservas", label: "Terraza", image: "/gallery/terraza-atardecer.jpg" },
  { href: "/galeria", label: "Mirar PISÁO", image: "/gallery/cayeyeCostilla.jpg" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.open);
  const count = cartItemCount(items);

  return (
    <header className="sticky top-0 z-40 border-b border-pisao-gold/10 bg-pisao-carbon/80 shadow-[0_12px_40px_rgba(0,0,0,.18)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-pisao-gold/45 to-transparent" />
      <Container className="flex h-[4.5rem] items-center justify-between">
        <Link href="/" className="group flex items-center gap-3" aria-label="Ir al inicio de PISÁO">
          <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border border-pisao-gold/20 bg-pisao-noche transition duration-300 group-hover:border-pisao-gold/55 group-hover:shadow-[0_0_30px_rgba(199,154,58,.16)]">
            <Image src="/brand/pisao-mark.png" alt="" width={34} height={34} className="h-8 w-8 transition duration-500 group-hover:scale-110" priority />
          </span>
          <span>
            <span className="font-display block text-xl leading-none tracking-wide text-pisao-gold">{siteConfig.shortName}</span>
            <span className="mt-1 hidden text-[8px] font-semibold tracking-[.22em] text-pisao-cream-muted uppercase sm:block">Caribe · terraza · mesa</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {siteConfig.nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-3.5 py-2 text-xs font-semibold transition duration-300 ${active ? "bg-pisao-gold/10 text-pisao-gold" : "text-pisao-cream-muted hover:bg-white/[.035] hover:text-pisao-cream"}`}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-[1.12rem] h-px bg-pisao-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/micuenta"
            aria-label="Ingresar o abrir mi cuenta PISÁO"
            className={`flex min-h-10 items-center justify-center gap-2 rounded-full border px-2.5 transition duration-300 xl:px-3.5 ${pathname.startsWith("/micuenta") ? "border-pisao-gold/45 bg-pisao-gold/10 text-pisao-gold" : "border-transparent text-pisao-cream hover:border-pisao-gold/20 hover:bg-pisao-gold/5 hover:text-pisao-gold"}`}
          >
            <UserCircle className="size-5" aria-hidden="true" />
            <span className="hidden text-xs font-semibold xl:inline">Mi cuenta</span>
          </Link>

          <button
            type="button"
            aria-label="Abrir carrito"
            onClick={openCart}
            className="relative flex size-10 items-center justify-center rounded-full border border-transparent text-pisao-cream transition duration-300 hover:border-pisao-gold/20 hover:bg-pisao-gold/5 hover:text-pisao-gold"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-pisao-gold text-[10px] font-bold text-pisao-carbon shadow-lg">
                {count}
              </span>
            )}
          </button>

          <Button href="/reservas" variant="outline" className="hidden xl:inline-flex">Reservar</Button>
          <Button href="/menu" variant="primary" className="hidden sm:inline-flex">Pedir ahora</Button>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            className="flex size-10 items-center justify-center rounded-full border border-pisao-gold/15 text-pisao-cream transition hover:border-pisao-gold/40 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div className="border-t border-pisao-gold/10 bg-pisao-carbon/97 lg:hidden">
          <Container className="py-5">
            <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]">
              <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
                {siteConfig.nav.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${active ? "bg-pisao-gold text-pisao-carbon" : "text-pisao-cream-muted hover:bg-pisao-noche hover:text-pisao-gold"}`}
                    >
                      {item.label}<ArrowUpRight className="size-3.5" />
                    </Link>
                  );
                })}
                <Link href="/micuenta" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center justify-between rounded-2xl border border-pisao-gold/15 px-4 py-3.5 text-sm font-semibold text-pisao-cream">
                  Ingresar / Mi cuenta <UserCircle className="size-4 text-pisao-gold" />
                </Link>
              </nav>

              <div className="grid grid-cols-3 gap-2">
                {visualLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="group relative min-h-36 overflow-hidden rounded-2xl border border-pisao-gold/10">
                    <Image src={item.image} alt="" fill sizes="33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent" />
                    <span className="absolute right-3 bottom-3 left-3 font-display text-sm text-pisao-cream">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:hidden">
              <Button href="/reservas" variant="outline" className="w-full">Reservar</Button>
              <Button href="/menu" variant="primary" className="w-full">Pedir ahora</Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
