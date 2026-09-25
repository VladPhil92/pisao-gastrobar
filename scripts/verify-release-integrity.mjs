import { readFileSync } from "node:fs";

const PACKAGE_PATH = "package.json";
const LOCK_PATH = "package-lock.json";

function fail(message) {
  console.error(`[release-integrity] FAIL: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractRootObject(raw, property) {
  const marker = `"${property}"`;
  const keyIndex = raw.indexOf(marker);
  if (keyIndex < 0) fail(`Missing root property ${property}`);
  const braceStart = raw.indexOf("{", keyIndex + marker.length);
  if (braceStart < 0) fail(`Property ${property} is not an object`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = braceStart; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(braceStart + 1, i);
    }
  }
  fail(`Unclosed object for ${property}`);
}

function assertNoDuplicateKeys(raw, property) {
  const body = extractRootObject(raw, property);
  const keys = [];
  const re = /^\s*"([^"]+)"\s*:/gm;
  let match;
  while ((match = re.exec(body)) !== null) keys.push(match[1]);

  const seen = new Set();
  for (const key of keys) {
    if (seen.has(key)) fail(`Duplicate key "${key}" in package.json ${property}`);
    seen.add(key);
  }
}

function stableEntries(value = {}) {
  return Object.entries(value).sort(([a],[b]) => a.localeCompare(b));
}

function assertSameMap(name, expected = {}, actual = {}) {
  const a = JSON.stringify(stableEntries(expected));
  const b = JSON.stringify(stableEntries(actual));
  if (a !== b) {
    fail(`${name} differs between package.json and package-lock.json root package`);
  }
}

const packageRaw = readFileSync(PACKAGE_PATH, "utf8");
assertNoDuplicateKeys(packageRaw, "scripts");
assertNoDuplicateKeys(packageRaw, "dependencies");
assertNoDuplicateKeys(packageRaw, "devDependencies");

const pkg = readJson(PACKAGE_PATH);
const lock = readJson(LOCK_PATH);
const root = lock?.packages?.[""];

if (!root) fail("package-lock.json is missing packages['']");
if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 3) {
  fail(`Unexpected lockfileVersion: ${lock.lockfileVersion}`);
}

assertSameMap("dependencies", pkg.dependencies, root.dependencies);
assertSameMap("devDependencies", pkg.devDependencies, root.devDependencies);

if (pkg.engines?.node !== root.engines?.node) {
  fail("Node engine differs between package.json and package-lock.json");
}

const requiredScripts = [
  "build",
  "lint",
  "test:security",
  "test:payments",
  "test:tracking",
  "test:certification",
  "test:ctgone-auth",
  "test:crm-loyalty",
];

for (const name of requiredScripts) {
  if (!pkg.scripts?.[name]) fail(`Missing critical script: ${name}`);
}

console.log("[release-integrity] PASS: manifests are coherent and release scripts are present.");
