import pool from "../config/db.js";
import { DEFAULT_SLA_HOURS, DEFAULT_ADMIN_EMAIL } from "../config/env.js";
import { notifyCustomerSupportTicketUpdate } from "./notifyCustomer.js";
import { notifyAdminSupportTicketActivity } from "./notifyAdmin.js";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const CATEGORIES = [
  "GENERAL",
  "BOOKING",
  "PAYMENT",
  "SERVICE_QUALITY",
  "PROVIDER_CONDUCT",
  "REFUND",
  "APP_TECHNICAL",
];

function toEpochSeconds(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

function mapTicket(row) {
  if (!row) return null;
  const now = Date.now();
  const due = row.sla_due_at ? new Date(row.sla_due_at).getTime() : null;
  const isOverdue =
    due != null &&
    !["RESOLVED", "CLOSED", "CANCELLED"].includes(row.status) &&
    due < now;

  return {
    ticket_id: Number(row.ticket_id),
    ticket_number: row.ticket_number,
    customerid: Number(row.customerid),
    engagement_id: row.engagement_id != null ? Number(row.engagement_id) : null,
    serviceproviderid: row.serviceproviderid != null ? Number(row.serviceproviderid) : null,
    category: row.category,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigned_admin_email: row.assigned_admin_email,
    sla_hours: Number(row.sla_hours),
    sla_due_at: row.sla_due_at,
    sla_due_at_epoch: toEpochSeconds(row.sla_due_at),
    is_overdue: isOverdue,
    resolved_at: row.resolved_at,
    resolved_at_epoch: toEpochSeconds(row.resolved_at),
    resolved_by: row.resolved_by,
    resolution_notes: row.resolution_notes,
    created_at: row.created_at,
    created_at_epoch: toEpochSeconds(row.created_at),
    updated_at: row.updated_at,
    updated_at_epoch: toEpochSeconds(row.updated_at),
    customer_name: row.customer_name || null,
    customer_mobile: row.customer_mobile || null,
  };
}

async function nextTicketNumber(client) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `TKT-${day}-`;
  const r = await client.query(
    `SELECT COUNT(*)::int AS c FROM support_tickets WHERE ticket_number LIKE $1`,
    [`${prefix}%`]
  );
  const seq = (r.rows[0]?.c || 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function logEvent(client, ticketId, eventType, payload, createdBy) {
  await client.query(
    `INSERT INTO support_ticket_events (ticket_id, event_type, payload, created_by)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [ticketId, eventType, JSON.stringify(payload || {}), createdBy || null]
  );
}

export async function validateCustomerEngagement(customerId, engagementId) {
  if (!engagementId) return null;
  const r = await pool.query(
    `SELECT engagement_id, customerid, serviceproviderid, booking_type, service_type
     FROM engagements WHERE engagement_id = $1`,
    [engagementId]
  );
  if (!r.rows.length) {
    const err = new Error("ENGAGEMENT_NOT_FOUND");
    err.code = "ENGAGEMENT_NOT_FOUND";
    throw err;
  }
  if (Number(r.rows[0].customerid) !== Number(customerId)) {
    const err = new Error("CUSTOMER_MISMATCH");
    err.code = "CUSTOMER_MISMATCH";
    throw err;
  }
  return r.rows[0];
}

export async function createTicket({
  customerId,
  subject,
  description,
  category = "GENERAL",
  engagementId = null,
  priority = "MEDIUM",
}) {
  if (!customerId || !subject?.trim() || !description?.trim()) {
    const err = new Error("MISSING_REQUIRED_FIELDS");
    err.code = "MISSING_REQUIRED_FIELDS";
    throw err;
  }
  if (!CATEGORIES.includes(category)) {
    const err = new Error("INVALID_CATEGORY");
    err.code = "INVALID_CATEGORY";
    throw err;
  }

  const engagement = await validateCustomerEngagement(customerId, engagementId);
  const slaHours = DEFAULT_SLA_HOURS;
  const effectivePriority = PRIORITIES.includes(priority) ? priority : "MEDIUM";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ticketNumber = await nextTicketNumber(client);
    const insert = await client.query(
      `INSERT INTO support_tickets (
        ticket_number, customerid, engagement_id, serviceproviderid,
        category, subject, description, status, priority,
        assigned_admin_email, sla_hours, sla_due_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, 'OPEN', $8,
        $9, $10, NOW() + ($10::int * INTERVAL '1 hour')
      )
      RETURNING *`,
      [
        ticketNumber,
        customerId,
        engagementId,
        engagement?.serviceproviderid ?? null,
        category,
        subject.trim(),
        description.trim(),
        effectivePriority,
        DEFAULT_ADMIN_EMAIL,
        slaHours,
      ]
    );
    const ticket = insert.rows[0];
    await client.query(
      `INSERT INTO support_ticket_comments (ticket_id, author_type, author_id, author_name, body, is_internal)
       VALUES ($1, 'CUSTOMER', $2, 'Customer', $3, false)`,
      [ticket.ticket_id, customerId, description.trim()]
    );
    await logEvent(client, ticket.ticket_id, "CREATED", { sla_hours: slaHours, priority: effectivePriority }, "customer");
    await client.query("COMMIT");
    const created = await getTicketById(ticket.ticket_id);
    void notifyAdminSupportTicketActivity({
      ticket: created,
      reason: "new_ticket",
      preview: `${created.ticket_number}: ${created.subject}`,
    });
    return created;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getTicketById(ticketId, { includeInternalComments = false } = {}) {
  const r = await pool.query(
    `SELECT t.*,
            TRIM(CONCAT(c.firstname, ' ', c.lastname)) AS customer_name,
            c.mobileno AS customer_mobile
     FROM support_tickets t
     LEFT JOIN customer c ON c.customerid = t.customerid
     WHERE t.ticket_id = $1`,
    [ticketId]
  );
  if (!r.rows.length) return null;
  const ticket = mapTicket(r.rows[0]);
  const comments = await pool.query(
    `SELECT * FROM support_ticket_comments
     WHERE ticket_id = $1
       AND ($2::boolean IS TRUE OR COALESCE(is_internal, false) = false)
     ORDER BY created_at ASC`,
    [ticketId, includeInternalComments]
  );
  ticket.comments = comments.rows.map((c) => ({
    comment_id: Number(c.comment_id),
    author_type: c.author_type,
    author_id: c.author_id != null ? Number(c.author_id) : null,
    author_name: c.author_name,
    body: c.body,
    is_internal: c.is_internal,
    created_at: c.created_at,
    created_at_epoch: toEpochSeconds(c.created_at),
  }));
  return ticket;
}

export async function listCustomerTickets(customerId, { status, limit = 50, offset = 0 } = {}) {
  const params = [customerId];
  let where = "t.customerid = $1";
  if (status) {
    params.push(status);
    where += ` AND t.status = $${params.length}`;
  }
  params.push(limit, offset);
  const r = await pool.query(
    `SELECT t.*,
            TRIM(CONCAT(c.firstname, ' ', c.lastname)) AS customer_name,
            c.mobileno AS customer_mobile
     FROM support_tickets t
     LEFT JOIN customer c ON c.customerid = t.customerid
     WHERE ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return r.rows.map(mapTicket);
}

export async function listAdminTickets({
  status,
  priority,
  assignedAdminEmail,
  overdueOnly,
  search,
  limit = 50,
  offset = 0,
} = {}) {
  const params = [];
  const clauses = ["1=1"];

  if (status) {
    params.push(status);
    clauses.push(`t.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    clauses.push(`t.priority = $${params.length}`);
  }
  if (assignedAdminEmail) {
    params.push(assignedAdminEmail);
    clauses.push(`t.assigned_admin_email = $${params.length}`);
  }
  if (overdueOnly === true || overdueOnly === "true") {
    clauses.push(`t.sla_due_at < NOW() AND t.status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(
      `(t.ticket_number ILIKE $${params.length} OR t.subject ILIKE $${params.length} OR CAST(t.customerid AS TEXT) = REPLACE($${params.length}, '%', ''))`
    );
  }

  params.push(limit, offset);
  const where = clauses.join(" AND ");
  const r = await pool.query(
    `SELECT t.*,
            TRIM(CONCAT(c.firstname, ' ', c.lastname)) AS customer_name,
            c.mobileno AS customer_mobile
     FROM support_tickets t
     LEFT JOIN customer c ON c.customerid = t.customerid
     WHERE ${where}
     ORDER BY
       CASE t.priority WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
       t.sla_due_at ASC,
       t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return r.rows.map(mapTicket);
}

export async function getAdminStats() {
  const r = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'WAITING_CUSTOMER')::int AS waiting_customer,
      COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
      COUNT(*) FILTER (WHERE sla_due_at < NOW() AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED'))::int AS overdue,
      COUNT(*) FILTER (WHERE priority = 'HIGH' AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED'))::int AS high_priority_open
    FROM support_tickets
  `);
  return r.rows[0];
}

export async function updateTicketAdmin(ticketId, updates, adminEmail) {
  const existing = await getTicketById(ticketId, { includeInternalComments: true });
  if (!existing) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }

  const status = updates.status ?? existing.status;
  const priority = updates.priority ?? existing.priority;
  const slaHours = updates.sla_hours ?? existing.sla_hours;
  let assigned = updates.assigned_admin_email ?? existing.assigned_admin_email;
  if (!assigned && adminEmail) {
    assigned = adminEmail;
  }
  const resolutionNotes = updates.resolution_notes ?? existing.resolution_notes;

  if (!STATUSES.includes(status)) {
    const err = new Error("INVALID_STATUS");
    err.code = "INVALID_STATUS";
    throw err;
  }
  if (!PRIORITIES.includes(priority)) {
    const err = new Error("INVALID_PRIORITY");
    err.code = "INVALID_PRIORITY";
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resolvedAt =
      ["RESOLVED", "CLOSED"].includes(status) && !existing.resolved_at
        ? new Date()
        : existing.resolved_at;
    const resolvedBy = ["RESOLVED", "CLOSED"].includes(status) ? adminEmail : existing.resolved_by;

    await client.query(
      `UPDATE support_tickets SET
        status = $2,
        priority = $3,
        assigned_admin_email = $4,
        sla_hours = $5,
        sla_due_at = created_at + ($5::int * INTERVAL '1 hour'),
        resolution_notes = $6,
        resolved_at = $7,
        resolved_by = $8,
        updated_at = NOW()
       WHERE ticket_id = $1`,
      [
        ticketId,
        status,
        priority,
        assigned,
        slaHours,
        resolutionNotes,
        resolvedAt,
        resolvedBy,
      ]
    );
    const notesChanged =
      String(resolutionNotes || "").trim() !== String(existing.resolution_notes || "").trim();
    if (notesChanged && String(resolutionNotes || "").trim()) {
      await client.query(
        `INSERT INTO support_ticket_comments (ticket_id, author_type, author_id, author_name, body, is_internal)
         VALUES ($1, 'ADMIN', NULL, $2, $3, false)`,
        [ticketId, adminEmail || "Support", String(resolutionNotes).trim()]
      );
    }

    await logEvent(
      client,
      ticketId,
      "ADMIN_UPDATED",
      { status, priority, sla_hours: slaHours, assigned_admin_email: assigned },
      adminEmail
    );
    await client.query("COMMIT");
    const updated = await getTicketById(ticketId, { includeInternalComments: true });
    const statusChanged = status !== existing.status;
    const newlyAssigned =
      assigned &&
      !existing.assigned_admin_email &&
      String(assigned).trim() !== String(DEFAULT_ADMIN_EMAIL).trim();
    if (statusChanged || notesChanged || newlyAssigned) {
      const reason = ["RESOLVED", "CLOSED"].includes(status)
        ? "resolved"
        : newlyAssigned
          ? "assigned"
          : "status_change";
      void notifyCustomerSupportTicketUpdate({
        ticket: updated,
        reason,
        preview: notesChanged
          ? String(resolutionNotes).slice(0, 240)
          : `Status: ${status.replace(/_/g, " ")}`,
      });
    }
    return updated;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function addComment({
  ticketId,
  authorType,
  authorId,
  authorName,
  body,
  isInternal = false,
}) {
  if (!body?.trim()) {
    const err = new Error("EMPTY_COMMENT");
    err.code = "EMPTY_COMMENT";
    throw err;
  }
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    const err = new Error("NOT_FOUND");
    err.code = "NOT_FOUND";
    throw err;
  }
  await pool.query(
    `INSERT INTO support_ticket_comments (ticket_id, author_type, author_id, author_name, body, is_internal)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ticketId, authorType, authorId, authorName, body.trim(), isInternal]
  );
  if (authorType === "ADMIN" && !isInternal) {
    await pool.query(
      `UPDATE support_tickets SET status = 'WAITING_CUSTOMER', updated_at = NOW()
       WHERE ticket_id = $1 AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED', 'WAITING_CUSTOMER')`,
      [ticketId]
    );
  }
  await pool.query(`UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = $1`, [ticketId]);
  const updated = await getTicketById(ticketId, {
    includeInternalComments: String(authorType).toUpperCase() === "ADMIN",
  });
  if (authorType === "ADMIN" && !isInternal) {
    void notifyCustomerSupportTicketUpdate({
      ticket: updated,
      reason: "admin_reply",
      preview: body.trim().slice(0, 240),
    });
  }
  if (authorType === "CUSTOMER") {
    void notifyAdminSupportTicketActivity({
      ticket: updated,
      reason: "customer_reply",
      preview: body.trim().slice(0, 240),
    });
  }
  return updated;
}

export { STATUSES, PRIORITIES, CATEGORIES, DEFAULT_SLA_HOURS };
