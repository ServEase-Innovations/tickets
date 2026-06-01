import pg from "pg";
import config from "./env.js";

const pool = new pg.Pool({
  host: config.postgres.host,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  port: config.postgres.port,
  max: 10,
});

pool.on("error", (err) => {
  console.error("[tickets] pool error:", err?.message || err);
});

console.log(
  `[tickets] postgres → ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`
);

export default pool;
