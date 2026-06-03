import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { defineConfig } from "prisma/config";
import { syncPostgresDbAliases, buildDatabaseUrl } from "./src/config/postgresEnv.js";

const ENV = process.env.NODE_ENV || "development";
const root = process.cwd();
const paymentsDir = path.resolve(root, "../payments");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== "") {
      process.env[key] = value;
    }
  }
}

for (const file of [
  path.join(paymentsDir, `.env.${ENV}`),
  path.join(paymentsDir, ".env"),
  path.join(root, `.env.${ENV}`),
  path.join(root, ".env"),
]) {
  loadEnvFile(file);
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
