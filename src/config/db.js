import pg from "pg";
import config from "./env.js";

const { Pool } = pg;

const pool = new Pool({
  host: config.postgres.host,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  port: config.postgres.port,
  max: config.postgres.poolMax,
  idleTimeoutMillis: config.postgres.poolIdleTimeoutMs,
  connectionTimeoutMillis: config.postgres.poolConnectionTimeoutMs,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("[tickets postgres pool] idle client error:", err?.message || err, err?.code || "");
});

console.log(
  `[tickets] postgres → ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
);

pool
  .query("SELECT current_database(), current_schema();")
  .then((res) => console.log("[tickets] postgres connected:", res.rows[0]))
  .catch((err) =>
    console.error(
      `[tickets] postgres connect failed (${err?.code || err?.message}). ` +
        "Check POSTGRES_* (same as services/payments)."
    )
  );

export default pool;
