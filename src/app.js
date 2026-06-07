import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import ticketsRouter from "./routes/tickets.js";
import adminTicketsRouter from "./routes/adminTickets.js";
import swaggerSpec from "./swagger/swagger.js";
import { resolveSwaggerServerUrl } from "./utils/swaggerServerUrl.js";
import requestMetrics from "./middleware/requestMetrics.js";
import { getMetrics, metricsContentType } from "./monitoring/prometheus.js";
import pool from "./config/db.js";

const app = express();
app.use(cors());
app.use(requestMetrics);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "tickets",
    uptime: process.uptime(),
  });
});

app.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready", service: "tickets" });
  } catch (err) {
    res.status(503).json({
      status: "not_ready",
      service: "tickets",
      error: err?.message || "database unreachable",
    });
  }
});

app.get("/metrics", async (_req, res, next) => {
  try {
    res.set("Content-Type", metricsContentType);
    res.end(await getMetrics());
  } catch (err) {
    next(err);
  }
});

app.use("/api/tickets", ticketsRouter);
app.use("/api/admin/tickets", adminTicketsRouter);

app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", (req, res, next) => {
  const spec = JSON.parse(JSON.stringify(swaggerSpec));
  spec.servers = [{ url: resolveSwaggerServerUrl(req) }];
  swaggerUi.setup(spec)(req, res, next);
});

app.get("/api-docs.json", (req, res) => {
  const spec = JSON.parse(JSON.stringify(swaggerSpec));
  spec.servers = [{ url: resolveSwaggerServerUrl(req) }];
  res.json(spec);
});

export default app;
