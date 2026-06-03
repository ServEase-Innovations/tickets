import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadPostgresEnvHelpers() {
  const candidates = [
    path.resolve(__dirname, "../../../../scripts/postgres-env.cjs"),
    path.resolve(__dirname, "../../../scripts/postgres-env.cjs"),
    path.resolve(process.cwd(), "scripts/postgres-env.cjs"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return require(filePath);
    }
  }

  function parseDatabaseFromUrl(url) {
    if (!url || !String(url).trim()) return undefined;
    try {
      const u = new URL(String(url).trim());
      const name = decodeURIComponent(u.pathname.replace(/^\//, "").split("?")[0] || "");
      return name || undefined;
    } catch {
      return undefined;
    }
  }

  function syncPostgresDbAliases(env = process.env) {
    const fromUrl = parseDatabaseFromUrl(env.DATABASE_URL);
    const db =
      fromUrl ||
      (env.POSTGRES_DB && String(env.POSTGRES_DB).trim()) ||
      (env.DB_NAME && String(env.DB_NAME).trim()) ||
      undefined;
    if (!db) return undefined;
    if (fromUrl) {
      if (!env.POSTGRES_DB?.trim()) env.POSTGRES_DB = db;
      if (!env.DB_NAME?.trim()) env.DB_NAME = db;
    } else if (env.POSTGRES_DB?.trim()) {
      if (!env.DB_NAME?.trim()) env.DB_NAME = String(env.POSTGRES_DB).trim();
    } else if (env.DB_NAME?.trim()) {
      if (!env.POSTGRES_DB?.trim()) env.POSTGRES_DB = String(env.DB_NAME).trim();
    }
    return db;
  }

  function requirePostgresDatabaseName(env = process.env) {
    const db = syncPostgresDbAliases(env);
    if (!db) {
      throw new Error(
        "Postgres database name not configured. Set DATABASE_URL, POSTGRES_DB, or DB_NAME in Render Environment."
      );
    }
    return db;
  }

  function buildDatabaseUrl(env = process.env) {
    if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
    const database = requirePostgresDatabaseName(env);
    const host = env.POSTGRES_HOST || env.DB_HOST || "127.0.0.1";
    const port = env.POSTGRES_PORT || env.DB_PORT || "5432";
    const user = env.POSTGRES_USER || env.DB_USER;
    const password = env.POSTGRES_PASSWORD ?? env.DB_PASSWORD ?? "";
    if (!user) {
      throw new Error(
        "Postgres user not configured. Set DATABASE_URL or POSTGRES_USER / DB_USER."
      );
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
  }

  return { syncPostgresDbAliases, requirePostgresDatabaseName, buildDatabaseUrl };
}

export const { syncPostgresDbAliases, requirePostgresDatabaseName, buildDatabaseUrl } =
  loadPostgresEnvHelpers();
