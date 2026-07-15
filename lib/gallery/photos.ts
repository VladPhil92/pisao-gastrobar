export interface GalleryPhoto {
  slug: string;
  alt: string;
  categoria: "comida" | "terraza";
  /** Dimensiones reales del archivo en /public/gallery/, en px. */
  width: number;
  height: number;
}

/**
 * Fotografía real de PISÁO. Los archivos viven en /public/gallery/,
 * optimizados a JPEG desde los originales entregados por el cliente.
 */
export const galleryPhotos: GalleryPhoto[] = [
  {
    slug: "patacon-especial",
    alt: "Patacón cargado con queso y hojuelas crocantes",
    categoria: "comida",
    width: 1600,
    height: 855,
  },
  {
    slug: "patacon-mixto",
    alt: "Patacón con chorizo, carne, guacamole y cebolla encurtida",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "patacon-chicharron",
    alt: "Patacón con chicharrón, hierbas y cebolla encurtida",
    categoria: "comida",
    width: 1402,
    height: 1122,
  },
  {
    slug: "patacon-pollo",
    alt: "Patacón con pollo desmechado, tomate y encurtidos",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacon-carne-guacamole",
    alt: "Patacón con carne desmechada, guacamole y queso",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacones-trio",
    alt: "Trío de patacones con queso y cebolla encurtida",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacones-cerdo",
    alt: "Patacones con cerdo, queso y cebolla",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "patacones-bowl",
    alt: "Bowl de patacones con salsas y queso costeño",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "hamburguesa-clasica",
    alt: "Hamburguesa PISÁO con queso derretido",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "hamburguesa-vegetales",
    alt: "Hamburguesa con lechuga, tomate y cebolla morada",
    categoria: "comida",
    width: 1536,
    height: 1024,
  },
  {
    slug: "hamburguesa-patacon-chips",
    alt: "Hamburguesa cortada a la mitad con chips de patacón",
    categoria: "comida",
    width: 1086,
    height: 1448,
  },
  {
    slug: "bolitas-rellenas",
    alt: "Bolitas rellenas sobre hoja de plátano",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "postre-platano-flambeado",
    alt: "Plátano flambeado con helado",
    categoria: "comida",
    width: 1448,
    height: 1086,
  },
  {
    slug: "pisao-kids",
    alt: "Bowl PISÁO Kids con tostones y tiras de pollo",
    categoria: "comida",
    width: 1254,
    height: 1254,
  },
  {
    slug: "terraza-cervezas",
    alt: "Cervezas artesanales en la terraza panorámica al atardecer",
    categoria: "terraza",
    width: 1086,
    height: 1448,
  },
  {
    slug: "terraza-atardecer",
    alt: "Vista de la terraza de PISÁO al atardecer sobre Cartagena",
    categoria: "terraza",
    width: 1086,
    height: 1448,
  },
];

const dimensionsBySlug = new Map(
  galleryPhotos.map((p) => [p.slug, { width: p.width, height: p.height }]),
);

/**
 * Devuelve el ratio ancho/alto real de una foto de /public/gallery/ a
 * partir de su ruta (ej. "/gallery/patacon-especial.jpg"), para poder
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
