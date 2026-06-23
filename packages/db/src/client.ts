import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "./generated/prisma/client";

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

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL ?? "mysql://root:root@localhost:3306/hentor_vegetables",
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" &&
      process.env.PRISMA_QUERY_LOG === "1"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
