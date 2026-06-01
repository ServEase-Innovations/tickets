import { config as loadDotenv } from "dotenv";
import fs from "fs";
import path from "path";
import { defineConfig } from "prisma/config";

const ENV = process.env.NODE_ENV || "development";
const root = process.cwd();
const paymentsDir = path.resolve(root, "../payments");

for (const file of [
  path.join(paymentsDir, `.env.${ENV}`),
  path.join(paymentsDir, ".env"),
  path.join(root, `.env.${ENV}`),
  path.join(root, ".env"),
]) {
  if (fs.existsSync(file)) {
    loadDotenv({ path: file });
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  const host = process.env.POSTGRES_HOST || "127.0.0.1";
  const port = process.env.POSTGRES_PORT || "5432";
  const user = process.env.POSTGRES_USER || "serveaso";
  const password = process.env.POSTGRES_PASSWORD || "";
  const database = (process.env.POSTGRES_DB || "").trim() || "serveaso";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const databaseUrl = buildDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
