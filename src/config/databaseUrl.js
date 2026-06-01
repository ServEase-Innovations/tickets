import config from "./env.js";

/** Connection string for Prisma CLI and optional Prisma client use. */
export function getDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  const { host, port, user, password, database } = config.postgres;
  const encUser = encodeURIComponent(user || "serveaso");
  const encPass = encodeURIComponent(password || "");
  return `postgresql://${encUser}:${encPass}@${host}:${port}/${database}`;
}
