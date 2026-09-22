type ReservationNotificationPayload = {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  fecha: string;
  hora: string;
  personas: number;
  notas?: string | null;
  mesas?: string[];
};

type ReservationStatus = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";

type ReservationStatusNotificationPayload = ReservationNotificationPayload & {
  estado: ReservationStatus;
};

async function postWebhook(event: string, payload: object) {
  const url = process.env.RESERVATION_NOTIFICATION_WEBHOOK_URL;
  if (!url) return;

  const secret = process.env.RESERVATION_NOTIFICATION_WEBHOOK_SECRET;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ event, ...payload }),
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    throw new Error(`Webhook de reservas respondió ${response.status}`);
  }
}

async function sendEmail(params: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}`);
  }
}

function logNotificationFailures(results: PromiseSettledResult<unknown>[]) {
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[PISAO RESERVAS] Falló una notificación", result.reason);
    }
  }
}

export async function notifyReservationCreated(
  reservation: ReservationNotificationPayload,
) {
  const notifyEmail = process.env.RESERVATION_NOTIFY_EMAIL;

  const tasks: Promise<unknown>[] = [
    postWebhook("reservation.created", { reservation, autoConfirmed: true }),
  ];

  if (notifyEmail) {
    tasks.push(
      sendEmail({
        to: notifyEmail,
        subject: `Nueva reserva confirmada PISÁO · ${reservation.fecha} ${reservation.hora}`,
        text: [
          "Nueva reserva confirmada automáticamente",
          `Nombre: ${reservation.nombre}`,
          `Teléfono: ${reservation.telefono}`,
          `Fecha: ${reservation.fecha}`,
          `Hora: ${reservation.hora}`,
          `Personas: ${reservation.personas}`,
          reservation.mesas?.length
            ? `Mesa(s): ${reservation.mesas.join(", ")}`
            : null,
          reservation.notas ? `Notas: ${reservation.notas}` : null,
          `ID: ${reservation.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    );
  }

  if (reservation.email) {
    tasks.push(
      sendEmail({
        to: reservation.email,
        subject: "Tu reserva en PISÁO está confirmada",
        text: [
          `Hola ${reservation.nombre},`,
          "",
          "Tu reserva en PISÁO Gastrobar quedó confirmada automáticamente.",
          `Fecha: ${reservation.fecha}`,
          `Hora: ${reservation.hora}`,
          `Personas: ${reservation.personas}`,
          reservation.mesas?.length
            ? `Mesa(s) reservada(s): ${reservation.mesas.join(", ")}`
            : null,
          "",
          "El cupo ya fue descontado del calendario. Te esperamos en la Terraza Panorámica de Mall Plaza Cartagena.",
        ].filter(Boolean).join("\n"),
      }),
    );
  }

  logNotificationFailures(await Promise.allSettled(tasks));
}

function statusEmailCopy(reservation: ReservationStatusNotificationPayload) {
  if (reservation.estado === "CONFIRMADA") {
    return {
      subject: "Tu reserva en PISÁO está confirmada",
      lines: [
        `Hola ${reservation.nombre},`,
        "",
        "Tu reserva en PISÁO Gastrobar fue confirmada.",
        `Fecha: ${reservation.fecha}`,
        `Hora: ${reservation.hora}`,
        `Personas: ${reservation.personas}`,
        "",
        "Te esperamos en la Terraza Panorámica de Mall Plaza Cartagena.",
      ],
    };
  }

  if (reservation.estado === "CANCELADA") {
    return {
      subject: "Actualización de tu reserva en PISÁO",
      lines: [
        `Hola ${reservation.nombre},`,
        "",
        "Tu solicitud de reserva en PISÁO fue cancelada.",
        `Fecha: ${reservation.fecha}`,
        `Hora: ${reservation.hora}`,
        `Personas: ${reservation.personas}`,
        "",
        "Si deseas reprogramarla, puedes volver a solicitar una reserva desde pisaogastrobar.com.",
      ],
    };
  }

  if (reservation.estado === "COMPLETADA") {
    return {
      subject: "Gracias por visitar PISÁO",
      lines: [
        `Hola ${reservation.nombre},`,
        "",
        "Marcamos tu reserva como completada.",
        "Gracias por visitarnos en PISÁO Gastrobar.",
      ],
    };
  }

  return null;
}

export async function notifyReservationStatusChanged(
  reservation: ReservationStatusNotificationPayload,
) {
  const tasks: Promise<unknown>[] = [
    postWebhook("reservation.status_changed", { reservation }),
  ];

  const copy = statusEmailCopy(reservation);
  if (reservation.email && copy) {
    tasks.push(
      sendEmail({
        to: reservation.email,
        subject: copy.subject,
        text: copy.lines.join("\n"),
      }),
    );
  }

  logNotificationFailures(await Promise.allSettled(tasks));
}
