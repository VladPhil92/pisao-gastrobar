import { z } from "zod";

export const reservaSchema = z.object({
  nombre: z.string().min(2, "Ingresa tu nombre completo"),
  telefono: z.string().min(7, "Ingresa un teléfono válido"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  fecha: z.string().min(1, "Selecciona una fecha"),
  hora: z.string().min(1, "Selecciona una hora"),
  personas: z.number().int().min(1).max(30),
  notas: z.string().optional(),
});

export type ReservaFormValues = z.infer<typeof reservaSchema>;
