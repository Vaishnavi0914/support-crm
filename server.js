const path = require("path");
const express = require("express");
const { createDatabase } = require("./database");

const app = express();
const port = Number(process.env.PORT) || 8000;
const db = createDatabase();

const VALID_STATUSES = new Set(["Open", "In Progress", "Closed"]);
const VALID_PRIORITIES = new Set(["Low", "Medium", "High"]);

app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "static")));

function nowIso() {
  return new Date().toISOString();
}

function error(res, status, detail) {
  return res.status(status).json({ detail });
}

function generateTicketId() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM tickets").get().count;
  const base = `TKT-${String(count + 1).padStart(3, "0")}`;
  const exists = db.prepare("SELECT 1 FROM tickets WHERE ticket_id = ?").get(base);
  return exists ? `${base}-${crypto.randomUUID().slice(0, 4)}` : base;
}

function validateTicket({ customer_name, customer_email, subject, description }) {
  if (typeof customer_name !== "string" || !customer_name.trim() || customer_name.trim().length > 120) {
    return "customer_name is required and must be 120 characters or fewer";
  }
  if (typeof customer_email !== "string" || !/^\S+@\S+\.\S+$/.test(customer_email.trim())) {
    return "customer_email must be a valid email address";
  }
  if (typeof subject !== "string" || !subject.trim() || subject.trim().length > 200) {
    return "subject is required and must be 200 characters or fewer";
  }
  if (typeof description !== "string" || !description.trim()) {
    return "description is required";
  }
  return null;
}

app.post("/api/tickets", (req, res) => {
  const validationError = validateTicket(req.body);
  if (validationError) return error(res, 422, validationError);

  const priority = VALID_PRIORITIES.has(req.body.priority) ? req.body.priority : "Medium";
  const ticketId = generateTicketId();
  const createdAt = nowIso();

  db.prepare(`
    INSERT INTO tickets (ticket_id, customer_name, customer_email, subject, description, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'Open', ?, ?, ?)
  `).run(
    ticketId,
    req.body.customer_name.trim(),
    req.body.customer_email.trim(),
    req.body.subject.trim(),
    req.body.description.trim(),
    priority,
    createdAt,
    createdAt,
  );

  return res.status(201).json({ ticket_id: ticketId, created_at: createdAt });
});

app.get("/api/tickets", (req, res) => {
  const { status, search } = req.query;
  if (status && !VALID_STATUSES.has(status)) {
    return error(res, 400, "status must be one of Open, In Progress, Closed");
  }

  let query = "SELECT ticket_id, customer_name, subject, status, priority, created_at FROM tickets WHERE 1 = 1";
  const params = [];
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (typeof search === "string" && search.trim()) {
    const like = `%${search.trim()}%`;
    query += " AND (customer_name LIKE ? OR ticket_id LIKE ? OR customer_email LIKE ? OR description LIKE ? OR subject LIKE ?)";
    params.push(like, like, like, like, like);
  }
  query += " ORDER BY created_at DESC";
  return res.json(db.prepare(query).all(...params));
});

app.get("/api/stats", (_req, res) => {
  const count = (where = "") => db.prepare(`SELECT COUNT(*) AS count FROM tickets ${where}`).get().count;
  return res.json({
    total: count(),
    open: count("WHERE status = 'Open'"),
    in_progress: count("WHERE status = 'In Progress'"),
    closed: count("WHERE status = 'Closed'"),
    high_priority_open: count("WHERE priority = 'High' AND status != 'Closed'"),
  });
});

app.get("/api/tickets/:ticketId", (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE ticket_id = ?").get(req.params.ticketId);
  if (!ticket) return error(res, 404, "Ticket not found");

  ticket.notes = db.prepare(
    "SELECT note_text, created_at FROM notes WHERE ticket_id = ? ORDER BY created_at ASC",
  ).all(req.params.ticketId);
  return res.json(ticket);
});

app.put("/api/tickets/:ticketId", (req, res) => {
  const ticket = db.prepare("SELECT 1 FROM tickets WHERE ticket_id = ?").get(req.params.ticketId);
  if (!ticket) return error(res, 404, "Ticket not found");

  const { status, notes } = req.body;
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return error(res, 400, "status must be one of Open, In Progress, Closed");
  }
  if (notes !== undefined && typeof notes !== "string") {
    return error(res, 422, "notes must be a string");
  }

  const updatedAt = nowIso();
  db.exec("BEGIN");
  try {
    if (status !== undefined) {
      db.prepare("UPDATE tickets SET status = ?, updated_at = ? WHERE ticket_id = ?")
        .run(status, updatedAt, req.params.ticketId);
    }
    if (notes?.trim()) {
      db.prepare("INSERT INTO notes (ticket_id, note_text, created_at) VALUES (?, ?, ?)")
        .run(req.params.ticketId, notes.trim(), updatedAt);
      db.prepare("UPDATE tickets SET updated_at = ? WHERE ticket_id = ?")
        .run(updatedAt, req.params.ticketId);
    }
    db.exec("COMMIT");
  } catch (exception) {
    db.exec("ROLLBACK");
    throw exception;
  }

  return res.json({ success: true, updated_at: updatedAt });
});

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "static", "index.html")));
app.get("/create", (_req, res) => res.sendFile(path.join(__dirname, "static", "create.html")));
app.get("/ticket", (_req, res) => res.sendFile(path.join(__dirname, "static", "ticket.html")));

app.listen(port, () => {
  console.log(`Support CRM running at http://localhost:${port}`);
});
