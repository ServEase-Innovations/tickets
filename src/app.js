import express from "express";
import cors from "cors";
import ticketsRouter from "./routes/tickets.js";
import adminTicketsRouter from "./routes/adminTickets.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tickets" });
});

app.use("/api/tickets", ticketsRouter);
app.use("/api/admin/tickets", adminTicketsRouter);

export default app;
