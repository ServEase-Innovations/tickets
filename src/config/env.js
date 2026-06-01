import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const ENV = process.env.NODE_ENV || "development";
let envPath = path.resolve(process.cwd(), `.env.${ENV}`);
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), ".env");
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("[tickets] loaded env:", envPath);
}

export const DEFAULT_SLA_HOURS = Number(process.env.TICKET_DEFAULT_SLA_HOURS) || 48;
export const DEFAULT_ADMIN_EMAIL =
  (process.env.DEFAULT_TICKET_ADMIN_EMAIL || "admin@serveaso.com").trim();

export default {
  port: Number(process.env.PORT) || 5006,
  postgres: {
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || "serveaso",
  },
  adminSecret: (process.env.ADMIN_TICKET_SECRET || process.env.ADMIN_PUSH_SECRET || "").trim(),
};
