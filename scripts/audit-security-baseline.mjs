import { spawnSync } from "node:child_process";

const KNOWN_HIGH_PACKAGES = new Set([
  "@prisma/client",
  "@prisma/config",
  "@prisma/dev",
  "deepmerge-ts",
  "fast-uri",
  "mysql2",
  "nanoid",
  "prisma",
]);

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--omit=dev", "--json"],
  {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  },
);

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("security-baseline: npm audit did not return valid JSON.");
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const critical = [];
const newHigh = [];

for (const [name, details] of Object.entries(vulnerabilities)) {
  const severity = details?.severity;
  if (severity === "critical") critical.push(name);
  if (severity === "high" && !KNOWN_HIGH_PACKAGES.has(name)) {
    newHigh.push(name);
  }
}

if (critical.length || newHigh.length) {
  if (critical.length) {
    console.error(
      "security-baseline: critical production advisories:",
      critical.join(", "),
    );
  }
  if (newHigh.length) {
    console.error(
      "security-baseline: new high-severity production advisories outside the reviewed Prisma 7.8 dependency debt:",
      newHigh.join(", "),
    );
  }
  process.exit(1);
}

const knownHigh = Object.entries(vulnerabilities)
  .filter(
    ([name, details]) =>
      details?.severity === "high" && KNOWN_HIGH_PACKAGES.has(name),
  )
  .map(([name]) => name)
  .sort();

console.log(
  "security-baseline: no critical or new high-severity production advisories.",
);
if (knownHigh.length) {
  console.log(
    "security-baseline: reviewed upstream/transitive high-severity debt:",
    knownHigh.join(", "),
  );
}
