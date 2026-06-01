import { spawn } from "child_process";
import pg from "pg";
import { getDatabaseUrl } from "../config/databaseUrl.js";
import config from "../config/env.js";

const INITIAL_MIGRATION = "20260601120000_init_support_tickets";

function runPrismaCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["prisma", ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: getDatabaseUrl(),
      },
      stdio: "pipe",
    });

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.stdout?.on("data", (chunk) => process.stdout.write(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const err = new Error(`prisma ${args.join(" ")} exited with code ${code}`);
        err.stderr = stderr;
        reject(err);
      }
    });
  });
}

function prismaErrorCode(err, code) {
  const text = `${err?.message || ""} ${err?.stderr || ""}`;
  return text.includes(code);
}

async function supportTicketTablesExist() {
  const pool = new pg.Pool({
    host: config.postgres.host,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    port: config.postgres.port,
    max: 1,
  });
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'support_tickets'`
    );
    return r.rows.length > 0;
  } finally {
    await pool.end();
  }
}

async function markInitialMigrationApplied() {
  try {
    await runPrismaCommand(["migrate", "resolve", "--applied", INITIAL_MIGRATION]);
  } catch (err) {
    if (prismaErrorCode(err, "P3008")) {
      return;
    }
    throw err;
  }
}

/**
 * Apply Prisma migrations on startup (shared Postgres — never use db push).
 */
export async function ensureTicketDatabaseSchema() {
  if (process.env.PRISMA_SKIP_MIGRATE === "true") {
    console.log("[tickets] PRISMA_SKIP_MIGRATE=true — skipping database sync");
    return;
  }

  const dbUrl = getDatabaseUrl();
  process.env.DATABASE_URL = dbUrl;
  console.log(
    "[tickets] Prisma database URL →",
    dbUrl.replace(/:([^:@/]+)@/, ":***@")
  );

  try {
    await runPrismaCommand(["migrate", "deploy"]);
    console.log("[tickets] Prisma migrate deploy completed");
    return;
  } catch (migrateErr) {
    if (!prismaErrorCode(migrateErr, "P3005")) {
      console.error("[tickets] Prisma migrate deploy failed:", migrateErr.message);
      throw migrateErr;
    }

    console.warn(
      "[tickets] Shared database already has data; baselining ticket migration history…"
    );
    await markInitialMigrationApplied();

    try {
      await runPrismaCommand(["migrate", "deploy"]);
      console.log("[tickets] Prisma migrate deploy completed after baseline");
      return;
    } catch (retryErr) {
      if (prismaErrorCode(retryErr, "P3005") && (await supportTicketTablesExist())) {
        console.warn(
          "[tickets] support_tickets tables present; continuing (migration history synced)"
        );
        return;
      }
      console.error("[tickets] Prisma migrate deploy failed:", retryErr.message);
      throw retryErr;
    }
  }
}
