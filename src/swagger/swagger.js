import swaggerJSDoc from "swagger-jsdoc";
import "./tickets.swagger.js";

const baseUrl =
  process.env.SWAGGER_SERVER_URL ||
  process.env.APP_URL ||
  process.env.BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:5006";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tickets API",
      version: "1.0.0",
      description:
        "Customer support / complaint ticketing. Customer routes require `customerId` in query, body, or `X-Customer-Id`. " +
        "Admin routes require `X-Admin-Ticket-Secret` or `X-Admin-Push-Secret` (same as utils `ADMIN_PUSH_SECRET`).",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        AdminTicketSecret: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Ticket-Secret",
          description: "Admin secret (or use X-Admin-Push-Secret with the same value)",
        },
        AdminPushSecret: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Push-Secret",
        },
        CustomerIdHeader: {
          type: "apiKey",
          in: "header",
          name: "X-Customer-Id",
          description: "Optional; customerId can also be sent as query or JSON body field",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "CUSTOMER_ID_REQUIRED" },
            message: { type: "string" },
          },
        },
        TicketComment: {
          type: "object",
          properties: {
            comment_id: { type: "integer", format: "int64" },
            ticket_id: { type: "integer", format: "int64" },
            author_type: { type: "string", enum: ["CUSTOMER", "ADMIN"] },
            author_id: { type: "integer", format: "int64", nullable: true },
            author_name: { type: "string", nullable: true },
            body: { type: "string" },
            is_internal: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            created_at_epoch: { type: "integer", nullable: true },
          },
        },
        Ticket: {
          type: "object",
          properties: {
            ticket_id: { type: "integer", format: "int64" },
            ticket_number: { type: "string", example: "TKT-20260603-0001" },
            customerid: { type: "integer", format: "int64" },
            engagement_id: { type: "integer", format: "int64", nullable: true },
            serviceproviderid: { type: "integer", format: "int64", nullable: true },
            category: {
              type: "string",
              enum: [
                "GENERAL",
                "BOOKING",
                "PAYMENT",
                "SERVICE_QUALITY",
                "PROVIDER_CONDUCT",
                "REFUND",
                "APP_TECHNICAL",
              ],
            },
            subject: { type: "string" },
            description: { type: "string" },
            status: {
              type: "string",
              enum: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"],
            },
            priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            assigned_admin_email: { type: "string", nullable: true },
            sla_hours: { type: "integer" },
            sla_due_at: { type: "string", format: "date-time" },
            sla_due_at_epoch: { type: "integer", nullable: true },
            is_overdue: { type: "boolean" },
            resolved_at: { type: "string", format: "date-time", nullable: true },
            resolved_at_epoch: { type: "integer", nullable: true },
            resolved_by: { type: "string", nullable: true },
            resolution_notes: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            created_at_epoch: { type: "integer", nullable: true },
            updated_at: { type: "string", format: "date-time" },
            updated_at_epoch: { type: "integer", nullable: true },
            customer_name: { type: "string", nullable: true },
            customer_mobile: { type: "string", nullable: true },
            comments: {
              type: "array",
              items: { $ref: "#/components/schemas/TicketComment" },
            },
          },
        },
        AdminStats: {
          type: "object",
          properties: {
            total: { type: "integer" },
            open: { type: "integer" },
            in_progress: { type: "integer" },
            waiting_customer: { type: "integer" },
            resolved: { type: "integer" },
            overdue: { type: "integer" },
            high_priority_open: { type: "integer" },
          },
        },
      },
    },
  },
  apis: ["./src/swagger/*.js"],
};

export default swaggerJSDoc(options);
