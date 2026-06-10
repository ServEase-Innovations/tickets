import { Router } from "express";
import {
  createTicket,
  getTicketById,
  listCustomerTickets,
  addComment,
  acceptTicketResolution,
  reopenTicket,
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  DEFAULT_SLA_HOURS,
} from "../services/ticketService.js";

const router = Router();

function parseCustomerId(req) {
  const id = Number(
    req.body?.customerId ??
      req.body?.customer_id ??
      req.query?.customerId ??
      req.query?.customer_id ??
      req.headers["x-customer-id"]
  );
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.get("/meta", (_req, res) => {
  res.json({
    success: true,
    categories: CATEGORIES,
    priorities: PRIORITIES,
    default_sla_hours: DEFAULT_SLA_HOURS,
    statuses: STATUSES,
  });
});

router.post("/", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    if (!customerId) {
      return res.status(400).json({ success: false, error: "CUSTOMER_ID_REQUIRED" });
    }
    const ticket = await createTicket({
      customerId,
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category,
      engagementId:
        req.body.engagementId != null
          ? Number(req.body.engagementId)
          : req.body.engagement_id != null
            ? Number(req.body.engagement_id)
            : null,
    });
    return res.status(201).json({
      success: true,
      message: "Ticket created. Our team will respond within the SLA window.",
      ticket,
    });
  } catch (e) {
    const pgCode = e.code;
    const code =
      pgCode === "42P01"
        ? "SCHEMA_NOT_READY"
        : e.code || "SERVER_ERROR";
    const status =
      code === "ENGAGEMENT_NOT_FOUND" || code === "CUSTOMER_MISMATCH"
        ? 400
        : code === "MISSING_REQUIRED_FIELDS"
          ? 400
          : code === "SCHEMA_NOT_READY"
            ? 503
            : 500;
    const message =
      code === "SCHEMA_NOT_READY"
        ? "Support ticket tables are missing. Run services/tickets/sql/schema.sql on the database."
        : e.message;
    return res.status(status).json({ success: false, error: code, message });
  }
});

router.get("/mine", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    if (!customerId) {
      return res.status(400).json({ success: false, error: "CUSTOMER_ID_REQUIRED" });
    }
    const tickets = await listCustomerTickets(customerId, {
      status: req.query.status,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    return res.json({ success: true, count: tickets.length, tickets });
  } catch (e) {
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

router.get("/:ticketId", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    if (!customerId) {
      return res.status(400).json({ success: false, error: "CUSTOMER_ID_REQUIRED" });
    }
    const ticketId = Number(req.params.ticketId);
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    if (ticket.customerid !== customerId) {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }
    return res.json({ success: true, ticket });
  } catch (e) {
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

router.post("/:ticketId/accept-resolution", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    const ticketId = Number(req.params.ticketId);
    if (!customerId) {
      return res.status(400).json({ success: false, error: "CUSTOMER_ID_REQUIRED" });
    }
    const ticket = await acceptTicketResolution(ticketId, customerId);
    return res.json({ success: true, ticket });
  } catch (e) {
    const code = e.code || "SERVER_ERROR";
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
          ? 403
          : code === "NOT_AWAITING_CONFIRMATION"
            ? 400
            : 500;
    return res.status(status).json({ success: false, error: code });
  }
});

router.post("/:ticketId/reopen", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    const ticketId = Number(req.params.ticketId);
    if (!customerId) {
      return res.status(400).json({ success: false, error: "CUSTOMER_ID_REQUIRED" });
    }
    const ticket = await reopenTicket(ticketId, customerId, { body: req.body?.body });
    return res.json({ success: true, ticket });
  } catch (e) {
    const code = e.code || "SERVER_ERROR";
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
          ? 403
          : code === "NOT_AWAITING_CONFIRMATION"
            ? 400
            : 500;
    return res.status(status).json({ success: false, error: code });
  }
});

router.post("/:ticketId/comments", async (req, res) => {
  try {
    const customerId = parseCustomerId(req);
    const ticketId = Number(req.params.ticketId);
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    if (!customerId || ticket.customerid !== customerId) {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }
    const updated = await addComment({
      ticketId,
      authorType: "CUSTOMER",
      authorId: customerId,
      authorName: req.body.authorName || "Customer",
      body: req.body.body,
      isInternal: false,
    });
    return res.json({ success: true, ticket: updated });
  } catch (e) {
    const code = e.code || "SERVER_ERROR";
    return res.status(code === "EMPTY_COMMENT" ? 400 : 500).json({ success: false, error: code });
  }
});

export default router;
