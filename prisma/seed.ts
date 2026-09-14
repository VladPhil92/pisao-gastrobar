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
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminPassword) {
    await prisma.usuario.upsert({
      where: { email: "admin@pisaogastrobar.com" },
      update: {},
      create: {
        nombre: "Administrador PISÁO",
        email: "admin@pisaogastrobar.com",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        rol: "ADMIN",
      },
    });
    console.log("Bootstrap DB: usuario administrativo verificado.");
  } else {
    console.log("Bootstrap DB: SEED_ADMIN_PASSWORD no definido; no se crea usuario admin.");
  }

  // Bootstrap no destructivo: crea la carta base únicamente cuando faltan filas.
  // Los cambios hechos después desde administración no se sobreescriben en deploys futuros.
  for (const [index, categoria] of categoriasPlaceholder.entries()) {
    await prisma.categoria.upsert({
      where: { slug: categoria.slug },
      update: {},
      create: {
        id: categoria.id,
        nombre: categoria.nombre,
        slug: categoria.slug,
        orden: index,
      },
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
      update: {},
      create: {
        id: producto.id,
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

  console.log(
    `Bootstrap DB: ${categoriasPlaceholder.length} categorías y ${productosPlaceholder.length} productos base verificados.`,
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
