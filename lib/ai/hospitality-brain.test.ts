import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeHospitalityConversation,
  evolveHospitalityProfile,
  hospitalityContextForModel,
  sanitizeHospitalityProfile,
} from "./hospitality-brain";

test("detecta huésped listo para reservar y estilo directo", () => {
  const analysis = analyzeHospitalityConversation([
    { role: "user", content: "Mesa para 4 mañana a las 8 pm" },
  ]);

  assert.equal(analysis.intent, "reservation");
  assert.equal(analysis.guestState, "ready_to_book");
  assert.equal(analysis.conversationStyle, "direct");
  assert.equal(analysis.responseMode, "efficient");
});

test("detecta celebración y mantiene tono de hospitalidad", () => {
  const analysis = analyzeHospitalityConversation([
    {
      role: "user",
      content:
        "Vamos a celebrar nuestro aniversario y quisiera saber qué nos recomiendas para compartir y tomar algo.",
    },
  ]);

  assert.equal(analysis.intent, "event");
  assert.equal(analysis.guestState, "celebrating");
  assert.equal(analysis.responseMode, "celebratory");
  assert.equal(analysis.conversationStyle, "exploratory");
});

test("extrae únicamente preferencias gastronómicas permitidas", () => {
  const analysis = analyzeHospitalityConversation([
    {
      role: "user",
      content:
        "Me gustan los patacones, la cerveza Porter y quiero algo para compartir.",
    },
  ]);

  assert.deepEqual(analysis.preferredFoodSignals.sort(), [
    "para compartir",
    "patacón",
  ]);
  assert.deepEqual(analysis.preferredDrinkSignals.sort(), [
    "Porter",
    "cerveza artesanal",
  ]);
});

test("perfil entrante se sanea y no acepta campos arbitrarios", () => {
  const profile = sanitizeHospitalityProfile({
    version: 99,
    interactionCount: 999999,
    conversationStyle: "inventado",
    preferredFoodSignals: ["patacón", "dato sensible"],
    preferredDrinkSignals: ["Porter", "otro"],
    lastIntent: "hack",
    lastGuestState: "browsing",
    secreto: "no debe sobrevivir",
  });

  assert.equal(profile.version, 1);
  assert.equal(profile.interactionCount, 500);
  assert.equal(profile.conversationStyle, undefined);
  assert.deepEqual(profile.preferredFoodSignals, ["patacón"]);
  assert.deepEqual(profile.preferredDrinkSignals, ["Porter"]);
  assert.equal(profile.lastIntent, undefined);
  assert.equal(profile.lastGuestState, "browsing");
  assert.equal("secreto" in profile, false);
});

test("evoluciona memoria estructurada sin texto libre", () => {
  const current = sanitizeHospitalityProfile({
    interactionCount: 2,
    preferredFoodSignals: ["patacón"],
  });
  const analysis = analyzeHospitalityConversation(
    [{ role: "user", content: "Hoy quiero una cerveza Golden" }],
    current,
  );
  const next = evolveHospitalityProfile(current, analysis);

  assert.equal(next.interactionCount, 3);
  assert.ok(next.preferredFoodSignals.includes("patacón"));
  assert.ok(next.preferredDrinkSignals.includes("Golden Pale Ale"));
  assert.equal(next.lastIntent, analysis.intent);
});

test("contexto del modelo no expone memoria como registro de vigilancia", () => {
  const current = sanitizeHospitalityProfile({
    interactionCount: 3,
    preferredDrinkSignals: ["Porter"],
  });
  const analysis = analyzeHospitalityConversation(
    [{ role: "user", content: "¿Qué me recomiendas hoy?" }],
    current,
  );
  const context = hospitalityContextForModel(analysis, current);

  assert.match(context, /HOSPITALITY BRAIN/);
  assert.match(context, /Porter/);
  assert.match(context, /jamás digas “según nuestros registros”/);
});

test("a new menu request replaces an earlier reservation and complaint", () => {
  const analysis = analyzeHospitalityConversation([
    { role: "user", content: "Quiero reservar una mesa para mañana" },
    { role: "assistant", content: "¿Cuántas personas?" },
    { role: "user", content: "Tuve un problema antes" },
    { role: "assistant", content: "Lamento lo ocurrido" },
    { role: "user", content: "Ahora, ¿qué patacones tienen en el menú?" },
  ]);
  assert.equal(analysis.intent, "menu");
  assert.notEqual(analysis.guestState, "needs_help");
});

test("a short follow-up keeps the current reservation intent", () => {
  const analysis = analyzeHospitalityConversation([
    { role: "user", content: "Quiero reservar mañana a las 7 pm" },
    { role: "assistant", content: "¿Cuántas personas?" },
    { role: "user", content: "4 personas" },
  ]);
  assert.equal(analysis.intent, "reservation");
});

test("Mesa Visual is not misclassified as a booking", () => {
  const analysis = analyzeHospitalityConversation([
    { role: "user", content: "¿Cómo miro mi mesa visual y el pedido?" },
  ]);
  assert.equal(analysis.intent, "order");
});
