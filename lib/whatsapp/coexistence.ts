export type WhatsAppInboundMessage = {
  id: string;
  from: string;
  text: string;
  phoneNumberId?: string;
};

export type WhatsAppMessageEcho = {
  id: string;
  to: string;
  text?: string;
  phoneNumberId?: string;
};

export type WhatsAppCoexistenceSignal =
  | { type: "history"; phoneNumberId?: string; eventKey: string }
  | { type: "smb_app_state_sync"; phoneNumberId?: string; eventKey: string }
  | { type: "account_update"; phoneNumberId?: string; eventKey: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function textFromMessage(message: Record<string, unknown>) {
  const type = typeof message.type === "string" ? message.type : "";

  if (type === "text") {
    const text = asRecord(message.text);
    return typeof text?.body === "string" ? text.body : null;
  }

  if (type === "button") {
    const button = asRecord(message.button);
    return typeof button?.text === "string" ? button.text : null;
  }

  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const buttonReply = asRecord(interactive?.button_reply);
    if (typeof buttonReply?.title === "string") return buttonReply.title;
    const listReply = asRecord(interactive?.list_reply);
    if (typeof listReply?.title === "string") return listReply.title;
  }

  return null;
}

function phoneNumberIdFromValue(value: Record<string, unknown> | null) {
  const metadata = asRecord(value?.metadata);
  return typeof metadata?.phone_number_id === "string"
    ? metadata.phone_number_id
    : undefined;
}

export function parseWhatsAppWebhook(payload: unknown) {
  const root = asRecord(payload);
  const entries = Array.isArray(root?.entry) ? root.entry : [];

  const inbound: WhatsAppInboundMessage[] = [];
  const echoes: WhatsAppMessageEcho[] = [];
  const signals: WhatsAppCoexistenceSignal[] = [];

  for (const entryValue of entries) {
    const entry = asRecord(entryValue);
    const entryId = typeof entry?.id === "string" ? entry.id : "unknown";
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const changeValue of changes) {
      const change = asRecord(changeValue);
      const field = typeof change?.field === "string" ? change.field : "";
      const value = asRecord(change?.value);
      const phoneNumberId = phoneNumberIdFromValue(value);

      if (field === "messages") {
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const messageValue of messages) {
          const message = asRecord(messageValue);
          if (!message) continue;

          const id = typeof message.id === "string" ? message.id : "";
          const from = typeof message.from === "string" ? message.from : "";
          const text = textFromMessage(message)?.trim().slice(0, 1600) ?? "";

          if (id && from && text) {
            inbound.push({ id, from, text, phoneNumberId });
          }
        }
      }

      if (field === "smb_message_echoes") {
        const messageEchoes = Array.isArray(value?.message_echoes)
          ? value.message_echoes
          : [];

        for (const echoValue of messageEchoes) {
          const echo = asRecord(echoValue);
          if (!echo) continue;

          const id = typeof echo.id === "string" ? echo.id : "";
          const to = typeof echo.to === "string" ? echo.to : "";
          const text = textFromMessage(echo)?.trim().slice(0, 1600);

          if (id && to) {
            echoes.push({ id, to, text, phoneNumberId });
          }
        }
      }

      if (
        field === "history" ||
        field === "smb_app_state_sync" ||
        field === "account_update"
      ) {
        const timestamp =
          typeof entry?.time === "number" ? String(entry.time) : "no-time";
        signals.push({
          type: field,
          phoneNumberId,
          eventKey: `${field}:${entryId}:${timestamp}`,
        });
      }
    }
  }

  return { inbound, echoes, signals };
}
