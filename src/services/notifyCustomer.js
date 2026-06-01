import pool from "../config/db.js";
import { getPaymentsServiceUrl } from "../config/env.js";
import { getInternalNotifySecret } from "./internalNotifySecret.js";

const NOTIFY_TYPE = "SUPPORT_TICKET_UPDATE";

async function insertNotificationDirect({ customerId, title, body, engagementId, metadata }) {
  const { rows } = await pool.query(
    `
    INSERT INTO in_app_notifications
      (recipient_type, recipient_id, type, title, body, engagement_id, metadata)
    VALUES ('customer', $1, $2, $3, $4, $5, $6::jsonb)
    RETURNING *
    `,
    [customerId, NOTIFY_TYPE, title, body || "", engagementId, JSON.stringify(metadata)]
  );
  return rows[0];
}

/**
 * Notify customer when support team addresses their ticket (reply, status, resolution).
 */
export async function notifyCustomerSupportTicketUpdate({
  ticket,
  reason,
  preview,
}) {
  const customerId = Number(ticket?.customerid);
  if (!Number.isFinite(customerId) || customerId < 1) return;

  const titles = {
    admin_reply: "Reply on your support ticket",
    status_change: "Support ticket updated",
    resolved: "Your support ticket was resolved",
    assigned: "Support team is reviewing your ticket",
  };

  const title = titles[reason] || "Update on your support ticket";
  const body =
    preview ||
    (reason === "resolved" && ticket.resolution_notes
      ? String(ticket.resolution_notes).slice(0, 240)
      : `Ticket ${ticket.ticket_number}: ${ticket.subject}`);

  const metadata = {
    ticket_id: ticket.ticket_id,
    ticket_number: ticket.ticket_number,
    reason,
    status: ticket.status,
  };

  const payload = {
    recipientType: "customer",
    recipientId: customerId,
    type: NOTIFY_TYPE,
    title,
    body: body.slice(0, 500),
    engagementId: ticket.engagement_id,
    metadata,
  };

  const secret = getInternalNotifySecret();
  if (secret) {
    try {
      const res = await fetch(`${getPaymentsServiceUrl()}/api/internal/in-app-notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": secret,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      const text = await res.text();
      console.warn("[tickets] in-app notify HTTP failed:", res.status, text);
    } catch (err) {
      console.warn("[tickets] in-app notify fetch failed:", err?.message || err);
    }
  }

  try {
    await insertNotificationDirect({
      customerId,
      title,
      body: payload.body,
      engagementId: ticket.engagement_id,
      metadata,
    });
  } catch (err) {
    console.warn("[tickets] in-app notify insert failed:", err?.message || err);
  }
}
