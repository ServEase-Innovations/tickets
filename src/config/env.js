import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { syncPostgresDbAliases, requirePostgresDatabaseName } from "./postgresEnv.js";

const ENV = process.env.NODE_ENV || "development";

/** Same value as services/utils/.env.example — local monorepo only. */
export const DEV_ADMIN_SECRET = "serveaso-test-push-secret";

function loadEnvFile(filePath, { override = false, skipEmpty = false } = {}) {
  if (!fs.existsSync(filePath)) return false;
  if (skipEmpty && override) {
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== "") {
        process.env[key] = value;
      }
    }
  } else {
    dotenv.config({ path: filePath, override });
  }
  console.log("[tickets] loaded env:", filePath);
  return true;
}

function resolveAdminSecret() {
  const fromEnv = (process.env.ADMIN_TICKET_SECRET || process.env.ADMIN_PUSH_SECRET || "").trim();
  if (fromEnv) return fromEnv;
  if (ENV === "development") {
    console.warn(
      "[tickets] ADMIN_TICKET_SECRET unset — using local dev default (set ADMIN_TICKET_SECRET in production)"
    );
    return DEV_ADMIN_SECRET;
  }
  return "";
}

// Same Postgres (and shared vars) as payments — local monorepo dev
const paymentsDir = path.resolve(process.cwd(), "../payments");
loadEnvFile(path.resolve(paymentsDir, `.env.${ENV}`));
loadEnvFile(path.resolve(paymentsDir, ".env"));

// Shared admin push secret (utils .env.example)
const utilsDir = path.resolve(process.cwd(), "../utils");
loadEnvFile(path.resolve(utilsDir, `.env.${ENV}`));
loadEnvFile(path.resolve(utilsDir, ".env"));

// Tickets-specific overrides (PORT, SLA, admin secret)
let ticketsEnvPath = path.resolve(process.cwd(), `.env.${ENV}`);
if (!fs.existsSync(ticketsEnvPath)) {
  ticketsEnvPath = path.resolve(process.cwd(), ".env");
}
loadEnvFile(ticketsEnvPath, { override: true, skipEmpty: true });

syncPostgresDbAliases(process.env);

export const DEFAULT_SLA_HOURS = Number(process.env.TICKET_DEFAULT_SLA_HOURS) || 48;
export const DEFAULT_ADMIN_EMAIL =
  (process.env.DEFAULT_TICKET_ADMIN_EMAIL || "admin@serveaso.com").trim();

/** Monorepo `npm run dev` uses PORT=4100 for payments; providers use 4000. */
export function getPaymentsServiceUrl() {
  const fromEnv = (process.env.PAYMENTS_SERVICE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (ENV === "development") return "http://127.0.0.1:4100";
  return "http://127.0.0.1:4000";
}

export default {
  env: ENV,
  port: Number(process.env.PORT) || 5006,
  paymentsServiceUrl: getPaymentsServiceUrl(),
  postgres: {
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: requirePostgresDatabaseName(process.env),
    port: Number(process.env.POSTGRES_PORT) || 5432,
    poolMax: Number(process.env.POSTGRES_POOL_MAX) || 10,
    poolIdleTimeoutMs: Number(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS) || 60_000,
    poolConnectionTimeoutMs:
      Number(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS) || 10_000,
  },
  adminSecret: resolveAdminSecret(),
};
