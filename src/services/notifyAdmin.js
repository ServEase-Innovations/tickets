import { getPaymentsServiceUrl } from "../config/env.js";
import { getInternalNotifySecret } from "./internalNotifySecret.js";

/**
 * Real-time alert for admin dashboard (Socket.IO room `admins`).
 */
export async function notifyAdminSupportTicketActivity({ ticket, reason, preview }) {
  const ticketId = Number(ticket?.ticket_id);
  if (!Number.isFinite(ticketId) || ticketId < 1) return;

  const titles = {
    new_ticket: "New support ticket",
    customer_reply: "Customer replied on ticket",
  };

  const title = titles[reason] || "Support ticket activity";
  const body =
    preview ||
    `Ticket ${ticket.ticket_number}: ${ticket.subject}`.slice(0, 500);

  const payload = {
    ticketId,
    ticketNumber: ticket.ticket_number,
    title,
    body: body.slice(0, 500),
    reason,
    status: ticket.status,
    customerId: ticket.customerid,
  };

  const secret = getInternalNotifySecret();
  if (!secret) {
    console.warn("[tickets] admin notify skipped — no internal secret");
    return;
  }

  try {
    const res = await fetch(`${getPaymentsServiceUrl()}/api/internal/support-ticket-activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[tickets] admin notify HTTP failed:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[tickets] admin notify failed:", err?.message || err);
  }
}
