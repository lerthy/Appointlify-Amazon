const { createClient } = require("@supabase/supabase-js");

// Log env at function init (masked)
(() => {
  try {
    const mask = (v) => {
      if (!v) return 'missing';
      const s = String(v);
      if (s.length <= 8) return `${s[0]}***${s[s.length - 1]} (len ${s.length})`;
      return `${s.slice(0, 4)}***${s.slice(-4)} (len ${s.length})`;
    };
    const safeOrigin = (u) => {
      try { return new URL(u).origin; } catch { return 'invalid-url'; }
    };
    console.log('[business-data:init] Env summary', {
      SUPABASE_URL: process.env.SUPABASE_URL ? safeOrigin(process.env.SUPABASE_URL) : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      MCP_API_KEY: mask(process.env.MCP_API_KEY),
      FRONTEND_URL: "http://localhost:3000" || process.env.FRONTEND_URL || '*',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
  } catch { }
})();

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  .origin) : 'missing');
  .slice(0, 4)
}*** ${ String(key).slice(-4) } (len ${ String(key).length })` : 'missing');
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

function detectIntent(question) {
  const q = question.toLowerCase();
  if (q.includes("popular day") || q.includes("best day") || q.includes("busiest day") || q.includes("popular days")) return "popular_days";
  if (q.includes("peak hour") || q.includes("popular hour") || q.includes("busiest hour")) return "peak_hours";
  if (q.includes("service distribution") || q.includes("popular services") || q.includes("top services")) return "service_distribution";
  return "unknown";
}

async function fetchViaMCP(toolName, args) {
  // Call local MCP Netlify function if API key configured
  const mcpKey = process.env.MCP_API_KEY;
  if (!mcpKey) return null;
  try {
    // Use a relative URL to hit the same site
    const res = await fetch("/.netlify/functions/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": mcpKey },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.result?.content?.[0];
    if (content?.type === "json") return content.json;
    return null;
  } catch {
    return null;
  }
}

async function getAppointments(businessId) {
  // Try MCP tool first - get ALL appointments regardless of status/date
  const viaMcp = await fetchViaMCP("fetch-table", {
    table: "appointments",
    select: "*", // Get all fields to match frontend
    limit: 2000,
    eq: businessId ? { business_id: String(businessId) } : undefined,
  });
  if (viaMcp) return viaMcp;
  
  // Fallback to direct Supabase - get ALL appointments
  const sb = supabaseServer();
  let query = sb.from("appointments").select("*").limit(2000);
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getServices(businessId) {
  const viaMcp = await fetchViaMCP("fetch-table", {
    table: "services",
    select: "id, name, business_id",
    limit: 1000,
    eq: businessId ? { business_id: String(businessId) } : undefined,
  });
  if (viaMcp) return viaMcp;
  const sb = supabaseServer();
  let query = sb.from("services").select("id, name, business_id").limit(1000);
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function computePopularDays(appointments) {
  // Match frontend logic - use ALL appointments for historical analysis
  const counts = Array(7).fill(0);
  for (const a of appointments) {
    if (!a?.date) continue;
    const d = new Date(a.date);
    const idx = d.getDay();
    counts[idx] += 1;
  }
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days
    .map((day, i) => ({ day, count: counts[i], dayIndex: i }))
    .sort((a, b) => b.count - a.count);
}

function computePeakHours(appointments) {
  const hourCounts = Array(24).fill(0);
  
  appointments.forEach(appointment => {
    if (!appointment?.date) return;
    
    // KEY INSIGHT: The frontend uses new Date(appointment.date).getHours()
    // When a date string has "+00:00" timezone, JavaScript converts it:
    // - Frontend (user's browser in UTC+2/UTC+3): converts to local time
    // - Backend (Netlify server in UTC): stays in UTC
    // 
    // Solution: Parse the date string WITHOUT timezone to match frontend behavior
    // If date is "2025-10-15T08:00:00+00:00", extract "2025-10-15T08:00:00"
    let dateStr = appointment.date;
    if (typeof dateStr === 'string') {
      // Remove timezone suffix (+00:00, Z, etc.) to force local interpretation
      dateStr = dateStr.replace(/(\+00:00|Z)$/, '');
    }
    
    const d = new Date(dateStr);
    const hour = d.getHours(); // This will now interpret in server's "local" time
    
    // But server is still in UTC, so we need to add offset
    // October dates in Europe are UTC+3 (DST), November+ are UTC+2
    const month = d.getMonth();
    const isDST = month >= 2 && month <= 9; // March to October is DST
    const offset = isDST ? 3 : 2;
    const localHour = (hour + offset) % 24;
    
    hourCounts[localHour]++;
  });
  
  return hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function computeServiceDistribution(appointments, services) {
  const nameById = new Map();
  for (const s of services) nameById.set(String(s.id), s.name);
  const counter = new Map();
  for (const a of appointments) {
    if (!a?.service_id) continue;
    counter.set(String(a.service_id), (counter.get(String(a.service_id)) || 0) + 1);
  }
  const total = Array.from(counter.values()).reduce((s, v) => s + v, 0) || 1;
  const rows = Array.from(counter.entries()).map(([serviceId, count]) => ({
    id: serviceId,
    name: nameById.get(serviceId) || "Unknown",
    count,
    percentage: Math.round((count / total) * 100),
  }));
  return rows.sort((a, b) => b.count - a.count).slice(0, 10);
}

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    headers: new Map(Object.entries(event.headers)),
    json: async () => JSON.parse(event.body || "{}"),
    url: `https://${event.headers.host}${event.path}`
  };

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

if (req.method === "OPTIONS") {
  return { statusCode: 200, headers, body: "" };
}

if (req.method === "GET") {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "business-data function is running",
      method: "POST",
      expectedBody: { question: "string", businessId: "optional" },
      envCheck: {
        supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        mcp: !!process.env.MCP_API_KEY
      }
    })
  };
}

if (req.method !== "POST") {
  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed. Use POST with JSON body or GET for status." }) };
}

try {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid or empty JSON body" }) };
  }
  const { question, businessId } = body;
  if (!question || typeof question !== "string") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing 'question'" }) };
  }

  const intent = detectIntent(question);

  // Fetch core tables
  const [appointments, services] = await Promise.all([
    getAppointments(businessId),
    getServices(businessId),
  ]);

  let data = null;
  switch (intent) {
    case "popular_days":
      data = computePopularDays(appointments);
      break;
    case "peak_hours":
      data = computePeakHours(appointments);
      break;
    case "service_distribution":
      data = computeServiceDistribution(appointments, services);
      break;
    default:
      data = { note: "No specific metric detected; provide general insight using available data." };
  }

    );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ intent, data })
  };
} catch (err) {
  console.error("business-data error", err);
  return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error" }) };
}
};


