type ReservationNotificationPayload = {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  fecha: string;
  hora: string;
  personas: number;
  notas?: string | null;
};

async function notifyWebhook(payload: ReservationNotificationPayload) {
  const url = process.env.RESERVATION_NOTIFICATION_WEBHOOK_URL;
  if (!url) return;

  const secret = process.env.RESERVATION_NOTIFICATION_WEBHOOK_SECRET;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      event: "reservation.created",
      reservation: payload,
    }),
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

export async function notifyReservationCreated(
  reservation: ReservationNotificationPayload,
) {
  const notifyEmail = process.env.RESERVATION_NOTIFY_EMAIL;

  const tasks: Promise<unknown>[] = [notifyWebhook(reservation)];

  if (notifyEmail) {
    tasks.push(
      sendEmail({
        to: notifyEmail,
        subject: `Nueva reserva PISÁO · ${reservation.fecha} ${reservation.hora}`,
        text: [
          "Nueva solicitud de reserva",
          `Nombre: ${reservation.nombre}`,
          `Teléfono: ${reservation.telefono}`,
          `Fecha: ${reservation.fecha}`,
          `Hora: ${reservation.hora}`,
          `Personas: ${reservation.personas}`,
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
        subject: "Recibimos tu solicitud de reserva en PISÁO",
        text: [
          `Hola ${reservation.nombre},`,
          "",
          "Recibimos tu solicitud de reserva en PISÁO Gastrobar.",
          `Fecha: ${reservation.fecha}`,
          `Hora: ${reservation.hora}`,
          `Personas: ${reservation.personas}`,
          "",
          "La solicitud está pendiente de confirmación por nuestro equipo.",
        ].join("\n"),
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[PISAO RESERVAS] Falló una notificación", result.reason);
    }
  }
}
