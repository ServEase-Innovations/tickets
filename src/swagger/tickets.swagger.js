/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Service health
 *   - name: Customer Tickets
 *     description: Raise and view support tickets (customer app)
 *   - name: Admin Tickets
 *     description: Back-office ticket management (requires admin secret)
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 service: { type: string, example: tickets }
 */

/**
 * @swagger
 * /api/tickets/meta:
 *   get:
 *     summary: Ticket metadata (categories, statuses, SLA)
 *     tags: [Customer Tickets]
 *     responses:
 *       200:
 *         description: Metadata for ticket forms
 */

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Customer Tickets]
 *     parameters:
 *       - in: header
 *         name: X-Customer-Id
 *         schema: { type: integer, format: int64 }
 *         description: Customer id (alternative to body.customerId)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, subject, description]
 *             properties:
 *               customerId:
 *                 type: integer
 *                 format: int64
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [GENERAL, BOOKING, PAYMENT, SERVICE_QUALITY, PROVIDER_CONDUCT, REFUND, APP_TECHNICAL]
 *                 default: GENERAL
 *               engagementId:
 *                 type: integer
 *                 format: int64
 *                 description: Optional; validated against engagements table
 *     responses:
 *       201:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 ticket: { $ref: "#/components/schemas/Ticket" }
 *       400:
 *         description: Validation error (e.g. ENGAGEMENT_NOT_FOUND, CUSTOMER_MISMATCH)
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       503:
 *         description: Schema not migrated (SCHEMA_NOT_READY)
 */

/**
 * @swagger
 * /api/tickets/mine:
 *   get:
 *     summary: List tickets for a customer
 *     tags: [Customer Tickets]
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED, CANCELLED]
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Ticket list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 tickets:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Ticket" }
 *       400:
 *         description: CUSTOMER_ID_REQUIRED
 */

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: Get one ticket (customer-owned)
 *     tags: [Customer Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *     responses:
 *       200:
 *         description: Ticket with comments (non-internal only)
 *       403:
 *         description: FORBIDDEN
 *       404:
 *         description: NOT_FOUND
 */

/**
 * @swagger
 * /api/tickets/{ticketId}/comments:
 *   post:
 *     summary: Add a customer comment on a ticket
 *     tags: [Customer Tickets]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *       - in: query
 *         name: customerId
 *         schema: { type: integer, format: int64 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               customerId: { type: integer, format: int64 }
 *               body: { type: string }
 *               authorName: { type: string, example: Customer }
 *     responses:
 *       200:
 *         description: Updated ticket
 *       403:
 *         description: FORBIDDEN
 *       404:
 *         description: NOT_FOUND
 */

/**
 * @swagger
 * /api/admin/tickets/stats:
 *   get:
 *     summary: Dashboard counts (open, overdue, etc.)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     parameters:
 *       - in: header
 *         name: X-Admin-Email
 *         schema: { type: string }
 *         description: Optional admin identity for audit
 *     responses:
 *       200:
 *         description: Stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 default_sla_hours: { type: integer }
 *                 stats: { $ref: "#/components/schemas/AdminStats" }
 *       401:
 *         description: UNAUTHORIZED
 *       503:
 *         description: ADMIN_NOT_CONFIGURED
 */

/**
 * @swagger
 * /api/admin/tickets/meta:
 *   get:
 *     summary: Admin metadata (statuses, priorities, categories)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     responses:
 *       200:
 *         description: Metadata
 */

/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     summary: List tickets (admin filters)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED, CANCELLED]
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *       - in: query
 *         name: assignedAdminEmail
 *         schema: { type: string }
 *       - in: query
 *         name: overdueOnly
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Ticket number, subject, or customer id
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Ticket list (includes internal comment visibility on detail only)
 */

/**
 * @swagger
 * /api/admin/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket with all comments (including internal)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *     responses:
 *       200:
 *         description: Ticket detail
 *       404:
 *         description: NOT_FOUND
 *   patch:
 *     summary: Update ticket (status, priority, SLA, assignment, resolution)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED, CANCELLED]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               sla_hours:
 *                 type: integer
 *                 description: Recalculates sla_due_at from created_at
 *               assigned_admin_email:
 *                 type: string
 *               resolution_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated ticket
 *       400:
 *         description: Invalid status/priority
 *       404:
 *         description: NOT_FOUND
 */

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/comments:
 *   post:
 *     summary: Add admin comment (optional internal note)
 *     tags: [Admin Tickets]
 *     security:
 *       - AdminTicketSecret: []
 *       - AdminPushSecret: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: integer, format: int64 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string }
 *               authorName: { type: string }
 *               is_internal:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Updated ticket
 *       404:
 *         description: NOT_FOUND
 */
