# Tickets service

Customer complaint / support ticketing API (port **5006** by default).

## Setup

```bash
cp .env.example .env.development
# In the monorepo, Postgres vars are read from services/payments/.env.development
# (same POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT).
# Set POSTGRES_DB=your_db if empty in payments env.

npm install
npm run dev   # nodemon — restarts on src/ and prisma/ changes
```

Do **not** use `npm start` or `node src/server.js` during development (no auto-reload).

**Schema is not applied on startup.** Run migrations from **[DB_Migrations](https://github.com/ServEase-Innovations/DB_Migrations)** first:

```bash
# monorepo root
npm run db:install && npm run db:migrate
```

From monorepo root: `npm run dev` (includes tickets on port 5006) or `npm run dev:tickets`

## Prisma (client only in this service)

| Command | Purpose |
|---------|---------|
| `npm run prisma:generate` | Regenerate client from `prisma/schema.prisma` |

**DDL / migrations** live in [`database/prisma/tickets/`](../../database/prisma/tickets/) (DB_Migrations repo). After editing schema there, copy to `prisma/schema.prisma` if needed for generate, or:

```bash
npx prisma generate --schema=../../database/prisma/tickets/schema.prisma
```

Do **not** run `prisma db push` or `migrate deploy` from this service against shared `serveaso`.

Legacy SQL reference: `sql/schema.sql`

### Env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Optional; overrides `POSTGRES_*` for Prisma |
| `PRISMA_SKIP_MIGRATE` | `true` to skip startup migrate |
| `TICKETS_DB_PUSH` | Unused (db push disabled on shared DB); use `prisma:migrate:dev` for schema changes |

## API documentation (Swagger)

| UI | URL |
|----|-----|
| **Swagger UI** | `http://localhost:5006/api-docs` |
| **OpenAPI JSON** | `http://localhost:5006/api-docs.json` |

On Render, open `https://<tickets-host>/api-docs` — the server URL follows the request host (or set `SWAGGER_SERVER_URL` / `RENDER_EXTERNAL_URL`).

Admin **Try it out**: use header `X-Admin-Ticket-Secret` (same value as utils `ADMIN_PUSH_SECRET`). Customer routes need `customerId` in query or body.

## API

| Audience | Method | Path |
|----------|--------|------|
| Customer | GET | `/api/tickets/meta` |
| Customer | POST | `/api/tickets` — body: `customerId`, `subject`, `description`, `category?`, `engagementId?` |
| Customer | GET | `/api/tickets/mine?customerId=` |
| Customer | GET | `/api/tickets/:id?customerId=` |
| Customer | POST | `/api/tickets/:id/comments` |
| Customer | POST | `/api/tickets/:id/accept-resolution` — closes ticket after customer confirms |
| Customer | POST | `/api/tickets/:id/reopen` — body: `body?` — customer rejects resolution |
| Admin | GET | `/api/admin/tickets/stats` |
| Admin | GET | `/api/admin/tickets` |
| Admin | PATCH | `/api/admin/tickets/:id` — `status`, `priority`, `sla_hours`, `assigned_admin_email` (not `CLOSED`) |
| Admin | POST | `/api/admin/tickets/:id/provide-resolution` — `resolution_notes` → `PENDING_CUSTOMER_CONFIRMATION` |
| Admin | POST | `/api/admin/tickets/:id/comments` — `body`, `is_internal?` |

Admin auth: headers `X-Admin-Ticket-Secret` (or `X-Admin-Push-Secret`) and optional `X-Admin-Email`.

## Business rules

- **Resolution workflow:** `OPEN` → `IN_PROGRESS` → admin **Provide resolution** → `PENDING_CUSTOMER_CONFIRMATION` → customer **Accept** → `CLOSED`, or customer **Reopen** → `REOPENED` → `IN_PROGRESS`.
- Admins cannot set `CLOSED` directly; only the customer accept action closes the ticket.
- New tickets: status `OPEN`, priority `MEDIUM`, SLA **48 hours** (configurable via `TICKET_DEFAULT_SLA_HOURS`).
- Assigned to `DEFAULT_TICKET_ADMIN_EMAIL` (default `admin@serveaso.com`).
- Admin can set priority `LOW` / `MEDIUM` / `HIGH` and extend SLA hours (recalculates `sla_due_at` from `created_at`).
- Optional `engagementId` validated against `engagements` and customer ownership.

## Epoch-first contract

Ticket and comment payloads include epoch mirror fields for datetime values:

- ticket: `sla_due_at_epoch`, `resolved_at_epoch`, `created_at_epoch`, `updated_at_epoch`
- comment: `created_at_epoch`

Request compatibility aliases supported:

- customer endpoints accept `customerId` and `customer_id`
- ticket create accepts `engagementId` and `engagement_id`
- admin list accepts `assignedAdminEmail` and `assigned_admin_email`

## UI env

- Web: `REACT_APP_TICKETS_URL`, `REACT_APP_ADMIN_TICKET_SECRET`
- iOS: `API_URLS.tickets` in `apps/servease-ios/src/config/apiUrls.ts`
