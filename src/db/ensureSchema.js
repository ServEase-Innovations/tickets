import pg from "pg";
import config from "../config/env.js";

const MIGRATIONS_REPO = "https://github.com/ServEase-Innovations/DB_Migrations";

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

/**
 * Tickets service does not run Prisma migrate on startup.
 * Apply schema via DB_Migrations before deploy.
 */
export async function ensureTicketDatabaseSchema() {
  if (process.env.RUN_DB_MIGRATIONS === "true" || process.env.PRISMA_SKIP_MIGRATE === "false") {
    console.warn(
      `[tickets] In-process migrations are disabled. Run: npm run db:migrate (${MIGRATIONS_REPO})`
    );
  }

  const ready = await supportTicketTablesExist();
  if (ready) {
    console.log("[tickets] support_tickets schema present");
    return;
  }

  const msg =
    `[tickets] support_tickets tables missing. Apply migrations first:\n` +
    `  cd database && npm install && npm run migrate\n` +
    `  (${MIGRATIONS_REPO})`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  }

  console.error(msg);
}
