const { createDatabase } = require("./database");

const db = createDatabase();

const samples = [
  ["TKT-001", "Alice Nguyen", "alice@example.com", "Cannot log in to dashboard", "Getting a 500 error every time I try to log in since this morning.", "Open", "High"],
  ["TKT-002", "Marcus Lee", "marcus@example.com", "Invoice #4521 shows wrong amount", "The invoice total doesn't match what we agreed on the call.", "In Progress", "Medium"],
  ["TKT-003", "Priya Shah", "priya@example.com", "Feature request: dark mode", "Would love a dark mode option for the admin panel.", "Open", "Low"],
  ["TKT-004", "Diego Ramirez", "diego@example.com", "Password reset email not arriving", "Requested a reset 3 times, nothing in inbox or spam.", "Closed", "Medium"],
];

const now = new Date().toISOString();
const insertTicket = db.prepare(`
  INSERT OR IGNORE INTO tickets (ticket_id, customer_name, customer_email, subject, description, status, priority, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const ticket of samples) insertTicket.run(...ticket, now, now);

const noteExists = db.prepare("SELECT 1 FROM notes WHERE ticket_id = ? AND note_text = ?").get(
  "TKT-002", "Checking with billing team on the discrepancy.",
);
if (!noteExists) {
  db.prepare("INSERT INTO notes (ticket_id, note_text, created_at) VALUES (?, ?, ?)")
    .run("TKT-002", "Checking with billing team on the discrepancy.", now);
}

console.log("Seeded sample tickets.");
