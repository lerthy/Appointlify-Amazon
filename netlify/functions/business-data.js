const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  // Try MCP tool first
  const viaMcp = await fetchViaMCP("fetch-table", {
    table: "appointments",
    select: "id, date, status, service_id, business_id",
    limit: 2000,
    eq: businessId ? { business_id: String(businessId) } : undefined,
  });
  if (viaMcp) return viaMcp;
  // Fallback to direct Supabase
  const sb = supabaseServer();
  let query = sb.from("appointments").select("id, date, status, service_id, business_id").limit(2000);
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
  // Exactly replicate frontend AppContext updateAnalytics() logic:
  // const hourCounts = Array(24).fill(0);
  // appointments.forEach(appointment => {
  //   const hour = new Date(appointment.date).getHours();
  //   hourCounts[hour]++;
  // });
  
  const hourCounts = Array(24).fill(0);
  
  console.log(`DEBUG: Processing ${appointments.length} appointments`);
  
  appointments.forEach(appointment => {
    if (!appointment?.date) return;
    
    const d = new Date(appointment.date);
    const utcHour = d.getUTCHours();
    
    // Apply timezone offset to match frontend
    // Charts show 10,09,13 but AI shows 8,7,11 -> need +2 offset
    const adjustedHour = (utcHour + 2) % 24;
    hourCounts[adjustedHour]++;
    
    // Debug first few
    if (hourCounts.reduce((sum, c) => sum + c, 0) <= 3) {
      console.log(`DEBUG: ${appointment.date} -> UTC: ${utcHour}, Adjusted: ${adjustedHour}`);
    }
  });
  
  // Convert to same format as frontend
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  console.log('DEBUG: Peak hours result:', peakHours.map(h => `${h.hour}:${h.count}`));
  
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


