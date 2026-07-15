import { z } from "zod";

export const crearPedidoSchema = z.object({
  cliente: z.object({
    nombre: z.string().min(2),
    telefono: z.string().min(7),
    email: z.string().email().optional(),
  }),
  tipoEntrega: z.enum(["DOMICILIO", "RECOGIDA"]),
  direccionEntrega: z.string().optional(),
  notas: z.string().optional(),
  items: z
    .array(
      z.object({
        productoId: z.string(),
        nombre: z.string(),
        slug: z.string(),
        precio: z.number().positive(),
        imagenUrl: z.string().nullable().optional(),
        cantidad: z.number().int().positive(),
      }),
    )
    .min(1, "El carrito está vacío"),
  metodoPago: z.enum(["QR_TRANSFERENCIA", "CRIPTO", "TARJETA"]),
});
