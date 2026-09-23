import assert from "node:assert/strict";
import test from "node:test";
import { parseWhatsAppWebhook } from "./coexistence";

test("parses inbound messages", () => {
  const result = parseWhatsAppWebhook({
    entry: [{
      id: "waba",
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "pn1" },
          messages: [{
            id: "wamid.in",
            from: "573001112233",
            type: "text",
            text: { body: "Hola" },
          }],
        },
      }],
    }],
  });

  assert.deepEqual(result.inbound, [{
    id: "wamid.in",
    from: "573001112233",
    text: "Hola",
    phoneNumberId: "pn1",
  }]);
});

test("parses SMB message echoes without treating them as inbound", () => {
  const result = parseWhatsAppWebhook({
    entry: [{
      id: "waba",
      changes: [{
        field: "smb_message_echoes",
        value: {
          metadata: { phone_number_id: "pn1" },
          message_echoes: [{
            id: "wamid.echo",
            from: "573186428218",
            to: "573001112233",
            type: "text",
            text: { body: "Te atiendo yo." },
          }],
        },
      }],
    }],
  });

  assert.equal(result.inbound.length, 0);
  assert.deepEqual(result.echoes[0], {
    id: "wamid.echo",
    to: "573001112233",
    text: "Te atiendo yo.",
    phoneNumberId: "pn1",
  });
});

test("identifies coexistence sync signals without retaining payload contents", () => {
  const result = parseWhatsAppWebhook({
    entry: [{
      id: "waba",
      time: 12345,
      changes: [
        { field: "history", value: { metadata: { phone_number_id: "pn1" }, history: [{ secret: "not persisted" }] } },
        { field: "smb_app_state_sync", value: { metadata: { phone_number_id: "pn1" }, state_sync: [{ contact: { full_name: "Private" } }] } },
      ],
    }],
  });

  assert.deepEqual(result.signals.map((item) => item.type), [
    "history",
    "smb_app_state_sync",
  ]);
  assert.equal("payload" in result.signals[0], false);
});
