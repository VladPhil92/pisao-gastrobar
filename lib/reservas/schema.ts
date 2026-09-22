import { z } from "zod";

export const reservaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo")
    .max(120, "El nombre es demasiado largo"),
  telefono: z
    .string()
    .trim()
    .min(7, "Ingresa un teléfono válido")
    .max(20, "Ingresa un teléfono válido")
    .regex(/^[+0-9() .-]+$/, "Ingresa un teléfono válido"),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .max(160, "Correo inválido")
    .optional()
    .or(z.literal("")),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida"),
  hora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora válida"),
  personas: z.number().int().min(1).max(30),
  notas: z
    .string()
    .trim()
    .max(500, "Las notas no pueden superar 500 caracteres")
    .optional(),
});

export type ReservaFormValues = z.infer<typeof reservaSchema>;
