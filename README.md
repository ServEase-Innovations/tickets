# Tickets service

Customer complaint / support ticketing API (port **5006** by default).

## Setup

```bash
cp .env.example .env.development
# In the monorepo, Postgres vars are read from services/payments/.env.development
# (same POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT).
# Only set PORT / SLA / ADMIN_TICKET_SECRET in services/tickets/.env.development unless deploying standalone.

psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f sql/schema.sql

npm install
npm run dev
```

From monorepo root: `npm run dev` (includes tickets on port 5006) or `npm run dev:tickets`

## API

| Audience | Method | Path |
|----------|--------|------|
| Customer | GET | `/api/tickets/meta` |
| Customer | POST | `/api/tickets` — body: `customerId`, `subject`, `description`, `category?`, `engagementId?` |
| Customer | GET | `/api/tickets/mine?customerId=` |
| Customer | GET | `/api/tickets/:id?customerId=` |
| Customer | POST | `/api/tickets/:id/comments` |
| Admin | GET | `/api/admin/tickets/stats` |
| Admin | GET | `/api/admin/tickets` |
| Admin | PATCH | `/api/admin/tickets/:id` — `status`, `priority`, `sla_hours`, `assigned_admin_email`, `resolution_notes` |
| Admin | POST | `/api/admin/tickets/:id/comments` — `body`, `is_internal?` |

Admin auth: headers `X-Admin-Ticket-Secret` (or `X-Admin-Push-Secret`) and optional `X-Admin-Email`.

## Business rules

- New tickets: status `OPEN`, priority `MEDIUM`, SLA **48 hours** (configurable via `TICKET_DEFAULT_SLA_HOURS`).
- Assigned to `DEFAULT_TICKET_ADMIN_EMAIL` (default `admin@serveaso.com`).
- Admin can set priority `LOW` / `MEDIUM` / `HIGH` and extend SLA hours (recalculates `sla_due_at` from `created_at`).
- Optional `engagementId` validated against `engagements` and customer ownership.

## UI env

- Web: `REACT_APP_TICKETS_URL`, `REACT_APP_ADMIN_TICKET_SECRET`
- iOS: `API_URLS.tickets` in `apps/servease-ios/src/config/apiUrls.ts`
