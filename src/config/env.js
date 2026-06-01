import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const ENV = process.env.NODE_ENV || "development";

function loadEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return false;
  dotenv.config({ path: filePath, override });
  console.log("[tickets] loaded env:", filePath);
  return true;
}

// Same Postgres (and shared vars) as payments — local monorepo dev
const paymentsDir = path.resolve(process.cwd(), "../payments");
loadEnvFile(path.resolve(paymentsDir, `.env.${ENV}`));
loadEnvFile(path.resolve(paymentsDir, ".env"));

// Tickets-specific overrides (PORT, SLA, admin secret)
let ticketsEnvPath = path.resolve(process.cwd(), `.env.${ENV}`);
if (!fs.existsSync(ticketsEnvPath)) {
  ticketsEnvPath = path.resolve(process.cwd(), ".env");
}
loadEnvFile(ticketsEnvPath, { override: true });

export const DEFAULT_SLA_HOURS = Number(process.env.TICKET_DEFAULT_SLA_HOURS) || 48;
export const DEFAULT_ADMIN_EMAIL =
  (process.env.DEFAULT_TICKET_ADMIN_EMAIL || "admin@serveaso.com").trim();

export default {
  env: ENV,
  port: Number(process.env.PORT) || 5006,
  postgres: {
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    poolMax: Number(process.env.POSTGRES_POOL_MAX) || 10,
    poolIdleTimeoutMs: Number(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS) || 60_000,
    poolConnectionTimeoutMs:
      Number(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS) || 10_000,
  },
  adminSecret: (process.env.ADMIN_TICKET_SECRET || process.env.ADMIN_PUSH_SECRET || "").trim(),
};
