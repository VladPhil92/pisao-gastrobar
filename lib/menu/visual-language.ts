export type MenuCategoryVisual = {
  label: string;
  eyebrow: string;
  description: string;
  badge: string;
};

const categoryVisuals: Record<string, MenuCategoryVisual> = {
  entradas: {
    label: "Entradas",
    eyebrow: "Para abrir la mesa",
    description:
      "Bocados pensados para compartir, pedir otra ronda y empezar sin prisa.",
    badge: "Para compartir",
  },
  "patacones-insignia": {
    label: "Patacones Insignia",
    eyebrow: "La casa empieza aquí",
    description:
      "Crujientes, generosos y cargados de identidad. El corazón de la carta PISÁO.",
    badge: "Insignia PISÁO",
  },
  hamburguesas: {
    label: "Hamburguesas",
    eyebrow: "Brioche, carne y carácter",
    description:
      "Burgers intensas, hechas para comer con las manos y olvidarse del protocolo.",
    badge: "Burger de la casa",
  },
  bowls: {
    label: "Bowls & Cayeye",
    eyebrow: "Caribe al plato",
    description:
      "Texturas, plátano y sabores costeños servidos en versiones para quedarse comiendo.",
    badge: "Caribe servido",
  },
  "menu-infantil": {
    label: "Menú Infantil",
    eyebrow: "Para los pequeños",
    description:
      "Opciones pensadas para que los más pequeños también tengan su plan PISÁO.",
    badge: "PISÁO Kids",
  },
  postre: {
    label: "Postre",
    eyebrow: "El final que se queda",
    description: "Un último antojo para cerrar la mesa como se debe.",
    badge: "Dulce final",
  },
  "sodas-saborizadas": {
    label: "Sodas Saborizadas",
    eyebrow: "Frías, frutales y brillantes",
    description:
      "Bebidas refrescantes para bajar el calor y acompañar sabores intensos.",
    badge: "Refrescante",
  },
  limonadas: {
    label: "Limonadas",
    eyebrow: "Fresco de verdad",
    description:
      "Ácidas, frías y tropicales. El contrapunto perfecto para una mesa cargada.",
    badge: "Refrescante",
  },
  "gaseosas-y-bebidas": {
    label: "Bebidas",
    eyebrow: "Para acompañar",
    description: "Clásicos fríos para completar tu pedido sin complicaciones.",
    badge: "Bebidas",
  },
  cervezas: {
    label: "Cervezas",
    eyebrow: "Artesanal y local",
    description:
      "CTG Craft Beer para acompañar la comida con una cerveza hecha en Cartagena.",
    badge: "CTG Craft Beer",
  },
  cocteles: {
    label: "Cócteles",
    eyebrow: "La noche empieza en la barra",
    description:
      "Cócteles de la casa para alargar la conversación y cambiar el ritmo de la mesa.",
    badge: "Barra PISÁO",
  },
};

const fallbackVisual: MenuCategoryVisual = {
  label: "Carta PISÁO",
  eyebrow: "Sabor caribeño",
  description: "Una carta hecha para comer, compartir y quedarse un rato más.",
  badge: "PISÁO",
};

export function getMenuCategoryVisual(slug?: string | null) {
  return (slug && categoryVisuals[slug]) || fallbackVisual;
}
