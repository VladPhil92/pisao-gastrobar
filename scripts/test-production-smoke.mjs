import assert from "node:assert/strict";

const baseUrl = (process.env.PISAO_PRODUCTION_URL || "https://pisaogastrobar.com").replace(/\/$/, "");
const timeoutMs = Number(process.env.PISAO_SMOKE_TIMEOUT_MS || 10000);
const expectedRelease = process.env.PISAO_EXPECTED_RELEASE?.trim() || null;
const maxWaitMs = Number(process.env.PISAO_RELEASE_WAIT_MS || 480000);
const pollMs = Number(process.env.PISAO_RELEASE_POLL_MS || 15000);

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: {
      "User-Agent": "PISAO-Production-Smoke/2.0",
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    },
    ...options,
  });
}

async function waitForRelease() {
  const startedAt = Date.now();
  let lastSeen = null;
  let lastStatus = null;

  while (true) {
    try {
      const response = await request("/api/release");
      lastStatus = response.status;
      const payload = await response.json().catch(() => null);
      lastSeen = payload?.releaseSha || null;

      if (!expectedRelease) {
        assert.equal(response.status, 200, "Release endpoint must return 200");
        assert.ok(lastSeen && lastSeen !== "unknown", "Release endpoint must expose a concrete SHA");
        return lastSeen;
      }

      if (response.status === 200 && lastSeen === expectedRelease) {
        return lastSeen;
      }
    } catch (error) {
      lastStatus = "request_error";
      lastSeen = error instanceof Error ? error.message : String(error);
    }

    if (Date.now() - startedAt >= maxWaitMs) {
      throw new Error(
        `Timed out waiting for release ${expectedRelease}. Last status=${lastStatus}, last release=${lastSeen}`,
      );
    }

    console.log(
      `[PISAO PRODUCTION SMOKE] Waiting for release ${expectedRelease}; current=${lastSeen ?? "unknown"}`,
    );
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function main() {
  const releaseSha = await waitForRelease();

  const [home, menu, reservations, tracking, health, image, release] = await Promise.all([
    request("/"),
    request("/menu"),
    request("/reservas"),
    request("/pedidos/seguimiento"),
    request("/api/health"),
    request("/api/media/pisao-experience"),
    request("/api/release"),
  ]);

  assert.equal(home.status, 200, "Home must return 200");
  assert.equal(menu.status, 200, "Menu must return 200");
  assert.equal(reservations.status, 200, "Reservations must return 200");
  assert.equal(tracking.status, 200, "Order tracking must return 200");
  assert.equal(health.status, 200, "Health endpoint must return 200");
  assert.equal(image.status, 200, "Experience image route must return 200");
  assert.equal(release.status, 200, "Release endpoint must return 200");

  const [homeHtml, healthJson, imageBytes, releaseJson] = await Promise.all([
    home.text(),
    health.json(),
    image.arrayBuffer(),
    release.json(),
  ]);

  assert.equal(releaseJson.releaseSha, releaseSha, "Release changed during smoke test");
  if (expectedRelease) {
    assert.equal(releaseJson.releaseSha, expectedRelease, "Public release does not match expected commit");
  }

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

  const homeRelease = home.headers.get("x-pisao-release");
  assert.equal(homeRelease, releaseSha, "Home response and release endpoint disagree");

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        baseUrl,
        release: releaseSha,
        routes: {
          home: home.status,
          menu: menu.status,
          reservations: reservations.status,
          tracking: tracking.status,
          health: health.status,
          experienceImage: image.status,
          release: release.status,
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
