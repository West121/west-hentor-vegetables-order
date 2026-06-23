import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

import { defineConfig, env } from "prisma/config";

if (process.env.HENTOR_SKIP_DOTENV !== "1") {
  const envPathCandidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../../.env"),
  ];

  const rootEnvPath = envPathCandidates.find((candidate) => existsSync(candidate));
  if (rootEnvPath) {
    loadEnv({ path: rootEnvPath });
  }
  loadEnv();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
