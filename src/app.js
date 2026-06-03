import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import ticketsRouter from "./routes/tickets.js";
import adminTicketsRouter from "./routes/adminTickets.js";
import swaggerSpec from "./swagger/swagger.js";
import { resolveSwaggerServerUrl } from "./utils/swaggerServerUrl.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tickets" });
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
