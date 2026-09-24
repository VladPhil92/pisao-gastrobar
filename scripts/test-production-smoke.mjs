import assert from "node:assert/strict";

const baseUrl = (process.env.PISAO_PRODUCTION_URL || "https://pisaogastrobar.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.PISAO_SMOKE_TIMEOUT_MS || 10000);

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "PISAO-Production-Smoke/1.0",
      ...(options.headers || {}),
    },
    ...options,
  });
}

async function main() {
  const [home, menu, reservations, tracking, health, image] = await Promise.all([
    request("/"),
    request("/menu"),
    request("/reservas"),
    request("/pedidos/seguimiento"),
    request("/api/health"),
    request("/api/media/pisao-experience"),
  ]);

  assert.equal(home.status, 200, "Home must return 200");
  assert.equal(menu.status, 200, "Menu must return 200");
  assert.equal(reservations.status, 200, "Reservations must return 200");
  assert.equal(tracking.status, 200, "Order tracking must return 200");
  assert.equal(health.status, 200, "Health endpoint must return 200");
  assert.equal(image.status, 200, "Experience image route must return 200");

  const [homeHtml, healthJson, imageBytes] = await Promise.all([
    home.text(),
    health.json(),
    image.arrayBuffer(),
  ]);

  assert.match(homeHtml, /El Caribe no se mira\./, "Home brand headline missing");
  assert.match(
    homeHtml,
    /Patacones · Cerveza artesanal · Terraza/,
    "Current mobile UX release marker missing",
  );
  assert.match(homeHtml, /Así se vive PISÁO/, "Experience section missing");
  assert.doesNotMatch(
    homeHtml,
    /Modo Plan · Mesa Visual · Concierge/,
    "Legacy Home copy is still being served",
  );

  assert.equal(healthJson.status, "ok", "Application health is not ok");
  assert.equal(healthJson.database, "available", "Production database unavailable");

  const imageType = image.headers.get("content-type") || "";
  assert.match(imageType, /^image\//, "Experience media route is not returning an image");
  assert.ok(imageBytes.byteLength >= 50000, "Experience image payload is unexpectedly small");

  assert.equal(
    home.headers.get("x-content-type-options"),
    "nosniff",
    "X-Content-Type-Options missing",
  );
  assert.ok(home.headers.get("strict-transport-security"), "HSTS header missing");
  assert.ok(home.headers.get("content-security-policy"), "CSP header missing");

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        baseUrl,
        routes: {
          home: home.status,
          menu: menu.status,
          reservations: reservations.status,
          tracking: tracking.status,
          health: health.status,
          experienceImage: image.status,
        },
        imageBytes: imageBytes.byteLength,
        database: healthJson.database,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[PISAO PRODUCTION SMOKE] FAILED");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
