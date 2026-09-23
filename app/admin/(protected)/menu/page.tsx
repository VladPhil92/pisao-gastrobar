import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductEconomicsManager } from "@/components/admin/ProductEconomicsManager";

async function getProductos() {
  try {
    const products = await prisma.producto.findMany({
      orderBy: [{ categoria: { orden: "asc" } }, { orden: "asc" }],
      include: { categoria: true },
    });

    return products.map((product) => ({
      id: product.id,
      nombre: product.nombre,
      categoria: product.categoria.nombre,
      precio: Number(product.precio),
      costoUnitario:
        product.costoUnitario === null ? null : Number(product.costoUnitario),
      disponible: product.disponible,
      inventarioBajo: product.inventarioBajo,
      costoActualizadoAt: product.costoActualizadoAt?.toISOString() ?? null,
    }));
  } catch {
    return null;
  }
}

export default async function AdminMenuPage() {
  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || user?.rol !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const productos = await getProductos();

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pisao-gold">
          Profit Intelligence V5
        </p>
        <h1 className="font-display mt-2 text-4xl text-pisao-cream">
          Menú, margen y disponibilidad
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
          Configura costos reales sin alterar precios. Los costos son privados y
          se usan para medir margen de contribución y gobernar recomendaciones.
          No inventamos costos faltantes.
        </p>
      </div>

      {productos === null ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">
          No fue posible consultar el catálogo en la base de datos.
        </p>
      ) : (
        <ProductEconomicsManager products={productos} />
      )}
    </div>
  );
}
