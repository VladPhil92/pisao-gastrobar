import { z } from "zod";
import { MAX_AUTOMATIC_RESERVATION_PEOPLE } from "@/lib/reservas/policy";

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
  personas: z
    .number()
    .int()
    .min(1)
    .max(
      MAX_AUTOMATIC_RESERVATION_PEOPLE,
      `Las reservas automáticas admiten hasta ${MAX_AUTOMATIC_RESERVATION_PEOPLE} personas`,
    ),
  notas: z
    .string()
    .trim()
    .max(500, "Las notas no pueden superar 500 caracteres")
    .optional(),
});

export type ReservaFormValues = z.infer<typeof reservaSchema>;
