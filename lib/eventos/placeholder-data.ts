export interface EventoPlaceholder {
  id: string;
  titulo: string;
  slug: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
}

/** Datos de ejemplo — en producción viene de prisma.evento.findMany(). */
export const eventosPlaceholder: EventoPlaceholder[] = [
  {
    id: "evt-1",
    titulo: "Sunset Sessions",
    slug: "sunset-sessions",
    descripcion: "DJ en vivo con vista al atardecer sobre la bahía.",
    fecha: "2026-08-01",
    horaInicio: "18:00",
  },
  {
    id: "evt-2",
    titulo: "Noche de Jazz Caribeño",
    slug: "noche-de-jazz-caribeno",
    descripcion: "Trío en vivo y carta especial de cócteles.",
    fecha: "2026-08-15",
    horaInicio: "19:30",
  },
];
