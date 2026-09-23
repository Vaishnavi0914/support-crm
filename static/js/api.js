// Small fetch wrapper shared by every page. No framework, no build step —
// matches the "keep it simple" guidance in the spec for a 2-table CRM.
const API_BASE = "/api";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error((await safeJson(res)).detail || res.statusText);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await safeJson(res)).detail || res.statusText);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await safeJson(res)).detail || res.statusText);
  return res.json();
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusBadgeClasses(status) {
  switch (status) {
    case "Open":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "In Progress":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Closed":
      return "bg-gray-100 text-gray-600 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function priorityBadgeClasses(priority) {
  switch (priority) {
    case "High":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "Medium":
      return "bg-indigo-100 text-indigo-700 border border-indigo-200";
    case "Low":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}
