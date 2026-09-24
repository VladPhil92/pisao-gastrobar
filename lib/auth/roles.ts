export const ROLES = ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"] as const;
export type Rol = (typeof ROLES)[number];

const ALL_ADMIN: Rol[] = ["SUPER_ADMIN", "ADMIN"];
const ALL_STAFF: Rol[] = ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"];

/** Rutas del backoffice y los roles habilitados para cada una. */
export const PERMISOS_ADMIN: Record<string, Rol[]> = {
  "/admin/dashboard": ALL_STAFF,
  "/admin/pedidos": ALL_STAFF,
  "/admin/menu": ALL_ADMIN,
  "/admin/inventario": ALL_ADMIN,
  "/admin/reservas": ["SUPER_ADMIN", "ADMIN", "CAJERO"],
  "/admin/reportes": ALL_ADMIN,
  "/admin/ia": ALL_ADMIN,
  "/admin/acciones": ALL_ADMIN,
  "/admin/experimentos": ALL_ADMIN,
  "/admin/politicas": ALL_ADMIN,
  "/admin/comportamiento": ALL_ADMIN,
  "/admin/certificacion": ALL_ADMIN,
  "/admin/cripto": ALL_ADMIN,
  "/admin/whatsapp": ALL_ADMIN,
};

export function tieneAcceso(ruta: string, rol: Rol) {
  const permitido = PERMISOS_ADMIN[ruta];
  return permitido ? permitido.includes(rol) : false;
}

export function isAdminRole(rol: string | undefined): rol is "SUPER_ADMIN" | "ADMIN" {
  return rol === "SUPER_ADMIN" || rol === "ADMIN";
}
