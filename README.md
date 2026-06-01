# Tickets service

Customer complaint / support ticketing API (port **5006** by default).

## Setup

```bash
cp .env.example .env.development
# In the monorepo, Postgres vars are read from services/payments/.env.development
# (same POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT).
# Set POSTGRES_DB=serveaso if empty in payments env.

npm install
npm run dev   # nodemon — restarts on src/ and prisma/ changes
```

Do **not** use `npm start` or `node src/server.js` during development (no auto-reload).

**On every startup** the service runs **Prisma `migrate deploy`** so `support_tickets` and related tables exist or stay up to date. If the database already had those tables (manual SQL), it **baselines** the initial migration—it does **not** run `db push` (unsafe on the shared `serveaso` database).

From monorepo root: `npm run dev` (includes tickets on port 5006) or `npm run dev:tickets`

## Prisma

| Command | Purpose |
|---------|---------|
| `npm run prisma:migrate` | Apply migrations (`migrate deploy`) |
| `npm run prisma:push` | Sync schema without migration files (dev) |
| `npm run prisma:migrate:dev` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run prisma:generate` | Regenerate client |

Schema: `prisma/schema.prisma`  
Migrations: `prisma/migrations/`  
Legacy SQL reference: `sql/schema.sql`

### Env

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Optional; overrides `POSTGRES_*` for Prisma |
| `PRISMA_SKIP_MIGRATE` | `true` to skip startup migrate |
| `TICKETS_DB_PUSH` | Unused (db push disabled on shared DB); use `prisma:migrate:dev` for schema changes |

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
