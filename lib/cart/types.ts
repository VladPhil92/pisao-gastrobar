export type TipoEntrega = "DOMICILIO" | "RECOGIDA";

export interface CartItem {
  productoId: string;
  nombre: string;
  slug: string;
  precio: number;
  imagenUrl?: string | null;
  cantidad: number;
}
