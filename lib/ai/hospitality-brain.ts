export type GuestState =
  | "browsing"
  | "deciding"
  | "ready_to_book"
  | "ready_to_order"
  | "celebrating"
  | "needs_help";

export type ConversationStyle = "direct" | "warm" | "exploratory";

export type VisitStage = "pre_visit" | "in_restaurant" | "post_visit";

export type HospitalityIntent =
  | "reservation"
  | "menu"
  | "order"
  | "event"
  | "service"
  | "general";

export type HospitalityProfile = {
  version: 1;
  interactionCount: number;
  conversationStyle?: ConversationStyle;
  preferredFoodSignals: string[];
  preferredDrinkSignals: string[];
  lastIntent?: HospitalityIntent;
  lastGuestState?: GuestState;
};

export type HospitalityAnalysis = {
  guestState: GuestState;
  conversationStyle: ConversationStyle;
  visitStage: VisitStage;
  intent: HospitalityIntent;
  preferredFoodSignals: string[];
  preferredDrinkSignals: string[];
  responseMode: "efficient" | "guiding" | "celebratory" | "recovery" | "hosting";
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const FOOD_SIGNALS = [
  ["patacon", "patacón"],
  ["hamburguesa", "hamburguesa"],
  ["carne", "carne"],
  ["mariscos", "mariscos"],
  ["vegetariano", "vegetariano"],
  ["compartir", "para compartir"],
  ["postre", "postre"],
] as const;

const DRINK_SIGNALS = [
  ["cerveza", "cerveza artesanal"],
  ["porter", "Porter"],
  ["irish", "Irish Red Ale"],
  ["golden", "Golden Pale Ale"],
  ["limonada", "limonada"],
  ["coctel", "cóctel"],
  ["sin alcohol", "sin alcohol"],
] as const;

const MAX_SIGNALS = 6;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueSignals(values: string[]) {
  return [...new Set(values)].slice(0, MAX_SIGNALS);
}

function userTranscript(messages: ConversationMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n");
}

function detectSignals(
  transcript: string,
  dictionary: ReadonlyArray<readonly [string, string]>,
) {
  const normalized = normalize(transcript);
  return dictionary
    .filter(([needle]) => normalized.includes(normalize(needle)))
    .map(([, label]) => label);
}

function inferIntent(transcript: string): HospitalityIntent {
  const text = normalize(transcript);

  if (/(queja|reclamo|problema|malo|terrible|demora|inconforme|devolucion|mal servicio)/.test(text)) {
    return "service";
  }
  if (/(reserv|mesa|cupo|disponibilidad|visitar|esta noche|manana|hoy)/.test(text)) {
    return "reservation";
  }
  if (/(evento|cumple|cumpleanos|aniversario|celebr|corporativo|fiesta)/.test(text)) {
    return "event";
  }
  if (/(domicilio|pedido|pedir|llevar|recoger)/.test(text)) {
    return "order";
  }
  if (/(menu|comer|hamburguesa|patacon|cerveza|coctel|precio|recomienda|recomendacion)/.test(text)) {
    return "menu";
  }

  return "general";
}

function inferVisitStage(transcript: string): VisitStage {
  const text = normalize(transcript);

  if (
    /(estoy aqui|ya estamos aqui|estamos en el restaurante|estamos sentados|desde la mesa|en la mesa|acabamos de llegar)/.test(
      text,
    )
  ) {
    return "in_restaurant";
  }

  if (
    /(estuve ayer|fuimos ayer|fui ayer|la ultima vez|despues de la visita|ya fuimos|estuvimos alli|estuvimos alla)/.test(
      text,
    )
  ) {
    return "post_visit";
  }

  return "pre_visit";
}

function inferConversationStyle(messages: ConversationMessage[]): ConversationStyle {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (!userMessages.length) return "warm";

  const latest = userMessages.at(-1) ?? "";
  const averageLength =
    userMessages.reduce((sum, message) => sum + message.length, 0) /
    userMessages.length;
  const text = normalize(userMessages.join(" "));

  if (
    latest.length <= 70 &&
    averageLength <= 100 &&
    !/(cuentame|explicame|que opciones|que me recomiendas|recomendacion)/.test(text)
  ) {
    return "direct";
  }

  if (
    averageLength > 150 ||
    /(cuentame|explicame|quiero conocer|que opciones|que me recomiendas|recomendacion|ayudame a escoger)/.test(
      text,
    )
  ) {
    return "exploratory";
  }

  return "warm";
}

function inferGuestState(
  transcript: string,
  intent: HospitalityIntent,
): GuestState {
  const text = normalize(transcript);

  if (
    intent === "service" ||
    /(molesto|molesta|inconforme|urgente|necesito ayuda|no funciona|no pude)/.test(text)
  ) {
    return "needs_help";
  }

  if (intent === "event" || /(cumple|aniversario|celebr)/.test(text)) {
    return "celebrating";
  }

  if (
    intent === "reservation" &&
    /(quiero reservar|reserva|mesa para|somos \d+|para \d+ personas)/.test(text)
  ) {
    return "ready_to_book";
  }

  if (
    intent === "order" ||
    /(quiero pedir|voy a pedir|agregar|anade|añade|lo quiero)/.test(text)
  ) {
    return "ready_to_order";
  }

  if (
    /(que me recomiendas|recomiendame|no se que|cual escoger|que opciones|ayudame a escoger|entre .* y .*)/.test(
      text,
    )
  ) {
    return "deciding";
  }

  return "browsing";
}

function responseModeFor(state: GuestState) {
  switch (state) {
    case "ready_to_book":
    case "ready_to_order":
      return "efficient" as const;
    case "deciding":
      return "guiding" as const;
    case "celebrating":
      return "celebratory" as const;
    case "needs_help":
      return "recovery" as const;
    default:
      return "hosting" as const;
  }
}

function isConversationStyle(value: unknown): value is ConversationStyle {
  return value === "direct" || value === "warm" || value === "exploratory";
}

function isHospitalityIntent(value: unknown): value is HospitalityIntent {
  return ["reservation", "menu", "order", "event", "service", "general"].includes(
    String(value),
  );
}

function isGuestState(value: unknown): value is GuestState {
  return [
    "browsing",
    "deciding",
    "ready_to_book",
    "ready_to_order",
    "celebrating",
    "needs_help",
  ].includes(String(value));
}

function sanitizeSignalList(value: unknown, allowed: readonly string[]) {
  if (!Array.isArray(value)) return [];
  return uniqueSignals(
    value.filter(
      (item): item is string =>
        typeof item === "string" && allowed.includes(item),
    ),
  );
}

const allowedFoodSignals = FOOD_SIGNALS.map(([, label]) => label);
const allowedDrinkSignals = DRINK_SIGNALS.map(([, label]) => label);

export function sanitizeHospitalityProfile(value: unknown): HospitalityProfile {
  if (!value || typeof value !== "object") {
    return {
      version: 1,
      interactionCount: 0,
      preferredFoodSignals: [],
      preferredDrinkSignals: [],
    };
  }

  const candidate = value as Partial<HospitalityProfile>;

  return {
    version: 1,
    interactionCount:
      typeof candidate.interactionCount === "number" &&
      Number.isInteger(candidate.interactionCount)
        ? Math.min(Math.max(candidate.interactionCount, 0), 500)
        : 0,
    conversationStyle: isConversationStyle(candidate.conversationStyle)
      ? candidate.conversationStyle
      : undefined,
    preferredFoodSignals: sanitizeSignalList(
      candidate.preferredFoodSignals,
      allowedFoodSignals,
    ),
    preferredDrinkSignals: sanitizeSignalList(
      candidate.preferredDrinkSignals,
      allowedDrinkSignals,
    ),
    lastIntent: isHospitalityIntent(candidate.lastIntent)
      ? candidate.lastIntent
      : undefined,
    lastGuestState: isGuestState(candidate.lastGuestState)
      ? candidate.lastGuestState
      : undefined,
  };
}

export function analyzeHospitalityConversation(
  messages: ConversationMessage[],
  profile?: HospitalityProfile,
): HospitalityAnalysis {
  const transcript = userTranscript(messages);
  const intent = inferIntent(transcript);
  const conversationStyle = inferConversationStyle(messages);
  const guestState = inferGuestState(transcript, intent);

  return {
    guestState,
    conversationStyle:
      messages.filter((message) => message.role === "user").length <= 1 &&
      profile?.conversationStyle
        ? profile.conversationStyle
        : conversationStyle,
    visitStage: inferVisitStage(transcript),
    intent,
    preferredFoodSignals: uniqueSignals([
      ...(profile?.preferredFoodSignals ?? []),
      ...detectSignals(transcript, FOOD_SIGNALS),
    ]),
    preferredDrinkSignals: uniqueSignals([
      ...(profile?.preferredDrinkSignals ?? []),
      ...detectSignals(transcript, DRINK_SIGNALS),
    ]),
    responseMode: responseModeFor(guestState),
  };
}

export function evolveHospitalityProfile(
  current: HospitalityProfile,
  analysis: HospitalityAnalysis,
): HospitalityProfile {
  return {
    version: 1,
    interactionCount: Math.min(current.interactionCount + 1, 500),
    conversationStyle: analysis.conversationStyle,
    preferredFoodSignals: analysis.preferredFoodSignals,
    preferredDrinkSignals: analysis.preferredDrinkSignals,
    lastIntent: analysis.intent,
    lastGuestState: analysis.guestState,
  };
}

function styleInstruction(style: ConversationStyle) {
  switch (style) {
    case "direct":
      return "El visitante es directo: responde breve, concreta y sin explicaciones que no haya pedido.";
    case "exploratory":
      return "El visitante está explorando: orienta con criterio, compara pocas opciones y ayuda a decidir sin abrumar.";
    default:
      return "Mantén una conversación cálida, natural y cercana, con respuestas de longitud moderada.";
  }
}

function stateInstruction(state: GuestState) {
  switch (state) {
    case "ready_to_book":
      return "Está listo para reservar: prioriza completar la acción y pide únicamente el dato faltante.";
    case "ready_to_order":
      return "Está listo para pedir: reduce fricción y conduce a una acción concreta.";
    case "deciding":
      return "Está indeciso: actúa como anfitrión gastronómico y recomienda 1 a 3 opciones con una razón clara.";
    case "celebrating":
      return "Hay una celebración: acompaña la emoción con elegancia y pregunta solo lo que mejore la experiencia.";
    case "needs_help":
      return "Necesita recuperación de servicio: primero resuelve, evita lenguaje corporativo y deriva a una persona cuando sea necesario.";
    default:
      return "Está explorando: recibe, orienta y deja una siguiente acción clara sin presionar.";
  }
}

export function hospitalityContextForModel(
  analysis: HospitalityAnalysis,
  profile: HospitalityProfile,
) {
  const food =
    profile.preferredFoodSignals.length > 0
      ? profile.preferredFoodSignals.join(", ")
      : "sin señales persistidas";
  const drinks =
    profile.preferredDrinkSignals.length > 0
      ? profile.preferredDrinkSignals.join(", ")
      : "sin señales persistidas";

  return [
    "HOSPITALITY BRAIN",
    `Estado del huésped: ${analysis.guestState}`,
    `Etapa de visita: ${analysis.visitStage}`,
    `Estilo conversacional: ${analysis.conversationStyle}`,
    `Intención principal: ${analysis.intent}`,
    `Modo de respuesta: ${analysis.responseMode}`,
    styleInstruction(analysis.conversationStyle),
    stateInstruction(analysis.guestState),
    `Preferencias gastronómicas observadas: ${food}.`,
    `Preferencias de bebida observadas: ${drinks}.`,
    profile.interactionCount > 0
      ? "Ya existe contexto de interacciones anteriores en este navegador. Úsalo solo si aporta valor y jamás digas “según nuestros registros” ni hagas sentir vigilancia."
      : "No existe contexto previo útil todavía; no finjas conocer al visitante.",
    "La memoria es una ayuda de hospitalidad, no una excusa para asumir datos que el visitante no confirmó.",
  ].join("\n");
}
