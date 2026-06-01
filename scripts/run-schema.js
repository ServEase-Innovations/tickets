/**
 * Manual schema sync (same as startup). Prefer: npm run prisma:migrate
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "../src/config/env.js";
import { getDatabaseUrl } from "../src/config/databaseUrl.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATABASE_URL = getDatabaseUrl();

const child = spawn("npx", ["prisma", "migrate", "deploy"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("close", (code) => process.exit(code ?? 1));
