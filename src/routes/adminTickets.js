import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import {
  listAdminTickets,
  getTicketById,
  updateTicketAdmin,
  addComment,
  getAdminStats,
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  DEFAULT_SLA_HOURS,
} from "../services/ticketService.js";

const router = Router();
router.use(adminAuth);

router.get("/stats", async (_req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ success: true, stats, default_sla_hours: DEFAULT_SLA_HOURS });
  } catch (e) {
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

router.get("/meta", (_req, res) => {
  res.json({
    success: true,
    statuses: STATUSES,
    priorities: PRIORITIES,
    categories: CATEGORIES,
    default_sla_hours: DEFAULT_SLA_HOURS,
  });
});

router.get("/", async (req, res) => {
  try {
    const tickets = await listAdminTickets({
      status: req.query.status,
      priority: req.query.priority,
      assignedAdminEmail:
        req.query.assignedAdminEmail ?? req.query.assigned_admin_email,
      overdueOnly: req.query.overdueOnly,
      search: req.query.search,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ success: true, count: tickets.length, tickets });
  } catch (e) {
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

router.get("/:ticketId", async (req, res) => {
  try {
    const ticket = await getTicketById(Number(req.params.ticketId), { includeInternalComments: true });
    if (!ticket) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    res.json({ success: true, ticket });
  } catch (e) {
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
});

router.patch("/:ticketId", async (req, res) => {
  try {
    const ticket = await updateTicketAdmin(
      Number(req.params.ticketId),
      {
        status: req.body.status,
        priority: req.body.priority,
        sla_hours: req.body.sla_hours != null ? Number(req.body.sla_hours) : undefined,
        assigned_admin_email: req.body.assigned_admin_email,
        resolution_notes: req.body.resolution_notes,
      },
      req.adminEmail
    );
    res.json({ success: true, ticket });
  } catch (e) {
    const code = e.code || "SERVER_ERROR";
    res.status(code === "NOT_FOUND" ? 404 : code.startsWith("INVALID") ? 400 : 500).json({
      success: false,
      error: code,
    });
  }
});

router.post("/:ticketId/comments", async (req, res) => {
  try {
    const ticket = await addComment({
      ticketId: Number(req.params.ticketId),
      authorType: "ADMIN",
      authorId: null,
      authorName: req.body.authorName || req.adminEmail,
      body: req.body.body,
      isInternal: Boolean(req.body.is_internal),
    });
    res.json({ success: true, ticket });
  } catch (e) {
    const code = e.code || "SERVER_ERROR";
    res.status(code === "NOT_FOUND" ? 404 : 400).json({ success: false, error: code });
  }
});

export default router;
