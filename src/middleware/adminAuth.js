import config from "../config/env.js";

export function adminAuth(req, res, next) {
  const expected = config.adminSecret;
  if (!expected) {
    return res.status(503).json({
      success: false,
      error: "ADMIN_NOT_CONFIGURED",
      message: "Set ADMIN_TICKET_SECRET or ADMIN_PUSH_SECRET on the tickets service.",
    });
  }
  const provided = String(req.headers["x-admin-ticket-secret"] || req.headers["x-admin-push-secret"] || "").trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  }
  req.adminEmail = String(req.headers["x-admin-email"] || "admin@serveaso.com").trim();
  next();
}
