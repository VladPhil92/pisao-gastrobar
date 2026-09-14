import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (process.env.VERCEL || !existsSync(standalone)) {
  console.log("Skipping standalone asset copy for platform-managed build.");
  process.exit(0);
}

await cp(join(root, "public"), join(standalone, "public"), {
  recursive: true,
  force: true,
});

const standaloneNext = join(standalone, ".next");
await mkdir(standaloneNext, { recursive: true });
await cp(join(root, ".next", "static"), join(standaloneNext, "static"), {
  recursive: true,
  force: true,
});

console.log("Standalone public and static assets copied.");
