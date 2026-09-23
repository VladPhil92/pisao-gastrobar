export const ROLES = ["ADMIN", "CAJERO", "COCINA"] as const;
export type Rol = (typeof ROLES)[number];

/** Rutas del backoffice y los roles habilitados para cada una. */
export const PERMISOS_ADMIN: Record<string, Rol[]> = {
  "/admin/dashboard": ["ADMIN", "CAJERO", "COCINA"],
  "/admin/pedidos": ["ADMIN", "CAJERO", "COCINA"],
  "/admin/menu": ["ADMIN"],
  "/admin/reservas": ["ADMIN", "CAJERO"],
  "/admin/reportes": ["ADMIN"],
  "/admin/ia": ["ADMIN"],
  "/admin/acciones": ["ADMIN"],
  "/admin/experimentos": ["ADMIN"],
  "/admin/politicas": ["ADMIN"],
  "/admin/comportamiento": ["ADMIN"],
};

export function tieneAcceso(ruta: string, rol: Rol) {
  const permitido = PERMISOS_ADMIN[ruta];
  return permitido ? permitido.includes(rol) : false;
}
