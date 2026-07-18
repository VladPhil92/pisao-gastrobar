export interface GalleryPhoto {
  slug: string;
  /** Nombre de archivo completo (con extensión) dentro de /public/gallery/. */
  file: string;
  alt: string;
  categoria: "comida" | "terraza";
  /** Dimensiones reales del archivo en /public/gallery/, en px. */
  width: number;
  height: number;
}

/**
 * Fotografía real de PISÁO. Los archivos viven en /public/gallery/,
 * nombrados por plato.
 */
export const galleryPhotos: GalleryPhoto[] = [
  {
    slug: "entrada_patacon_queso",
    file: "entrada_patacon_queso.jpg",
    alt: "Patacón con queso costeño rayado y hogao",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "entrada_patacon_chicharron",
    file: "entrada_patacon_chicharron.jpg",
    alt: "Patacón con chicharrón, queso costeño y cebolla encurtida",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "marranitas",
    file: "marranitas.jpg",
    alt: "Marranitas de plátano maduro rellenas de chicharrón",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "palitos_pisao",
    file: "palitos_pisao.jpg",
    alt: "Palitos PISÁO: patacón en forma de papas fritas con costilla y salsas",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "pataconCosteno",
    file: "pataconCosteno.jpg",
    alt: "Patacón Costeño con pollo y carne desmechada",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacon_callejero",
    file: "patacon_callejero.jpg",
    alt: "Patacón Callejero con papa ripio y queso mozzarella",
    categoria: "comida",
    width: 1600,
    height: 855,
  },
  {
    slug: "patacon_montanero",
    file: "patacon_montanero.jpg",
    alt: "Patacón Montañero con chicharrón, chorizo y guacamole",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "pataconFrontera",
    file: "pataconFrontera.jpg",
    alt: "Patacón Frontera con carne desmechada, jalapeños y guacamole",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacon_vegetariano",
    file: "patacon_vegetariano.jpg",
    alt: "Patacón Vegetariano con dip de champiñones y vegetales asados",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "pataconBurger",
    file: "pataconBurger.jpg",
    alt: "Patacón Burger con carne, queso cheddar y relish",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "pisaoBurger",
    file: "pisaoBurger.jpg",
    alt: "PISÁO Burger cortada a la mitad con ripio de plátano",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "laguna_azul_burger",
    file: "laguna_azul_burger.jpg",
    alt: "Laguna Azul Burger con queso azul y cebolla caramelizada",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "miniBurger",
    file: "miniBurger.jpg",
    alt: "Mini Burger PISÁO",
    categoria: "comida",
    width: 1536,
    height: 1024,
  },
  {
    slug: "ceviche_chicharron",
    file: "ceviche_chicharron.jpg",
    alt: "Ceviche de chicharrón sobre patacón con guacamole",
    categoria: "comida",
    width: 1402,
    height: 1122,
  },
  {
    slug: "pisaoBowl",
    file: "pisaoBowl.jpg",
    alt: "Bowl PISÁO con pollo, queso, maíz, pico de gallo y guacamole",
    categoria: "comida",
    width: 1023,
    height: 1537,
  },
  {
    slug: "cayeyeSencillo",
    file: "cayeyeSencillo.jpg",
    alt: "Cayeye de plátano verde con hogao y queso",
    categoria: "comida",
    width: 1536,
    height: 1024,
  },
  {
    slug: "cayeyeChicharron",
    file: "cayeyeChicharron.jpg",
    alt: "Cayeye de plátano verde con chicharrones",
    categoria: "comida",
    width: 1254,
    height: 1254,
  },
  {
    slug: "cayeyeCostilla",
    file: "cayeyeCostilla.jpg",
    alt: "Cayeye de plátano verde con costilla glaseada en panela",
    categoria: "comida",
    width: 1122,
    height: 1402,
  },
  {
    slug: "postre-platano-flambeado",
    file: "postre-platano-flambeado.jpg",
    alt: "Plátano flambeado con helado",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "pisao-kids",
    file: "pisao-kids.jpg",
    alt: "Bowl PISÁO Kids con tostones y tiras de pollo",
    categoria: "comida",
    width: 1254,
    height: 1254,
  },
  {
    slug: "terraza-cervezas",
    file: "terraza-cervezas.jpg",
    alt: "Cervezas artesanales en la terraza panorámica al atardecer",
    categoria: "terraza",
    width: 1086,
    height: 1448,
  },
  {
    slug: "terraza-atardecer",
    file: "terraza-atardecer.jpg",
    alt: "Vista de la terraza de PISÁO al atardecer sobre Cartagena",
    categoria: "terraza",
    width: 1086,
    height: 1448,
  },
];

/**
 * Fotos que no aparecen en la galería pública (ej. bebidas) pero cuyas
 * dimensiones reales igual se necesitan para calcular el aspect ratio
 * correcto en las páginas de detalle de producto.
 */
const otherPhotoDimensions: Pick<GalleryPhoto, "slug" | "width" | "height">[] =
  [
    { slug: "limonadaTradicional", width: 1122, height: 1402 },
    { slug: "limonadaCoco", width: 1122, height: 1402 },
    { slug: "limonadaCerezada", width: 1122, height: 1402 },
    { slug: "soda_frutosRojos", width: 1086, height: 1448 },
    { slug: "sodaMango", width: 1086, height: 1448 },
    { slug: "sodaMaracuya", width: 1086, height: 1448 },
    { slug: "sodaCerezada", width: 1086, height: 1448 },
    { slug: "agua", width: 1200, height: 1200 },
    { slug: "aguaconGas", width: 1000, height: 1000 },
    { slug: "cocolaOriginal", width: 550, height: 550 },
    { slug: "cocolaZero", width: 800, height: 800 },
    { slug: "quatro", width: 810, height: 891 },
    { slug: "kolaRoman", width: 447, height: 447 },
    { slug: "sprite", width: 447, height: 447 },
    { slug: "limonada_hierbaBuena", width: 1122, height: 1402 },
  ];

const dimensionsBySlug = new Map(
  [...galleryPhotos, ...otherPhotoDimensions].map((p) => [
    p.slug,
    { width: p.width, height: p.height },
  ]),
);

/**
 * Devuelve el ratio ancho/alto real de una foto de /public/gallery/ a
 * partir de su ruta (ej. "/gallery/patacon_callejero.jpg"), para poder
 * mostrarla sin recortarla forzando un contenedor de proporción fija.
 * Si la ruta no corresponde a una foto conocida, devuelve un cuadrado.
 */
export function getPhotoAspectRatio(imagenUrl?: string | null): number {
  if (!imagenUrl) return 1;

  const slug = imagenUrl
    .split("/")
    .pop()
    ?.replace(/\.\w+$/, "");
  const dims = slug ? dimensionsBySlug.get(slug) : undefined;

  return dims ? dims.width / dims.height : 1;
}
