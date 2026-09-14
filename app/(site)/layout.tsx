import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { PisaoConcierge } from "@/components/ai/PisaoConcierge";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <PisaoConcierge />
      <CartDrawer />
    </div>
  );
}
