# Support CRM — Customer Support Ticketing System

A small full-stack CRM for managing customer support tickets.

**Stack:** Node.js · Express · SQLite · Vanilla JavaScript · Tailwind CSS (CDN)

## Features

- Create tickets (customer name/email, subject, description, priority)
- List all tickets in a clean table (ID, name, subject, status, priority, date)
- Live search-as-you-type across name, ticket ID, email, subject, description
- Filter by status (Open / In Progress / Closed)
- Ticket detail view with status updates and an internal notes thread
- **Stand-out addition:** a `priority` field (Low/Medium/High) on every ticket,
  plus a small dashboard strip on the home page (`GET /api/stats`) showing
  total/open/in-progress/closed counts and a "high priority, still open"
  count. Rationale: a real support team triages by urgency, not just status —
  status alone doesn't tell you what's on fire. Tradeoff: I kept it to one
  extra column and one read-only aggregate endpoint rather than a full
  analytics page, to stay inside the "one well-reasoned addition" guidance
  rather than bolting on several shallow features.

## Architecture

```
support-crm/
├── server.js           # Express app, API routes, and static files
├── database.js         # SQLite connection and two-table schema
├── static/
│   ├── index.html       # ticket list + search/filter + dashboard
│   ├── create.html      # new ticket form
│   ├── ticket.html       # ticket detail + status update + notes
│   └── js/api.js         # shared fetch helpers used by all pages
├── seed.js               # optional: populate a few sample tickets
├── package.json          # Node.js scripts and dependencies
├── Procfile              # for Render / Railway
├── render.yaml           # Render deployment configuration
├── .env.example
└── .gitignore
```

No ORM and no frontend build step: the small two-table schema uses Node.js's
built-in SQLite module, while Express serves both the JSON API
(`/api/...`) and static frontend from one process.

### Database schema

**tickets**: `id, ticket_id (unique), customer_name, customer_email, subject,
description, status, priority, created_at, updated_at`

**notes**: `id, ticket_id (fk), note_text, created_at`

### API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/tickets` | Create a ticket |
| GET | `/api/tickets?status=&search=` | List tickets, optional status/search filters |
| GET | `/api/tickets/{ticket_id}` | Ticket detail including notes |
| PUT | `/api/tickets/{ticket_id}` | Update status and/or append a note |
| GET | `/api/stats` | Dashboard counts (stand-out feature) |

## Local setup

Requires Node.js 22.5+ (Node 24 is installed on this computer).

```bash
git clone <your-repo-url>
cd support-crm
npm install

# optional: add a few sample tickets so the UI isn't empty
npm run seed

npm run dev
```

Open **http://localhost:8000** — the frontend and API are served from the
same Express server.

## Deployment (Railway)

1. Push this repo to GitHub.
2. On [Railway](https://railway.app), **New Project → Deploy from GitHub repo**.
3. Railway detects Node.js and reads the `Procfile` (`web: npm start`). It
   sets `PORT` automatically.
4. Once deployed, open the generated public URL to confirm tickets can be
   created, searched, filtered, and updated.

Note: SQLite writes to a local file, which is fine for this assessment but
isn't durable across redeploys on most free hosts — for anything beyond a
demo, swap `DATABASE_PATH` for a managed Postgres instance.

### Deployment (Render)

Create a new Blueprint from the repository. Render reads `render.yaml`, runs
`npm ci`, then starts the service with `npm start`.

## What I'd improve with more time

- Swap SQLite for Postgres with a proper migration tool for durability
- Pagination on `GET /api/tickets` for large ticket volumes
- Basic auth for support agents, and an `assigned_to` column
- Email notifications to the customer on status changes
- Automated API tests
