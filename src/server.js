import "./config/env.js";
import { ensureTicketDatabaseSchema } from "./db/ensureSchema.js";
import app from "./app.js";
import config from "./config/env.js";

async function start() {
  try {
    await ensureTicketDatabaseSchema();
  } catch (err) {
    console.error("[tickets] Database schema sync failed:", err?.message || err);
    process.exit(1);
  }

  app.listen(config.port, "0.0.0.0", () => {
    console.log(`🎫 Tickets service on port ${config.port}`);
  });
}

start();
