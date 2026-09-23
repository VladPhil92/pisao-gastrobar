import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalOriginEnforced,
  validateCanonicalWriteOrigin,
} from "./edge-origin";

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void,
) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("canonical host enforcement is opt-in", () => {
  withEnv({ PISAO_ENFORCE_CANONICAL_HOST: undefined }, () => {
    assert.equal(canonicalOriginEnforced(), false);
    const result = validateCanonicalWriteOrigin(
      new Request("https://pisao-gastrobar.onrender.com/api/pedidos", {
        method: "POST",
      }),
    );
    assert.equal(result.ok, true);
  });
});

test("rejects direct Render-origin writes when enforcement is enabled", () => {
  withEnv(
    {
      PISAO_ENFORCE_CANONICAL_HOST: "true",
      PISAO_CANONICAL_HOSTS: "pisaogastrobar.com,www.pisaogastrobar.com",
    },
    () => {
      const result = validateCanonicalWriteOrigin(
        new Request("https://pisao-gastrobar.onrender.com/api/pedidos", {
          method: "POST",
        }),
      );
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "NON_CANONICAL_ORIGIN");
    },
  );
});

test("accepts same-origin canonical writes", () => {
  withEnv(
    {
      PISAO_ENFORCE_CANONICAL_HOST: "true",
      PISAO_CANONICAL_HOSTS: "pisaogastrobar.com,www.pisaogastrobar.com",
    },
    () => {
      const result = validateCanonicalWriteOrigin(
        new Request("https://pisaogastrobar.com/api/pedidos", {
          method: "POST",
          headers: { origin: "https://pisaogastrobar.com" },
        }),
      );
      assert.equal(result.ok, true);
    },
  );
});

test("rejects cross-origin browser writes", () => {
  withEnv(
    {
      PISAO_ENFORCE_CANONICAL_HOST: "true",
      PISAO_CANONICAL_HOSTS: "pisaogastrobar.com,www.pisaogastrobar.com",
    },
    () => {
      const result = validateCanonicalWriteOrigin(
        new Request("https://pisaogastrobar.com/api/pedidos", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      );
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "CROSS_ORIGIN_WRITE_REJECTED");
    },
  );
});
