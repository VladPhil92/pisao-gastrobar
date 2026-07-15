"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";
import { useCartStore, cartItemCount } from "@/lib/cart/store";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const openCart = useCartStore((state) => state.open);
  const count = cartItemCount(items);

  return (
    <header className="border-pisao-gold/15 bg-pisao-carbon/95 supports-backdrop-blur:bg-pisao-carbon/80 sticky top-0 z-40 border-b backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/pisao-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="font-display text-pisao-gold text-xl tracking-wide">
            {siteConfig.shortName}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-pisao-cream-muted hover:text-pisao-gold text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Abrir carrito"
            onClick={openCart}
            className="text-pisao-cream hover:text-pisao-gold relative flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="bg-pisao-gold text-pisao-carbon absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                {count}
              </span>
            )}
          </button>

          <Button
            href="/reservas"
            variant="outline"
            className="hidden sm:inline-flex"
          >
            Reservar
          </Button>
          <Button
            href="/menu"
            variant="primary"
            className="hidden sm:inline-flex"
          >
            Pedir Ahora
          </Button>

          <button
            type="button"
            aria-label="Abrir menú"
            className="text-pisao-cream flex h-10 w-10 items-center justify-center lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div className="border-pisao-gold/15 bg-pisao-carbon border-t lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-pisao-cream-muted hover:bg-pisao-carbon-soft hover:text-pisao-gold rounded-md px-2 py-2.5 text-sm"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Button href="/reservas" variant="outline" className="flex-1">
                Reservar
              </Button>
              <Button href="/menu" variant="primary" className="flex-1">
                Pedir Ahora
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
