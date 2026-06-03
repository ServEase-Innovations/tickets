import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { syncPostgresDbAliases, requirePostgresDatabaseName } from "./postgresEnv.js";

const ENV = process.env.NODE_ENV || "development";

/** Same value as services/utils/.env.example — local monorepo only. */
export const DEV_ADMIN_SECRET = "serveaso-test-push-secret";

/** Never override vars already set by Render / the shell (injected before Node starts). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  let applied = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (value === "") continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
    applied += 1;
  }
  if (applied > 0) {
    console.log(`[tickets] loaded env (${applied} keys):`, filePath);
  }
  return applied > 0;
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

/** Prefer DATABASE_URL (Render) over POSTGRES_DB / DB_NAME. */
function resolvePostgresConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const u = new URL(url);
      const database = decodeURIComponent(u.pathname.replace(/^\//, "").split("?")[0] || "");
      if (database) {
        if (!process.env.POSTGRES_DB?.trim()) process.env.POSTGRES_DB = database;
        if (!process.env.DB_NAME?.trim()) process.env.DB_NAME = database;
        return {
          host: u.hostname,
          port: Number(u.port || 5432),
          user: decodeURIComponent(u.username || ""),
          password: decodeURIComponent(u.password || ""),
          database,
          source: "DATABASE_URL",
        };
      }
    } catch {
      console.warn("[tickets] DATABASE_URL is set but could not be parsed; using POSTGRES_*");
    }
  }

  syncPostgresDbAliases(process.env);
  const database = requirePostgresDatabaseName(process.env);
  return {
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || "127.0.0.1",
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    password: process.env.POSTGRES_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    database,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
    source: "POSTGRES_*",
  };
}

// Monorepo local dev only (paths missing on Render standalone repo)
const paymentsDir = path.resolve(process.cwd(), "../payments");
loadEnvFile(path.resolve(paymentsDir, `.env.${ENV}`));
loadEnvFile(path.resolve(paymentsDir, ".env"));

const utilsDir = path.resolve(process.cwd(), "../utils");
loadEnvFile(path.resolve(utilsDir, `.env.${ENV}`));
loadEnvFile(path.resolve(utilsDir, ".env"));

let ticketsEnvPath = path.resolve(process.cwd(), `.env.${ENV}`);
if (!fs.existsSync(ticketsEnvPath)) {
  ticketsEnvPath = path.resolve(process.cwd(), ".env");
}
loadEnvFile(ticketsEnvPath);

const postgres = resolvePostgresConfig();
console.log(
  `[tickets] postgres config → ${postgres.host}:${postgres.port}/${postgres.database} (from ${postgres.source})`
);

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
    host: postgres.host,
    user: postgres.user,
    password: postgres.password,
    database: postgres.database,
    port: postgres.port,
    poolMax: Number(process.env.POSTGRES_POOL_MAX) || 10,
    poolIdleTimeoutMs: Number(process.env.POSTGRES_POOL_IDLE_TIMEOUT_MS) || 60_000,
    poolConnectionTimeoutMs:
      Number(process.env.POSTGRES_POOL_CONNECTION_TIMEOUT_MS) || 10_000,
  },
  adminSecret: resolveAdminSecret(),
};
