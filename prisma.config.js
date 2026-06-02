import { config as loadDotenv } from "dotenv";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { defineConfig } from "prisma/config";

const require = createRequire(import.meta.url);
const { syncPostgresDbAliases, buildDatabaseUrl } = require("../../../scripts/postgres-env.cjs");

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

syncPostgresDbAliases(process.env);
const databaseUrl = buildDatabaseUrl(process.env);
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
