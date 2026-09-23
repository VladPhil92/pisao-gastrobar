import { bogotaDateString } from "@/lib/reservas/availability";

export type ReservationDraft = {
  nombre?: string;
  telefono?: string;
  email?: string;
  fecha?: string;
  hora?: string;
  personas?: number;
  notas?: string;
  missing: Array<"nombre" | "telefono" | "fecha" | "hora" | "personas">;
  ready: boolean;
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePeople(text: string) {
  const normalized = normalize(text);
  const matches: number[] = [];

  for (const pattern of [
    /(?:somos|seremos|para|mesa\s+para)\s+(\d{1,2})\b/g,
    /\b(\d{1,2})\s+(?:personas?|adultos?|comensales?)\b/g,
  ]) {
    for (const match of normalized.matchAll(pattern)) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 30) matches.push(value);
    }
  }

  return matches.at(-1);
}

function parsePhone(text: string) {
  const matches = [
    ...text.matchAll(/(?:\+?57[\s-]?)?(3\d{2}[\s-]?\d{3}[\s-]?\d{4})\b/g),
  ];
  const raw = matches.at(-1)?.[0];
  if (!raw) return undefined;

  const digits = raw.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("57") ? `+${digits}` : digits;
}

function parseEmail(text: string) {
  const matches = [
    ...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi),
  ];
  return matches.at(-1)?.[0];
}

function parseName(text: string) {
  const patterns = [
    /(?:a\s+nombre\s+de|me\s+llamo|mi\s+nombre\s+es|nombre\s*[:=])\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,80})/gi,
  ];

  const matches: string[] = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const cleaned = match[1]
        .split(/[,.;\n]|\s+(?:mi\s+tel[eé]fono|tel[eé]fono|celular|correo|email)\b/i)[0]
        .trim()
        .replace(/\s{2,}/g, " ");
      if (cleaned.length >= 2 && cleaned.length <= 80) matches.push(cleaned);
    }
  }

  return matches.at(-1);
}

function parseExplicitDate(text: string) {
  const isoMatches = [...text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)];
  const iso = isoMatches.at(-1);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slashMatches = [
    ...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g),
  ];
  const slash = slashMatches.at(-1);
  if (slash) {
    return `${slash[3]}-${String(Number(slash[2])).padStart(2, "0")}-${String(
      Number(slash[1]),
    ).padStart(2, "0")}`;
  }

  const normalized = normalize(text);
  if (/pasado\s+manana/.test(normalized)) return bogotaDateString(new Date(), 2);
  if (/\bmanana\b/.test(normalized)) return bogotaDateString(new Date(), 1);
  if (/\bhoy\b/.test(normalized)) return bogotaDateString(new Date(), 0);

  return undefined;
}

function normalizeHour(hour: number, minute: number, period?: string) {
  let normalizedHour = hour;
  if (period) {
    const p = normalize(period).replace(/[^apm]/g, "");
    if (p.startsWith("p") && normalizedHour < 12) normalizedHour += 12;
    if (p.startsWith("a") && normalizedHour === 12) normalizedHour = 0;
  }

  if (normalizedHour < 0 || normalizedHour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTime(text: string) {
  const withPeriod = [
    ...text.matchAll(/\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)\b/gi),
  ];
  const periodMatch = withPeriod.at(-1);
  if (periodMatch) {
    return normalizeHour(
      Number(periodMatch[1]),
      Number(periodMatch[2] ?? "0"),
      periodMatch[3],
    );
  }

  const twentyFourHour = [...text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)];
  const time = twentyFourHour.at(-1);
  if (time) return normalizeHour(Number(time[1]), Number(time[2]));

  return undefined;
}

export function analyzeReservationConversation(
  messages: ConversationMessage[],
): ReservationDraft | null {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (!userMessages.length) return null;

  const transcript = userMessages.join("\n");
  const normalized = normalize(transcript);
  const hasReservationIntent =
    /(reserv|mesa|visitar|visita|cupo|disponibilidad|esta\s+noche|hoy|manana|fecha|hora)/.test(
      normalized,
    );

  if (!hasReservationIntent) return null;

  const nombre = parseName(transcript);
  const telefono = parsePhone(transcript);
  const email = parseEmail(transcript);
  const fecha = parseExplicitDate(transcript);
  const hora = parseTime(transcript);
  const personas = parsePeople(transcript);

  const missing: ReservationDraft["missing"] = [];
  if (!fecha) missing.push("fecha");
  if (!hora) missing.push("hora");
  if (!personas) missing.push("personas");
  if (!nombre) missing.push("nombre");
  if (!telefono) missing.push("telefono");

  return {
    nombre,
    telefono,
    email,
    fecha,
    hora,
    personas,
    missing,
    ready: missing.length === 0,
  };
}

const labels: Record<ReservationDraft["missing"][number], string> = {
  fecha: "la fecha",
  hora: "la hora",
  personas: "cuántas personas son",
  nombre: "el nombre para la reserva",
  telefono: "un teléfono de contacto",
};

export function reservationFallbackText(draft: ReservationDraft | null) {
  if (!draft) return null;

  if (draft.ready) {
    return "Ya tengo los datos necesarios. Revisa la tarjeta de reserva que aparece debajo y pulsa “Confirmar reserva”. El calendario volverá a validar la capacidad y, si sigue disponible, quedará confirmada al instante.";
  }

  const next = draft.missing.slice(0, 2).map((field) => labels[field]);
  return `Perfecto. Para preparar la solicitud necesito ${next.join(" y ")}.`;
}

export function reservationContextForModel(draft: ReservationDraft | null) {
  if (!draft) return "No hay una intención de reserva activa.";

  const values = [
    draft.fecha ? `Fecha: ${draft.fecha}` : null,
    draft.hora ? `Hora: ${draft.hora}` : null,
    draft.personas ? `Personas: ${draft.personas}` : null,
    draft.nombre ? `Nombre: ${draft.nombre}` : null,
    draft.telefono ? `Teléfono: ${draft.telefono}` : null,
    draft.email ? `Correo: ${draft.email}` : null,
  ].filter(Boolean);

  return [
    "ESTADO DE SOLICITUD DE RESERVA",
    ...values,
    draft.missing.length
      ? `Falta: ${draft.missing.map((field) => labels[field]).join(", ")}`
      : "Datos mínimos completos.",
    draft.ready
      ? "La interfaz mostrará un botón de confirmación. No digas que la reserva ya fue creada hasta que el backend responda exitosamente; si responde exitosamente, queda CONFIRMADA automáticamente."
      : "Haz solo la pregunta mínima para obtener los datos faltantes.",
  ].join("\n");
}
