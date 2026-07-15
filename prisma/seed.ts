import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  categoriasPlaceholder,
  productosPlaceholder,
} from "../lib/menu/placeholder-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "cambiar-esta-clave";

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@pisaogastrobar.com" },
    update: {},
    create: {
      nombre: "Administrador PISÁO",
      email: "admin@pisaogastrobar.com",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      rol: "ADMIN",
    },
  });

  // Carta real (ver lib/menu/placeholder-data.ts para la fuente y notas
  // sobre qué fotos son coincidencias confirmadas vs. mejor aproximación).
  for (const [index, categoria] of categoriasPlaceholder.entries()) {
    await prisma.categoria.upsert({
      where: { slug: categoria.slug },
      update: { nombre: categoria.nombre, orden: index },
      create: { nombre: categoria.nombre, slug: categoria.slug, orden: index },
    });
  }

  const categoriasDb = await prisma.categoria.findMany();
  const categoriaIdPorSlug = new Map(categoriasDb.map((c) => [c.slug, c.id]));

  for (const producto of productosPlaceholder) {
    const categoriaId = categoriaIdPorSlug.get(producto.categoriaSlug);
    if (!categoriaId) {
      throw new Error(`Categoría no encontrada: ${producto.categoriaSlug}`);
    }

    await prisma.producto.upsert({
      where: { slug: producto.slug },
      update: {
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: producto.precio,
        imagenUrl: producto.imagenUrl,
        disponible: producto.disponible,
        categoriaId,
      },
      create: {
        nombre: producto.nombre,
        slug: producto.slug,
        descripcion: producto.descripcion || "",
        precio: producto.precio,
        imagenUrl: producto.imagenUrl,
        disponible: producto.disponible,
        categoriaId,
      },
    });
  }

  console.log(`Usuario admin listo: ${admin.email} / ${adminPassword}`);
  console.log(
    `Carta cargada: ${categoriasDb.length} categorías, ${productosPlaceholder.length} productos.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
