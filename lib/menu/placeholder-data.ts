import type { MenuCardProduct } from "@/components/menu/MenuCard";

/**
 * Carta real de PISÁO (fuente: "MENÚ PISAO 2026 - TERRAZA PANORÁMICA",
 * entregado por el cliente). Se usa como fallback de desarrollo cuando
 * no hay base de datos conectada — en producción /app/menu debe leer
 * de Prisma (`prisma.categoria.findMany({ include: { productos: true } })`).
 * Para poblar la base de datos real, ver `prisma/seed.ts`.
 *
 * Fotos: varias vienen de /public/gallery/ (fotografía real entregada
 * por el cliente). Donde el nombre del plato coincide claramente con
 * la foto (empaque de marca visible, ingrediente inconfundible) la
 * asignación es segura; el resto son la mejor aproximación visual
 * disponible entre los platos de patacón/hamburguesa fotografiados y
 * deben confirmarse con el cliente antes de publicar. Sin foto
 * disponible: bebidas, cócteles y algunos platos de bowls/infantil.
 */
export const categoriasPlaceholder = [
  { id: "cat-entradas", nombre: "Entradas", slug: "entradas" },
  {
    id: "cat-patacones-insignia",
    nombre: "Patacones Insignia",
    slug: "patacones-insignia",
  },
  { id: "cat-hamburguesas", nombre: "Hamburguesas", slug: "hamburguesas" },
  { id: "cat-bowls", nombre: "Bowls", slug: "bowls" },
  { id: "cat-menu-infantil", nombre: "Menú Infantil", slug: "menu-infantil" },
  { id: "cat-postre", nombre: "Postre", slug: "postre" },
  { id: "cat-sodas", nombre: "Sodas Saborizadas", slug: "sodas-saborizadas" },
  { id: "cat-limonadas", nombre: "Limonadas", slug: "limonadas" },
  {
    id: "cat-gaseosas",
    nombre: "Gaseosas y Bebidas",
    slug: "gaseosas-y-bebidas",
  },
  { id: "cat-cervezas", nombre: "Cervezas", slug: "cervezas" },
  { id: "cat-cocteles", nombre: "Cócteles", slug: "cocteles" },
];

export const productosPlaceholder: (MenuCardProduct & {
  categoriaSlug: string;
})[] = [
  // Entradas
  {
    id: "prod-patacon-queso-hogao",
    nombre: "Patacón con Queso y Hogao",
    slug: "patacon-con-queso-y-hogao",
    descripcion: "3 patacones con hogao y queso costeño rayado.",
    precio: 20000,
    imagenUrl: "/gallery/patacones-trio.jpg",
    disponible: true,
    categoriaSlug: "entradas",
  },
  {
    id: "prod-patacon-chicharron-entrada",
    nombre: "Patacón con Chicharrón",
    slug: "patacon-con-chicharron",
    descripcion:
      "3 patacones con suero, queso costeño rayado y 20g de chicharrón cada uno.",
    precio: 29000,
    imagenUrl: "/gallery/patacones-cerdo.jpg",
    disponible: true,
    categoriaSlug: "entradas",
  },
  {
    id: "prod-marranitas",
    nombre: "Marranitas con Chicharrón",
    slug: "marranitas-con-chicharron",
    descripcion: "3 marranitas de plátano maduro rellenas con chicharrón.",
    precio: 20000,
    imagenUrl: "/gallery/bolitas-rellenas.jpg",
    disponible: true,
    categoriaSlug: "entradas",
  },
  {
    id: "prod-palitos-pisao",
    nombre: "Palitos PISÁO",
    slug: "palitos-pisao",
    descripcion:
      'Patacón en forma de "papas fritas" con costilla desmechada glaseada en panela, queso costeño rayado, ripio de papas y salsas de la casa.',
    precio: 25000,
    imagenUrl: "/gallery/patacones-bowl.jpg",
    disponible: true,
    categoriaSlug: "entradas",
  },

  // Patacones Insignia
  {
    id: "prod-costeno",
    nombre: "Costeño",
    slug: "costeno",
    descripcion:
      "200g de patacón, suero, lechuga, 60g de pollo desmechado y 60g de carne desmechada, salsas, queso costeño rayado y cebollas encurtidas.",
    precio: 32000,
    imagenUrl: "/gallery/patacon-pollo.jpg",
    disponible: true,
    categoriaSlug: "patacones-insignia",
  },
  {
    id: "prod-callejero",
    nombre: "Callejero",
    slug: "callejero",
    descripcion:
      "200g de patacón, mayonesa de ajo, lechuga, salchicha súper, chorizo antioqueño, queso mozzarella, papa ripio.",
    precio: 34000,
    imagenUrl: "/gallery/patacon-especial.jpg",
    disponible: true,
    categoriaSlug: "patacones-insignia",
  },
  {
    id: "prod-montanero",
    nombre: "Montañero",
    slug: "montanero",
    descripcion:
      "200g de patacón, mayonesa de ajo, miel mostaza, lechuga, 60g de chicharrón con 60g de chorizo antioqueño, toques de guacamole y cebollas encurtidas.",
    precio: 36000,
    imagenUrl: "/gallery/patacon-mixto.jpg",
    disponible: true,
    categoriaSlug: "patacones-insignia",
  },
  {
    id: "prod-frontera",
    nombre: "Frontera",
    slug: "frontera",
    descripcion:
      "200g de patacón, guacamole, 120g de carne desmechada, queso mozzarella, jalapeños encurtidos y salsa picante.",
    precio: 38000,
    imagenUrl: "/gallery/patacon-carne-guacamole.jpg",
    disponible: true,
    categoriaSlug: "patacones-insignia",
  },
  {
    id: "prod-vegetariano",
    nombre: "Vegetariano",
    slug: "vegetariano",
    descripcion:
      "200g de patacón, dip de champiñones con ajo y cebolla, hogao, aguacate, tomates asados, orégano, pimentón (rojo, amarillo y verde) y cilantro.",
    precio: 29000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "patacones-insignia",
  },

  // Hamburguesas
  {
    id: "prod-patacon-burger",
    nombre: "Patacón Burger",
    slug: "patacon-burger",
    descripcion:
      "Hamburguesa de patacón con mayonesa de ajo, lechuga, relish de pepinillos agridulces, 150g de carne y queso cheddar.",
    precio: 26000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "hamburguesas",
  },
  {
    id: "prod-pisao-burger",
    nombre: "PISÁO Burger",
    slug: "pisao-burger",
    descripcion:
      "Pan brioche, mayonesa de ajo, miel mostaza, lechuga crespa, relish de pepinillos agridulces, cebolla, 150g de carne, queso cheddar y ripio de plátano.",
    precio: 36000,
    imagenUrl: "/gallery/hamburguesa-patacon-chips.jpg",
    disponible: true,
    categoriaSlug: "hamburguesas",
  },
  {
    id: "prod-laguna-azul-burger",
    nombre: "Laguna Azul Burger",
    slug: "laguna-azul-burger",
    descripcion:
      "Pan brioche, mayonesa de ajo, salsa rosada, lechuga crespa, 150g de carne, queso azul, cebolla caramelizada en panela.",
    precio: 38000,
    imagenUrl: "/gallery/hamburguesa-clasica.jpg",
    disponible: true,
    categoriaSlug: "hamburguesas",
  },

  // Bowls
  {
    id: "prod-ceviche-chicharron",
    nombre: "Ceviche de Chicharrón",
    slug: "ceviche-de-chicharron",
    descripcion:
      "4 patacones, 80g de chicharrón, guacamole, cebollas en julianas.",
    precio: 38000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "bowls",
  },
  {
    id: "prod-pisao-bowl",
    nombre: "PISÁO Bowl",
    slug: "pisao-bowl",
    descripcion: "",
    precio: 36000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "bowls",
  },
  {
    id: "prod-cayeye-sencillo",
    nombre: "Cayeye Sencillo",
    slug: "cayeye-sencillo",
    descripcion: "",
    precio: 20000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "bowls",
  },
  {
    id: "prod-cayeye-costilla",
    nombre: "Cayeye con Costilla",
    slug: "cayeye-con-costilla",
    descripcion: "",
    precio: 30000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "bowls",
  },
  {
    id: "prod-cayeye-chicharron",
    nombre: "Cayeye con Chicharrón",
    slug: "cayeye-con-chicharron",
    descripcion: "",
    precio: 32000,
    imagenUrl: "/gallery/patacon-chicharron.jpg",
    disponible: true,
    categoriaSlug: "bowls",
  },

  // Menú Infantil
  {
    id: "prod-pisao-kids",
    nombre: "PISÁO Kids",
    slug: "pisao-kids",
    descripcion: "",
    precio: 30000,
    imagenUrl: "/gallery/pisao-kids.jpg",
    disponible: true,
    categoriaSlug: "menu-infantil",
  },
  {
    id: "prod-mini-burgers-pisao",
    nombre: "Mini Burgers PISÁO",
    slug: "mini-burgers-pisao",
    descripcion: "",
    precio: 22000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "menu-infantil",
  },

  // Postre
  {
    id: "prod-platano-quemao",
    nombre: "Plátano Quemao",
    slug: "platano-quemao",
    descripcion: "",
    precio: 18000,
    imagenUrl: "/gallery/postre-platano-flambeado.jpg",
    disponible: true,
    categoriaSlug: "postre",
  },

  // Sodas Saborizadas
  {
    id: "prod-soda-maracuya-hierbabuena",
    nombre: "Soda Maracuyá y Hierbabuena",
    slug: "soda-maracuya-y-hierbabuena",
    descripcion: "",
    precio: 25000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "sodas-saborizadas",
  },
  {
    id: "prod-soda-frutos-rojos",
    nombre: "Soda Frutos Rojos",
    slug: "soda-frutos-rojos",
    descripcion: "",
    precio: 25000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "sodas-saborizadas",
  },
  {
    id: "prod-soda-mango",
    nombre: "Soda Mango",
    slug: "soda-mango",
    descripcion: "",
    precio: 25000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "sodas-saborizadas",
  },
  {
    id: "prod-soda-cereza",
    nombre: "Soda Cereza",
    slug: "soda-cereza",
    descripcion: "",
    precio: 25000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "sodas-saborizadas",
  },

  // Limonadas
  {
    id: "prod-limonada",
    nombre: "Limonada",
    slug: "limonada",
    descripcion: "",
    precio: 16000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "limonadas",
  },
  {
    id: "prod-limonada-coco",
    nombre: "Limonada de Coco",
    slug: "limonada-de-coco",
    descripcion: "",
    precio: 20000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "limonadas",
  },
  {
    id: "prod-limonada-cerezada",
    nombre: "Limonada Cerezada",
    slug: "limonada-cerezada",
    descripcion: "",
    precio: 20000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "limonadas",
  },
  {
    id: "prod-limonada-hierbabuena",
    nombre: "Limonada de Hierbabuena",
    slug: "limonada-de-hierbabuena",
    descripcion: "",
    precio: 20000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "limonadas",
  },

  // Gaseosas y Bebidas
  {
    id: "prod-agua",
    nombre: "Agua",
    slug: "agua",
    descripcion: "",
    precio: 6000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-agua-con-gas",
    nombre: "Agua con Gas",
    slug: "agua-con-gas",
    descripcion: "",
    precio: 6000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-coca-cola",
    nombre: "Coca-Cola",
    slug: "coca-cola",
    descripcion: "",
    precio: 7000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-coca-cola-zero",
    nombre: "Coca-Cola Zero",
    slug: "coca-cola-zero",
    descripcion: "",
    precio: 7000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-quatro",
    nombre: "Quatro",
    slug: "quatro",
    descripcion: "",
    precio: 7000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-kola",
    nombre: "Kola",
    slug: "kola",
    descripcion: "",
    precio: 7000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },
  {
    id: "prod-sprite",
    nombre: "Sprite",
    slug: "sprite",
    descripcion: "",
    precio: 7000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "gaseosas-y-bebidas",
  },

  // Cervezas
  {
    id: "prod-ctg-craft-beer",
    nombre: "CTG Craft Beer Golden Ale",
    slug: "ctg-craft-beer-golden-ale",
    descripcion: "",
    precio: 16000,
    imagenUrl: "/gallery/terraza-cervezas.jpg",
    disponible: true,
    categoriaSlug: "cervezas",
  },

  // Cócteles
  {
    id: "prod-mojito-pisao",
    nombre: "Mojito PISÁO",
    slug: "mojito-pisao",
    descripcion: "",
    precio: 30000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "cocteles",
  },
  {
    id: "prod-margarita-pisao",
    nombre: "Margarita PISÁO",
    slug: "margarita-pisao",
    descripcion: "",
    precio: 30000,
    imagenUrl: null,
    disponible: true,
    categoriaSlug: "cocteles",
  },
];
