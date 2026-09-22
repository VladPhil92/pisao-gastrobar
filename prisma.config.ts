// Prisma CLI/migrations use a direct or session-pooled connection.
// Runtime queries in Vercel use DATABASE_URL separately via lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

const migrationUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
