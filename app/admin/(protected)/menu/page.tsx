import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

async function getProductos() {
  try {
    return await prisma.producto.findMany({
      orderBy: { orden: "asc" },
      include: { categoria: true },
    });
  } catch {
    return null;
  }
}

export default async function AdminMenuPage() {
  const productos = await getProductos();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-pisao-cream text-2xl">Menú</h1>
        {/* TODO: modal/formulario de creación y edición de productos y categorías */}
        <button className="bg-pisao-gold text-pisao-carbon rounded-full px-4 py-2 text-sm font-medium">
          Nuevo producto
        </button>
      </div>

      {productos === null && (
        <p className="text-pisao-cream-muted mt-2 text-sm">
          No hay conexión a la base de datos. Configura DATABASE_URL en .env.
        </p>
      )}

      {productos !== null && (
        <div className="border-pisao-gold/10 mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-pisao-carbon-soft text-pisao-cream-muted">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-pisao-gold/10 border-t">
                  <td className="text-pisao-cream px-4 py-3">{p.nombre}</td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {p.categoria.nombre}
                  </td>
                  <td className="text-pisao-cream px-4 py-3">
                    {formatCurrency(Number(p.precio))}
                  </td>
                  <td className="text-pisao-cream-muted px-4 py-3">
                    {p.disponible ? "Sí" : "No"}
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-pisao-cream-muted px-4 py-6 text-center"
                  >
                    Aún no hay productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
