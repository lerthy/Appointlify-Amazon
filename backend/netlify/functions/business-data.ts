import { createClient } from "@supabase/supabase-js";

type DataRequestBody = {
  question?: string;
  businessId?: string | number;
};

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

function detectIntent(question: string): "popular_days" | "peak_hours" | "service_distribution" | "unknown" {
  const q = question.toLowerCase();
  if (q.includes("popular day") || q.includes("best day") || q.includes("busiest day") || q.includes("popular days")) return "popular_days";
  if (q.includes("peak hour") || q.includes("popular hour") || q.includes("busiest hour")) return "peak_hours";
  if (q.includes("service distribution") || q.includes("popular services") || q.includes("top services")) return "service_distribution";
  return "unknown";
}

async function fetchViaMCP<T = any>(toolName: string, args: Record<string, any>): Promise<T | null> {
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
    const content = (json as any)?.result?.content?.[0];
    if (content?.type === "json") return content.json as T;
    return null;
  } catch {
    return null;
  }
}

async function getAppointments(businessId?: string | number) {
  // Try MCP tool first
  const viaMcp = await fetchViaMCP<any[]>("fetch-table", {
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

async function getServices(businessId?: string | number) {
  const viaMcp = await fetchViaMCP<any[]>("fetch-table", {
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

function computePopularDays(appointments: Array<any>) {
  const activeStatuses = new Set(["scheduled", "confirmed", "completed"]);
  const counts = Array(7).fill(0);
  for (const a of appointments) {
    if (!a?.date) continue;
    if (!activeStatuses.has(a.status)) continue;
    const d = new Date(a.date);
    const idx = d.getDay();
    counts[idx] += 1;
  }
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days
    .map((day, i) => ({ day, count: counts[i], dayIndex: i }))
    .sort((a, b) => b.count - a.count);
}

function computePeakHours(appointments: Array<any>) {
  const activeStatuses = new Set(["scheduled", "confirmed", "completed"]);
  const counts = Array(24).fill(0);
  for (const a of appointments) {
    if (!a?.date) continue;
    if (!activeStatuses.has(a.status)) continue;
    const d = new Date(a.date);
    counts[d.getHours()] += 1;
  }
  return counts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function computeServiceDistribution(appointments: Array<any>, services: Array<any>) {
  const nameById = new Map<string, string>();
  for (const s of services) nameById.set(String(s.id), s.name);
  const counter = new Map<string, number>();
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

export default async (req: Request): Promise<Response> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    let body: DataRequestBody = {};
    try {
      body = await req.json() as DataRequestBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or empty JSON body" }), { status: 400, headers });
    }
    const { question, businessId } = body;
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'question'" }), { status: 400, headers });
    }

    const intent = detectIntent(question);

    // Fetch core tables
    const [appointments, services] = await Promise.all([
      getAppointments(businessId),
      getServices(businessId),
    ]);

    let data: any = null;
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

    return new Response(
      JSON.stringify({ intent, data }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error("business-data error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers });
  }
};

export const config = { path: "/business-data" };


