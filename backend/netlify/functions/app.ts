import 'reflect-metadata';
import express from 'express';
import { request as httpsRequest } from 'https';
import twilio from 'twilio';
import cors, { CorsOptions } from 'cors';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import googleAuthRouter from '../../routes/googleAuthRouter.js';

// Initialize Supabase client//
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase: SupabaseClient<any, "public", "public", any, any> | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

} else {
  console.warn('Supabase backend env missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server will run with limited DB features)');
}

// Configure CORS allowlist for production
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5000')
  .split(',')
  .map(o => o.trim().replace(/\/$/, '')) // Remove trailing slashes
  .filter(Boolean);

type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, cb: CorsOriginCallback) => {
    // Allow non-browser requests (Postman, curl, etc.) or when no allowlist configured
    if (!origin || allowedOrigins.length === 0) {

      return cb(null, true);
    }
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {

      return cb(null, true);
    }
    // Instead of throwing error (which can cause 406), return false to reject
    console.warn('[CORS] Rejecting request from unauthorized origin:', normalizedOrigin);
    return cb(null, false);
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));

// Add request logging middleware
app.use((req, res, next) => {
  if (req.path === '/api/chat' || req.path === '/chat') {





  }
  next();
});

// Use express.raw() first to capture body as Buffer, then parse it
app.use(express.raw({ type: 'application/json' }));

// Custom body parser to handle Buffer objects from serverless-http
app.use((req, res, next) => {
  // If body is a Buffer (from serverless-http or express.raw), convert it to string and parse
  if (req.body && Buffer.isBuffer(req.body)) {
    try {
      const bodyString = req.body.toString('utf8');
      if (bodyString) {
        req.body = JSON.parse(bodyString);

      } else {
        req.body = {};
      }
    } catch (parseError: any) {
      console.error('app.ts: Failed to parse Buffer body:', parseError?.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError?.message
      });
    }
  }
  next();
});

// Add post-parsing logging
app.use((req, res, next) => {
  if (req.path === '/api/chat' || req.path === '/chat') {




    if (req.body) {
      // Body logging removed
    }
  }
  next();
});

// Register Google OAuth routes (after body parsing middleware)
// Add logging middleware to debug routing
app.use('/api', (req, res, next) => {
  if (req.path?.includes('google') || req.path?.includes('integrations')) {
    
  }
  next();
});

// Register Google OAuth router
// Note: When mounting at '/api', routes in the router should be relative (e.g., '/auth/google' not '/api/auth/google')
app.use('/api', googleAuthRouter);


// Add a test route to verify router is working
app.get('/api/integrations/google/test', (req, res) => {

  res.json({ success: true, message: 'Google OAuth router is working', path: req.path });
});

// Lightweight in-memory store for dev when Supabase is not configured
const hasSupabase = !!supabase;

type DevEmployee = {
  id: string;
  created_at: string;
  [key: string]: any;
};

const devStore: { employees: DevEmployee[] } = {
  employees: [],
};
function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Basic status routes so visiting the root doesn't 404
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API health for frontend reachability checks
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/** Allowlist check for short Google Maps links. */
function isResolvableShortMapsUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const h = u.hostname.replace(/^www\./, '').toLowerCase();
    if (h === 'maps.app.goo.gl') return true;
    if (h === 'goo.gl' && u.pathname.startsWith('/maps')) return true;
    return false;
  } catch {
    return false;
  }
}

const MAPS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  // SOCS cookie tells Google consent was already given — avoids consent.google.com redirect
  Cookie: 'SOCS=CAESEwgDEgk2MDQxMzMxMTQaAmVuIAEaBgiAuPqcBg==',
} as const;

/**
 * Reads the raw Location header from the first redirect hop using Node's https module.
 * Native fetch redirect:'manual' returns an opaque response where headers are inaccessible.
 */
function getFirstRedirectLocation(urlString: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlString);
      const req = httpsRequest(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: MAPS_HEADERS,
        },
        (incoming) => {
          resolve((incoming.headers['location'] as string) || null);
          incoming.destroy();
        }
      );
      req.setTimeout(8000, () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

app.get('/api/resolve-maps-url', async (req, res) => {
  let raw = req.query.url;
  if (Array.isArray(raw)) raw = raw[0];
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }
  let urlString = raw.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  if (!isResolvableShortMapsUrl(urlString)) {
    return res.status(400).json({ error: 'URL must be a maps.app.goo.gl or goo.gl/maps short link' });
  }

  try {
    // Step 1: read the raw Location header of the first redirect hop
    // maps.app.goo.gl → google.com/maps/place/.../@lat,lng,... in one hop
    const location = await getFirstRedirectLocation(urlString);
    if (location) {
      const isGoogleMaps = /google\.com\/maps/i.test(location) || /maps\.google\.com/i.test(location);
      if (isGoogleMaps) {
        console.log('[api/resolve-maps-url] first-hop resolved:', location);
        return res.json({ resolvedUrl: location });
      }
    }

    // Step 2: follow full redirect chain with SOCS cookie (skips consent page)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const followResp = await fetch(urlString, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { ...MAPS_HEADERS },
    });
    clearTimeout(timer);
    const finalUrl = followResp.url;
    if (!finalUrl) {
      return res.status(502).json({ error: 'Empty response URL' });
    }
    if (isResolvableShortMapsUrl(finalUrl)) {
      return res.status(502).json({ error: 'Redirect chain did not resolve to maps.google.com' });
    }
    console.log('[api/resolve-maps-url] full-follow resolved:', finalUrl);
    return res.json({ resolvedUrl: finalUrl });
  } catch (e: any) {
    console.error('[api/resolve-maps-url]', e?.message || e);
    return res.status(502).json({
      error: 'Failed to resolve maps URL',
      message: String(e?.message || e),
    });
  }
});

// Handle Chrome DevTools probe to avoid noisy 404s
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Backend running</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;padding:24px;line-height:1.5}</style>
  </head>
  <body>
    <h1>Backend is running</h1>
    <p>Try these endpoints:</p>
    <ul>
      <li>POST <code>/api/chat</code></li>
      <li>POST <code>/api/book-appointment</code></li>
      <li>POST <code>/api/send-sms</code></li>
      <li>GET <a href="/health">/health</a></li>
    </ul>
  </body>
</html>`);
});

// Middleware: guard DB-backed routes if Supabase isn't configured
function requireDb(req: any, res: any, next: any) {
  try {

    if (!supabase) {
      console.error('[requireDb] Supabase client not initialized. Check environment variables.');
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable. Please contact support.',
        details: 'Supabase not configured'
      });
    }

    next();
  } catch (error: any) {
    console.error('[requireDb] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || 'Unknown error in database middleware'
    });
  }
}

// Initialize Twilio client (optional)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
  try {
    client = twilio(accountSid, authToken);

  } catch (error: any) {

  }
} else {
  // Twilio not configured
}

// OpenAI client (lazy init to avoid crashing when no key is set)
let openaiClient: OpenAI | null = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Mock AI Service for fallback
async function getMockAIResponse(messages: any[], context: any) {
  const userMessage = messages[messages.length - 1]?.content || '';
  const businessName = context?.businessName || 'our business';
  const services = context?.services || [];
  const availableTimes = context?.availableTimes || [];

  // Extract conversation history
  const conversationHistory = messages.slice(0, -1).map(msg => ({
    sender: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  // Simple mock AI logic
  const message = userMessage.toLowerCase();

  // Greeting
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(message)) {
    return `Hello! Welcome to ${businessName}. I'm here to help you book an appointment. What service would you like to schedule today?`;
  }

  // Service inquiry
  if (/\b(services|what do you offer|menu|options)\b/.test(message)) {
    const serviceList = services.map((s: any) => `• ${s.name}${s.price != null ? ` - $${s.price}` : ''} (${s.duration} min)`).join('\n');
    return serviceList ? `Here are our available services:\n\n${serviceList}\n\nWhich service interests you?` :
      'We offer various services including consultations, treatments, and more. What type of service are you looking for?';
  }

  // Booking intent
  if (/\b(book|appointment|schedule|want|need)\b/.test(message)) {
    // Simple booking flow - check if we have enough info
    const hasName = /(?:i'm|my name is|i am)\s+([a-zA-Z]+)/i.test(userMessage);
    const hasService = services.some((s: any) => message.includes(s.name.toLowerCase()));
    const hasTime = /\d{1,2}:?\d{0,2}\s*(am|pm|o'clock)/i.test(message);
    const hasDate = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message);

    if (hasName && hasService && hasTime && hasDate) {
      // Extract basic info for demo
      const nameMatch = userMessage.match(/(?:i'm|my name is|i am)\s+([a-zA-Z]+)/i);
      const serviceName = services.find((s: any) => message.includes(s.name.toLowerCase()))?.name || 'service';
      const timeMatch = userMessage.match(/\d{1,2}:?\d{0,2}\s*(am|pm)/i);
      const dateStr = new Date().toISOString().split('T')[0]; // Default to today

      return `BOOKING_READY: {"name": "${nameMatch?.[1] || 'Customer'}", "service": "${serviceName}", "date": "${dateStr}", "time": "${timeMatch?.[0] || '2:00 PM'}"}`;
    }

    if (!hasName) {
      return "I'd be happy to help you book an appointment! Could you please tell me your name?";
    }
    if (!hasService) {
      return "What service would you like to book today?";
    }
    if (!hasDate) {
      return "What date would you prefer for your appointment?";
    }
    if (!hasTime) {
      const times = availableTimes.slice(0, 4).join(', ');
      return times ? `What time works best for you? We have: ${times}` : "What time would you prefer?";
    }
  }

  // Default response
  return "I'm here to help you book an appointment. You can tell me what service you need, when you'd like to come in, and your name, and I'll get you scheduled!";
}

type ChatBusiness = {
  id: string;
  name: string;
  description?: string | null;
};

type ChatService = {
  id: string;
  name: string;
  price?: number | null;
  duration?: number | null;
  description?: string | null;
  business_id: string;
};

type ChatCatalog = {
  businesses: ChatBusiness[];
  services: ChatService[];
  businessList: string;
  businessServicesList: string;
  status: 'ok' | 'empty' | 'unavailable';
  issue: string | null;
};

function formatCatalogForPrompt(businesses: ChatBusiness[], services: ChatService[]): Pick<ChatCatalog, 'businessList' | 'businessServicesList'> {
  if (businesses.length === 0) {
    return {
      businessList: 'No businesses found in live database.',
      businessServicesList: 'No business-service mappings found in live database.',
    };
  }

  const serviceMap = new Map<string, ChatService[]>();
  for (const service of services) {
    if (!serviceMap.has(service.business_id)) serviceMap.set(service.business_id, []);
    serviceMap.get(service.business_id)!.push(service);
  }

  const businessList = businesses
    .map((business, idx) => `${idx + 1}. ${business.name}${business.description ? ` - ${business.description}` : ''}`)
    .join('\n');

  const businessServicesList = businesses
    .map((business) => {
      const businessServices = serviceMap.get(business.id) || [];
      if (businessServices.length === 0) return `- ${business.name}: No services available`;
      const serviceLines = businessServices
        .map((service) => `  - ${service.name}${service.price != null ? ` ($${service.price})` : ''}${service.duration ? ` (${service.duration} min)` : ''}`)
        .join('\n');
      return `- ${business.name}:\n${serviceLines}`;
    })
    .join('\n');

  return { businessList, businessServicesList };
}

async function loadChatCatalog(): Promise<ChatCatalog> {
  if (!supabase) {
    return {
      businesses: [],
      services: [],
      businessList: 'Live database unavailable.',
      businessServicesList: 'Live database unavailable.',
      status: 'unavailable',
      issue: 'Supabase client is not configured',
    };
  }

  try {
    const [usersResult, servicesResult] = await Promise.all([
      supabase.from('users').select('id, name, description').limit(300),
      supabase.from('services').select('id, name, price, duration, description, business_id').limit(1000),
    ]);

    if (usersResult.error || servicesResult.error) {
      return {
        businesses: [],
        services: [],
        businessList: 'Live database query failed.',
        businessServicesList: 'Live database query failed.',
        status: 'unavailable',
        issue: usersResult.error?.message || servicesResult.error?.message || 'Unknown database error',
      };
    }

    const allUsers = (usersResult.data || []).filter((u: any) => u?.id && u?.name) as ChatBusiness[];
    const services = (servicesResult.data || []).filter((s: any) => s?.business_id && s?.name) as ChatService[];
    const businessIdsWithServices = new Set(services.map((s) => s.business_id));
    const businesses = allUsers.filter((u) => businessIdsWithServices.has(u.id));
    const formatted = formatCatalogForPrompt(businesses, services);

    const status: ChatCatalog['status'] = businesses.length > 0 ? 'ok' : 'empty';
    const issue = businesses.length > 0 ? null : 'No businesses with services were found';

    return {
      businesses,
      services,
      businessList: formatted.businessList,
      businessServicesList: formatted.businessServicesList,
      status,
      issue,
    };
  } catch (error: any) {
    return {
      businesses: [],
      services: [],
      businessList: 'Live database request failed.',
      businessServicesList: 'Live database request failed.',
      status: 'unavailable',
      issue: error?.message || 'Unknown exception while loading catalog',
    };
  }
}

function buildGroundedFallbackResponse(messages: any[], catalog: ChatCatalog): string {
  const latestUserMessage = String(messages[messages.length - 1]?.content || '').toLowerCase();

  if (catalog.status !== 'ok') {
    return 'I cannot access the live business catalog right now, so I do not want to guess. Please try again in a moment.';
  }

  if (/\b(companies|company|businesses|business|what.*here|names)\b/.test(latestUserMessage)) {
    const names = catalog.businesses.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
    return `Here are the businesses currently available in our live database:\n\n${names}`;
  }

  if (/\b(service|services|offer|provides|provide|have)\b/.test(latestUserMessage)) {
    return `Here are the current business-service mappings from our live database:\n\n${catalog.businessServicesList}`;
  }

  const names = catalog.businesses.slice(0, 8).map((b) => b.name).join(', ');
  return `I can help with bookings using live data. Current businesses include: ${names}. Tell me which one you want.`;
}

type KnownBookingFields = {
  name: string | null;
  business: string | null;
  service: string | null;
  date: string | null;
  time: string | null;
  email: string | null;
  phone: string | null;
};

type BookingData = {
  name: string;
  business: string;
  service: string;
  date: string;
  time: string;
  email: string;
  phone: string;
};

function normalizeJsonLike(raw: string): string {
  return raw
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"');
}

function extractBookingReadyData(text: string): BookingData | null {
  const match = text.match(/BOOKING_READY:\s*({[\s\S]*})/i);
  if (!match) return null;
  const raw = match[1].trim();
  const candidates = [raw, normalizeJsonLike(raw)];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const required = ['name', 'business', 'service', 'date', 'time', 'email', 'phone'];
      const hasAll = required.every((k) => typeof parsed?.[k] === 'string' && String(parsed[k]).trim().length > 0);
      if (!hasAll) return null;
      return {
        name: String(parsed.name).trim(),
        business: String(parsed.business).trim(),
        service: String(parsed.service).trim(),
        date: String(parsed.date).trim(),
        time: String(parsed.time).trim(),
        email: String(parsed.email).trim(),
        phone: String(parsed.phone).trim(),
      };
    } catch {
      // continue
    }
  }
  return null;
}

function isAffirmative(text: string): boolean {
  return /\b(yes|yeah|yep|confirm|book it|go ahead|correct)\b/i.test(text);
}

function isNegative(text: string): boolean {
  return /\b(no|nope|change|edit|cancel|wrong)\b/i.test(text);
}

function getBaseSiteUrl(req: any): string {
  const envUrl = String(process.env.FRONTEND_URL || '').split(',')[0]?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = String(req.headers?.['x-forwarded-proto'] || 'https');
  const host = String(req.headers?.host || 'appointly-ks.netlify.app');
  return `${proto}://${host}`.replace(/\/$/, '');
}

function parseAppointmentDateFlexible(dateInput: string, timeInput: string): string {
  const now = new Date();
  const normalizedDate = String(dateInput || '').trim().toLowerCase();
  const normalizedTime = String(timeInput || '').trim().toLowerCase().replace(/\bom\b/g, 'pm');

  const target = new Date(now);
  target.setSeconds(0, 0);

  if (normalizedDate === 'today') {
    // keep today
  } else if (normalizedDate === 'tomorrow') {
    target.setDate(target.getDate() + 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    const [y, m, d] = normalizedDate.split('-').map(Number);
    target.setFullYear(y, m - 1, d);
  } else {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const idx = days.indexOf(normalizedDate);
    if (idx >= 0) {
      const current = target.getDay();
      let delta = idx - current;
      if (delta <= 0) delta += 7;
      target.setDate(target.getDate() + delta);
    } else {
      // fallback to tomorrow
      target.setDate(target.getDate() + 1);
    }
  }

  const timeMatch = normalizedTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2] || '0', 10);
    const meridian = (timeMatch[3] || '').toLowerCase();
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    if (!meridian && hour >= 1 && hour <= 7) hour += 12; // user likely means afternoon
    target.setHours(hour, minute, 0, 0);
  } else {
    target.setHours(10, 0, 0, 0);
  }

  return target.toISOString();
}

function extractPendingBookingFromMessages(messages: any[]): BookingData | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = String(messages[i]?.content || '');
    const pending = content.match(/BOOKING_PENDING:\s*({[\s\S]*})/i);
    if (pending) {
      try {
        const parsed = JSON.parse(pending[1]);
        if (parsed?.name && parsed?.business && parsed?.service && parsed?.date && parsed?.time && parsed?.email && parsed?.phone) {
          return parsed as BookingData;
        }
      } catch {
        // continue
      }
    }
    const bookingReady = extractBookingReadyData(content);
    if (bookingReady) return bookingReady;
  }
  return null;
}

async function resolveBusinessByName(name: string): Promise<{ id: string; name: string } | null> {
  if (!supabase) return null;
  const exact = await supabase
    .from('users')
    .select('id, name')
    .eq('name', name)
    .limit(1);
  if (!exact.error && exact.data?.[0]) return exact.data[0] as { id: string; name: string };

  const partial = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .limit(1);
  if (!partial.error && partial.data?.[0]) return partial.data[0] as { id: string; name: string };
  return null;
}

async function resolveServiceForBusiness(serviceName: string, businessId: string): Promise<{ id: string; name: string; duration?: number | null } | null> {
  if (!supabase) return null;
  const exact = await supabase
    .from('services')
    .select('id, name, duration')
    .eq('business_id', businessId)
    .eq('name', serviceName)
    .limit(1);
  if (!exact.error && exact.data?.[0]) return exact.data[0] as { id: string; name: string; duration?: number | null };

  const partial = await supabase
    .from('services')
    .select('id, name, duration')
    .eq('business_id', businessId)
    .ilike('name', `%${serviceName}%`)
    .limit(1);
  if (!partial.error && partial.data?.[0]) return partial.data[0] as { id: string; name: string; duration?: number | null };
  return null;
}

async function getOrCreateCustomerId(booking: BookingData): Promise<string | null> {
  if (!supabase) return null;
  const existing = await supabase
    .from('customers')
    .select('id')
    .eq('email', booking.email)
    .limit(1);
  if (!existing.error && existing.data?.[0]?.id) return String(existing.data[0].id);

  const created = await supabase
    .from('customers')
    .insert([{ id: randomUUID(), name: booking.name, email: booking.email, phone: booking.phone, created_at: new Date().toISOString() }])
    .select('id')
    .single();
  if (created.error || !created.data?.id) return null;
  return String(created.data.id);
}

async function createAppointmentFromBooking(booking: BookingData, req: any): Promise<{ appointmentId: string; appointmentIso: string; businessName: string; serviceName: string; confirmationToken: string } | null> {
  if (!supabase) return null;

  const business = await resolveBusinessByName(booking.business);
  if (!business) return null;

  const service = await resolveServiceForBusiness(booking.service, business.id);
  if (!service) return null;

  const employeeRes = await supabase
    .from('employees')
    .select('id')
    .eq('business_id', business.id)
    .limit(1);
  const employeeId = employeeRes.data?.[0]?.id;
  if (!employeeId) return null;

  const customerId = await getOrCreateCustomerId(booking);
  if (!customerId) return null;

  const appointmentIso = parseAppointmentDateFlexible(booking.date, booking.time);
  const confirmationToken = randomUUID().replace(/-/g, '');
  const tokenExpiry = new Date();
  tokenExpiry.setHours(tokenExpiry.getHours() + 48);

  const inserted = await supabase
    .from('appointments')
    .insert([{
      id: randomUUID(),
      business_id: business.id,
      service_id: service.id,
      customer_id: customerId,
      employee_id: employeeId,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      date: appointmentIso,
      duration: service.duration || 30,
      status: 'scheduled',
      confirmation_status: 'pending',
      confirmation_token: confirmationToken,
      confirmation_token_expires: tokenExpiry.toISOString(),
      reminder_sent: false,
      notes: 'Booked via AI chat',
      created_at: new Date().toISOString(),
    }])
    .select('id')
    .single();

  if (inserted.error || !inserted.data?.id) return null;
  return {
    appointmentId: String(inserted.data.id),
    appointmentIso,
    businessName: business.name,
    serviceName: service.name,
    confirmationToken,
  };
}

async function sendBookingNotifications(booking: BookingData, details: { appointmentId: string; appointmentIso: string; businessName: string; serviceName: string; confirmationToken: string }, req: any): Promise<void> {
  const baseUrl = getBaseSiteUrl(req);
  const dateObj = new Date(details.appointmentIso);
  const dateString = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const cancelLink = `${baseUrl}/cancel/${details.appointmentId}`;
  const confirmationLink = `${baseUrl}/confirm-appointment?token=${details.confirmationToken}`;

  try {
    await fetch(`${baseUrl}/.netlify/functions/send-appointment-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_name: booking.name,
        to_email: booking.email,
        appointment_date: dateString,
        appointment_time: timeString,
        business_name: details.businessName,
        service_name: details.serviceName,
        cancel_link: cancelLink,
        confirmation_link: confirmationLink,
      }),
    });
  } catch (error) {
    console.error('chat booking email notification failed:', error);
  }

  try {
    await fetch(`${baseUrl}/.netlify/functions/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: booking.phone,
        message: `Hi ${booking.name}! Your ${details.serviceName} appointment at ${details.businessName} is booked for ${dateString} at ${timeString}.`,
      }),
    });
  } catch (error) {
    console.error('chat booking sms notification failed:', error);
  }
}

function extractKnownBookingFields(messages: any[], catalog: ChatCatalog): KnownBookingFields {
  const fields: KnownBookingFields = {
    name: null,
    business: null,
    service: null,
    date: null,
    time: null,
    email: null,
    phone: null,
  };

  const allText = messages.map((m: any) => String(m?.content || '')).join('\n');
  const lower = allText.toLowerCase();

  const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) fields.email = emailMatch[0];

  const phoneMatch = allText.match(/(\+?\d[\d\s\-()]{7,}\d)/);
  if (phoneMatch) fields.phone = phoneMatch[1].trim();

  const timeMatch = allText.match(/\b(\d{1,2}(:\d{2})?\s?(am|pm))\b/i);
  if (timeMatch) fields.time = timeMatch[1];

  if (/\btomorrow\b/i.test(allText)) fields.date = 'tomorrow';
  else {
    const isoDate = allText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoDate) fields.date = isoDate[1];
  }

  const knownBusinesses = catalog.businesses || [];
  for (const business of knownBusinesses) {
    if (lower.includes(String(business.name).toLowerCase())) {
      fields.business = business.name;
      break;
    }
  }

  const knownServices = catalog.services || [];
  for (const service of knownServices) {
    if (lower.includes(String(service.name).toLowerCase())) {
      fields.service = service.name;
      break;
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = String(messages[i]?.content || '').trim();
    if (!msg) continue;
    const match = msg.match(/(?:my name is|i am|i'm|name is)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i);
    if (match) {
      fields.name = match[1].trim();
      break;
    }
  }

  if (!fields.name && messages.length >= 2) {
    const lastMsg = String(messages[messages.length - 1]?.content || '').trim();
    const prevMsg = String(messages[messages.length - 2]?.content || '').toLowerCase();
    if (/\b(name)\b/.test(prevMsg) && /^[a-zA-Z][a-zA-Z'-]{1,30}$/.test(lastMsg)) {
      fields.name = lastMsg;
    }
  }

  return fields;
}

// AI Chatbot endpoint - supports Groq (preferred), OpenAI, and Mock fallback
// Handle both /api/chat and /chat paths for compatibility
const handleChat = async (req: any, res: any) => {
  // Log function invocation immediately



  try {
    // Handle case where body might be a string (shouldn't happen with express.json() but just in case)
    let body = req.body;
    if (typeof body === 'string') {

      try {
        body = JSON.parse(body);
      } catch (parseError) {
        console.error('app.ts: Failed to parse body as JSON:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON'
        });
      }
    }

    // Validate request body
    if (!body) {
      console.error('app.ts: No request body provided');
      console.error('app.ts: Request headers:', JSON.stringify(req.headers));
      return res.status(400).json({
        success: false,
        error: 'Request body is required',
        details: 'No request body found'
      });
    }

    // Request body validated

    const { messages, context } = body;

    // Validate messages
    if (!messages) {
      console.error('app.ts: Messages field is missing');
      return res.status(400).json({
        success: false,
        error: 'Messages field is required',
        details: 'Request body does not contain messages field'
      });
    }

    if (!Array.isArray(messages)) {
      console.error('app.ts: Messages is not an array, type:', typeof messages);
      return res.status(400).json({
        success: false,
        error: 'Messages must be an array',
        details: `Received type: ${typeof messages}`
      });
    }

    if (messages.length === 0) {
      console.error('app.ts: Messages array is empty');
      return res.status(400).json({
        success: false,
        error: 'Messages array cannot be empty',
        details: 'At least one message is required'
      });
    }

    // Validate message structure
    const invalidMessages = messages.filter((msg: any) => !msg || !msg.role || !msg.content);
    if (invalidMessages.length > 0) {
      console.error('app.ts: Invalid message structure found:', invalidMessages.length, 'invalid messages');
      return res.status(400).json({
        success: false,
        error: 'Invalid message structure',
        details: 'All messages must have role and content fields'
      });
    }




    const catalog = await loadChatCatalog();
    const knownFields = extractKnownBookingFields(messages, catalog);
    const latestUserMessage = String(messages[messages.length - 1]?.content || '');
    const pendingBooking = extractPendingBookingFromMessages(messages);
    console.log('chat catalog status:', {
      status: catalog.status,
      issue: catalog.issue,
      businesses: catalog.businesses.length,
      services: catalog.services.length,
      knownFields,
      hasPendingBooking: !!pendingBooking,
    });

    // If user is confirming a pending booking, finalize it here (same as form flow intent)
    if (pendingBooking && isAffirmative(latestUserMessage)) {
      const appointment = await createAppointmentFromBooking(pendingBooking, req);
      if (!appointment) {
        return res.json({
          success: false,
          message: 'Sorry, I could not create the appointment. Please verify business/service details and try again.',
          provider: 'booking-error',
        });
      }
      await sendBookingNotifications(pendingBooking, appointment, req);
      return res.json({
        success: true,
        message: `Appointment confirmed for ${pendingBooking.name}.\n\nBusiness: ${appointment.businessName}\nService: ${appointment.serviceName}\nDate: ${pendingBooking.date}\nTime: ${pendingBooking.time}\n\nA confirmation email and SMS have been sent.`,
        provider: 'booking-confirmed',
        appointmentId: appointment.appointmentId,
      });
    }

    if (pendingBooking && isNegative(latestUserMessage)) {
      return res.json({
        success: true,
        message: 'No problem. Tell me what you want to change (business, service, date, time, or contact details), and I will update it.',
        provider: 'booking-edit',
      });
    }

    // Check provider availability: Groq first, then OpenAI, then grounded fallback
    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const useOpenAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_OPENAI !== 'false';



    // Create system prompt with booking context
    const systemPrompt = `You are an intelligent booking assistant for ${context?.businessName || 'our business'}. 
You help customers book appointments in a conversational way.

LIVE DATABASE STATUS:
- Status: ${catalog.status}
- Issue: ${catalog.issue || 'none'}

LIVE BUSINESSES:
${catalog.businessList}

LIVE BUSINESS -> SERVICES:
${catalog.businessServicesList}

KNOWN BOOKING FIELDS (from conversation, use exact values):
- name: ${knownFields.name || 'missing'}
- business: ${knownFields.business || 'missing'}
- service: ${knownFields.service || 'missing'}
- date: ${knownFields.date || 'missing'}
- time: ${knownFields.time || 'missing'}
- email: ${knownFields.email || 'missing'}
- phone: ${knownFields.phone || 'missing'}

AVAILABLE TIME SLOTS (if provided by UI context):
${context?.availableTimes?.join(', ') || 'Checking availability...'}

BOOKING INSTRUCTIONS:
1. Be friendly and conversational
2. Help customers choose the right service
3. Collect: Customer name, business selection, service selection, preferred date and time
4. Collect EMAIL and PHONE before asking final confirmation.
5. Confirm all details before finalizing.
6. If they have all required info, respond with: "BOOKING_READY: {name: 'Customer Name', business: 'Business Name', service: 'Service Name', date: 'YYYY-MM-DD', time: 'HH:MM AM/PM', email: 'email@example.com', phone: '+123456789'}"
7. Never invent, guess, or fabricate business names or services.
8. If live database status is not "ok", explicitly say you cannot access current business data right now and ask the user to retry.
9. Only mention services under their actual business mapping from LIVE BUSINESS -> SERVICES.
10. NEVER change user-provided field values (especially name). Copy exact spelling from KNOWN BOOKING FIELDS or latest user message.
11. If user says only a name (e.g. "lerdi"), repeat exactly that name.
12. Do not ask for confirmation until required fields are complete: name, business, service, date, time, email, phone.

PERSONALITY:
- Professional but friendly
- Helpful and proactive
- Ask clarifying questions if needed
- Provide service recommendations when appropriate

Always respond naturally in conversation. Only use the BOOKING_READY format when you have all required information.`;

    // Prepare messages array with system prompt
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((msg: any) => msg && msg.role && msg.content)
    ];

    // Try Groq first (preferred - fast and free tier available)
    if (useGroq) {
      try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
          throw new Error('GROQ_API_KEY environment variable is not configured');
        }

        const groq = new Groq({ apiKey: groqApiKey });
        const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';






        const completion = await groq.chat.completions.create({
          model,
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.2,
        });


        const assistantMessage = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

        if (!assistantMessage || assistantMessage.trim() === '') {
          throw new Error('Groq returned empty response');
        }

        const bookingReady = extractBookingReadyData(assistantMessage);
        if (bookingReady) {
          const confirmationMessage = `I have all details needed to book your appointment.\n\nBusiness: ${bookingReady.business}\nService: ${bookingReady.service}\nDate: ${bookingReady.date}\nTime: ${bookingReady.time}\nName: ${bookingReady.name}\nEmail: ${bookingReady.email}\nPhone: ${bookingReady.phone}\n\nType "yes" to finalize the booking, or "no" to change details.\n\nBOOKING_PENDING: ${JSON.stringify(bookingReady)}`;
          return res.json({
            success: true,
            message: confirmationMessage,
            provider: 'groq-booking-pending',
            requiresConfirmation: true,
            bookingData: bookingReady,
          });
        }



        return res.json({
          success: true,
          message: assistantMessage,
          provider: 'groq',
          model: model
        });
      } catch (groqError: any) {
        console.error('app.ts: Groq API error:', {
          message: groqError?.message,
          status: groqError?.status,
          statusText: groqError?.statusText,
          error: groqError?.error
        });

        // If it's an API key error or rate limit, log and fall through to OpenAI/mock
        if (groqError?.message?.includes('API key') || groqError?.status === 401) {
          console.error('app.ts: Groq API key error, falling back to OpenAI/Mock');
        } else if (groqError?.status === 429) {
          console.error('app.ts: Groq rate limit exceeded, falling back to OpenAI/Mock');
        } else {
          console.error('app.ts: Groq error, falling back to OpenAI/Mock:', groqError?.message);
        }
        // Fall through to try OpenAI or mock
      }
    }

    // Try OpenAI if Groq failed or not available
    if (useOpenAI) {
      try {

        const openai = getOpenAI();
        if (!openai) {
          throw new Error('OPENAI_API_KEY not available');
        }


        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.2,
        });


        const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        const bookingReady = extractBookingReadyData(assistantMessage);
        if (bookingReady) {
          const confirmationMessage = `I have all details needed to book your appointment.\n\nBusiness: ${bookingReady.business}\nService: ${bookingReady.service}\nDate: ${bookingReady.date}\nTime: ${bookingReady.time}\nName: ${bookingReady.name}\nEmail: ${bookingReady.email}\nPhone: ${bookingReady.phone}\n\nType "yes" to finalize the booking, or "no" to change details.\n\nBOOKING_PENDING: ${JSON.stringify(bookingReady)}`;
          return res.json({
            success: true,
            message: confirmationMessage,
            provider: 'openai-booking-pending',
            requiresConfirmation: true,
            bookingData: bookingReady,
          });
        }

        return res.json({
          success: true,
          message: assistantMessage,
          provider: 'openai',
          usage: completion.usage
        });
      } catch (openaiError: any) {
        console.error('app.ts: OpenAI API error:', {
          message: openaiError?.message,
          status: openaiError?.status,
          error: openaiError?.error
        });
        // Fall through to mock AI
      }
    }

    const groundedFallback = buildGroundedFallbackResponse(messages, catalog);
    return res.json({
      success: true,
      message: groundedFallback,
      provider: 'grounded-fallback',
      note: 'AI provider unavailable; answered from live database context without guessing.'
    });
  } catch (error: any) {
    console.error('app.ts: Top-level error in chat endpoint:', {
      message: error?.message,
      stack: error?.stack
    });

    // Always return a response, never 500
    const catalog = await loadChatCatalog();
    return res.json({
      success: true,
      message: buildGroundedFallbackResponse(req.body?.messages || [], catalog),
      provider: 'error-fallback',
      note: 'A processing error occurred; response is grounded and non-fabricated.'
    });
  }
};

// Register the chat handler for both paths
app.post('/api/chat', handleChat);
app.post('/chat', handleChat);

// Mock booking endpoint (replace with your actual booking logic)
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { name, service, date, time, email, phone } = req.body;

    if (process.env.NODE_ENV !== 'production') {

    }

    // Here you would integrate with your actual booking system
    // For now, we'll just simulate a successful booking
    const bookingId = `apt_${Date.now()}`;

    res.json({
      success: true,
      bookingId,
      message: `Appointment booked successfully! Your booking ID is ${bookingId}`,
      details: { name, service, date, time, email, phone }
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment'
    });
  }
});

// SMS endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'SMS service not configured. Please set up Twilio credentials.'
      });
    }

    const { to, message } = req.body;

    // Format phone number to E.164 format
    let formattedPhone = to.replace(/\D/g, ''); // Remove all non-digits

    // Add country code if not present
    if (!formattedPhone.startsWith('383') && !formattedPhone.startsWith('+383')) {
      // Kosovo phone numbers starting with 043, 044, 045, 046, 047, 048, 049
      if (formattedPhone.startsWith('043') || formattedPhone.startsWith('044') ||
        formattedPhone.startsWith('045') || formattedPhone.startsWith('046') ||
        formattedPhone.startsWith('047') || formattedPhone.startsWith('048') ||
        formattedPhone.startsWith('049')) {
        formattedPhone = `383${formattedPhone.substring(1)}`; // Remove first 0, add 383
      }
    }

    formattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone
    });

    res.json({ success: true, messageId: result.sid });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email endpoint (simulated; replace with real provider like SES/SendGrid)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    if (process.env.NODE_ENV !== 'production') {

    }
    const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return res.json({ success: true, messageId: emailId, message: 'Email sent successfully (simulated)' });
  } catch (error) {
    console.error('Error in /api/send-email:', error);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Business data endpoints (moved logic to backend)
app.get('/api/business/:businessId/services', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;

    const { data, error } = await supabase!
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) {
      console.error('[services] Supabase error:', error.message, error);
      throw error;
    }
    return res.json({ success: true, services: data || [] });
  } catch (error) {
    console.error('[services] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

app.get('/api/business/:businessId/employees', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;

    const { data, error } = await supabase!
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) {
      console.error('[employees] Supabase error:', error.message, error);
      throw error;
    }
    return res.json({ success: true, employees: data || [] });
  } catch (error) {
    console.error('[employees] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

function buildDefaultWorkingHours() {
  return [
    { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
    { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
    { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
    { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
    { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
    { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
    { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
  ];
}

async function ensureBusinessSettings(businessId: string) {
  // Attempt to load latest existing settings
  const { data, error } = await supabase!
    .from('business_settings')
    .select('*')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!error && Array.isArray(data) && data.length > 0) {
    // Use the most recently updated row if multiple exist
    return { data: data[0], created: false };
  }

  if (error && error.code !== 'PGRST116') {
    // Unexpected error (not "No rows found")
    console.error('[ensureBusinessSettings] Unexpected Supabase error:', error);
    throw error;
  }

  // Fetch business name (user name)
  let businessName = 'Business Settings';
  try {
    const { data: userData } = await supabase!
      .from('users')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();

    if (userData && userData.name) {
      businessName = userData.name;
    }
  } catch (err) {
    console.warn('[ensureBusinessSettings] Failed to fetch business name, using default:', err);
  }

  const defaultSettings = {
    business_id: businessId,
    name: businessName,
    working_hours: buildDefaultWorkingHours(),
    blocked_dates: [],
    breaks: [],
    appointment_duration: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted, error: insertError } = await supabase!
    .from('business_settings')
    .insert([defaultSettings])
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return { data: inserted, created: true };
}

app.get('/api/business/:businessId/settings', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, created } = await ensureBusinessSettings(businessId);
    if (created) {

    }
    return res.json({ success: true, settings: data || null });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch business settings' });
  }
});

app.patch('/api/business/:businessId/settings', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body || {};

    const normalized = {
      working_hours: Array.isArray(updates.working_hours) ? updates.working_hours : buildDefaultWorkingHours(),
      blocked_dates: Array.isArray(updates.blocked_dates) ? updates.blocked_dates : [],
      breaks: Array.isArray(updates.breaks) ? updates.breaks : [],
      appointment_duration: typeof updates.appointment_duration === 'number' && updates.appointment_duration > 0
        ? updates.appointment_duration
        : 30,
      updated_at: new Date().toISOString()
    };

    const { data: existingRows, error: existingError } = await supabase!
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });

    if (existingError) {
      console.error('[PATCH /api/business/:businessId/settings] error checking existing:', existingError);
      return res.status(500).json({
        success: false,
        error: existingError.message,
        details: existingError.details,
        code: existingError.code
      });
    }

    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
    let dbResult: any = null;

    if (existing) {
      let name: string = (existing as any).name;
      if (name == null || name === '') {
        const { data: userRow } = await supabase!.from('users').select('name').eq('id', businessId).maybeSingle();
        name = (userRow?.name != null && userRow.name !== '') ? String(userRow.name) : 'Business';
      }
      const updatePayload = { ...normalized, name: String(name) };
      const { data, error } = await supabase!
        .from('business_settings')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[PATCH /api/business/:businessId/settings] update error:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          details: error.details,
          code: error.code
        });
      }
      dbResult = data;
    } else {
      let businessName = 'Business';
      try {
        const { data: userRow } = await supabase!
          .from('users')
          .select('name')
          .eq('id', businessId)
          .maybeSingle();
        if (userRow?.name != null && userRow.name !== '') businessName = String(userRow.name);
      } catch { }

      const insertPayload = {
        business_id: businessId,
        name: String(businessName || 'Business'),
        working_hours: normalized.working_hours,
        blocked_dates: normalized.blocked_dates,
        breaks: normalized.breaks,
        appointment_duration: normalized.appointment_duration,
        created_at: new Date().toISOString(),
        updated_at: normalized.updated_at
      };

      const { data, error } = await supabase!
        .from('business_settings')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error('[PATCH /api/business/:businessId/settings] insert error:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          details: error.details,
          code: error.code
        });
      }
      dbResult = data;
    }

    return res.json({ success: true, settings: dbResult });
  } catch (error: any) {
    console.error('[PATCH /api/business/:businessId/settings]', error);
    return res.status(500).json({ success: false, error: 'Failed to update business settings', details: error.message });
  }
});

// Get all businesses
app.get('/api/businesses', requireDb, async (req, res) => {
  try {
    const { data: users, error } = await supabase!
      .from('users')
      .select('id, name, description, logo, category, business_address, phone, owner_name, website, role');

    if (error) {
      console.error('[GET /api/businesses] Error:', error);
      throw error;
    }

    // Filter for businesses that have at least 1 employee and 1 service
    const completedBusinesses = [];

    for (const business of users || []) {
      // Check for employees
      const { data: employees, error: empError } = await supabase!
        .from('employees')
        .select('id')
        .eq('business_id', business.id)
        .limit(1);

      // Check for services
      const { data: services, error: servError } = await supabase!
        .from('services')
        .select('id')
        .eq('business_id', business.id)
        .limit(1);

      const hasEmployees = !empError && employees && employees.length > 0;
      const hasServices = !servError && services && services.length > 0;

      if (empError) console.error(`[GET /api/businesses] Employee check error for ${business.id}:`, empError);
      if (servError) console.error(`[GET /api/businesses] Service check error for ${business.id}:`, servError);

      if (hasEmployees && hasServices) {
        completedBusinesses.push(business);
      }
    }

    return res.json({ success: true, businesses: completedBusinesses });
  } catch (error: any) {
    console.error('[GET /api/businesses] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch businesses', details: error.message });
  }
});

app.get('/api/business/:businessId/info', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Check if businessId is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);

    let query = supabase!
      .from('users')
      .select('id, name, description, logo, subdomain, business_address');

    if (isUuid) {
      query = query.eq('id', businessId);
    } else {
      query = query.eq('subdomain', businessId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('[GET /api/business/:businessId/info] Supabase error:', {
        businessId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      });
      
      // Return 404 if business not found, 500 for other errors
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({ success: false, error: 'Business not found' });
      }
      
      throw error;
    }
    
    return res.json({ success: true, info: data || null });
  } catch (error: any) {
    console.error('[GET /api/business/:businessId/info] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch business info',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Email verification: GET validate token and set email_verified; POST send verification email
app.get('/api/verify-email', async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Database not configured' });
    }
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, auth_user_id, email_verified, email_verification_token_expires')
      .eq('email_verification_token', token)
      .single();
    if (findError || !user) {
      return res.status(404).json({ success: false, error: 'Invalid or expired verification token' });
    }
    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true,
        email: user.email,
      });
    }
    const expires = user.email_verification_token_expires ? new Date(user.email_verification_token_expires) : null;
    if (expires && expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired. Please request a new one.',
        expired: true,
      });
    }
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_token_expires: null,
      })
      .eq('id', user.id);
    if (updateError) {
      console.error('[GET /api/verify-email] Update error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to verify email' });
    }
    // Optionally confirm email in Supabase Auth so signInWithPassword works
    if (user.auth_user_id) {
      try {
        await (supabase as any).auth.admin.updateUserById(user.auth_user_id, { email_confirm: true });
      } catch (authErr) {
        console.warn('[GET /api/verify-email] Supabase auth confirm:', authErr);
      }
    }
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      email: user.email,
    });
  } catch (error: any) {
    console.error('[GET /api/verify-email] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/verify-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Database not configured' });
    }
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', email.trim().toLowerCase())
      .single();
    if (findError || !user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.',
      });
    }
    if (user.email_verified) {
      return res.status(200).json({ success: true, message: 'Email is already verified' });
    }
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verification_token: token,
        email_verification_token_expires: expiry.toISOString(),
      })
      .eq('id', user.id);
    if (updateError) {
      console.error('[POST /api/verify-email] Update token error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to send verification email' });
    }
    const origin = (req.headers.origin || req.headers.referer || '') as string;
    let frontendUrl = 'http://localhost:3000';
    if (origin.includes('appointly-ks.netlify.app')) frontendUrl = 'https://appointly-ks.netlify.app';
    else if (origin.includes('appointly-qa.netlify.app')) frontendUrl = 'https://appointly-qa.netlify.app';
    else if (process.env.FRONTEND_URL) frontendUrl = process.env.FRONTEND_URL.split(',')[0].trim();
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5; text-align: center;">Verify Your Email</h1>
        <p>Thank you for registering with Appointly!</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link: <a href="${verificationLink}" style="color: #4F46E5;">${verificationLink}</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
      </div>`;
    try {
      const apiBase = process.env.BACKEND_URL || process.env.VITE_API_URL || 'http://localhost:5000';
      const sendRes = await fetch(`${apiBase.replace(/\/$/, '')}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Verify Your Email - Appointly',
          html,
          text: `Verify your email: ${verificationLink}`,
        }),
      });
      if (!sendRes.ok) console.warn('[POST /api/verify-email] Send email failed');
    } catch (emailErr) {
      console.warn('[POST /api/verify-email] Send email error:', emailErr);
    }
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a verification email has been sent.',
    });
  } catch (error: any) {
    console.error('[POST /api/verify-email] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/users/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });
    if (!supabase) {
      return res.json({ success: true, user: null });
    }
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', String(email))
      .single();
    if (error) {
      // No rows -> return null user instead of 500
      if (error.code === 'PGRST116' || (error.message && error.message.includes('No rows'))) {
        return res.json({ success: true, user: null });
      }
      return res.status(200).json({ success: true, user: null });
    }
    return res.json({ success: true, user: data || null });
  } catch (error) {
    console.error('Error in by-email:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Update user profile
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Prepare update object (only include provided fields)
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.business_address !== undefined) updateData.business_address = updates.business_address;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.owner_name !== undefined) updateData.owner_name = updates.owner_name;
    if (updates.subdomain !== undefined) {
      const raw = updates.subdomain;
      const subdomain = raw === null || raw === '' ? '' : String(raw).toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9-]/g, '');
      if (subdomain && subdomain.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Subdomain must be at least 3 characters',
        });
      }
      if (subdomain) {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('subdomain', subdomain)
          .neq('id', id)
          .maybeSingle();
        if (existing) {
          return res.status(400).json({
            success: false,
            error: 'This subdomain is already taken',
          });
        }
      }
      updateData.subdomain = subdomain || null;
    }

    // Update the user
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[PATCH /api/users/:id] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update profile',
        details: error
      });
    }

    if (!data) {
      console.error('[PATCH /api/users/:id] No data returned');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }


    return res.json({
      success: true,
      user: data
    });
  } catch (error: any) {
    console.error('[PATCH /api/users/:id] Exception:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

app.get('/api/business/:businessId/appointments', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Business dashboard must list all appointments (including awaiting customer confirmation).
    // Customer confirmation is tracked via confirmation_status; UI shows "Awaiting confirmation" for pending.
    const { data, error } = await supabase!
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: true });

    if (error) {
      console.error('[appointments] Supabase error:', error.message, error);
      throw error;
    }
    return res.json({ success: true, appointments: data || [] });
  } catch (error) {
    console.error('[appointments] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

app.get('/api/business/:businessId/appointmentsByDay', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, employeeId } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date is required (YYYY-MM-DD)' });

    // Fix: Remove spaces before/after T to avoid Invalid Time Value
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    // Only include active appointments (not cancelled or no-show)
    const activeStatuses = ['scheduled', 'confirmed', 'completed'];

    let query = supabase!
      .from('appointments')
      .select('date, duration, employee_id, status')
      .eq('business_id', businessId)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString())
      .in('status', activeStatuses); // Only active appointments

    if (employeeId) {
      query = query.eq('employee_id', String(employeeId));
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, appointments: data || [] });
  } catch (error) {
    console.error('Error fetching appointmentsByDay:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch appointments for day' });
  }
});

// Create appointment (and customer if needed), then send notifications
app.post('/api/appointments', requireDb, async (req, res) => {
  try {
    const { business_id, service_id, employee_id, name, phone, email, notes, date, duration, confirmation_token, confirmation_token_expires } = req.body;

    // Validate required fields
    if (!business_id || !service_id || !employee_id || !name || !phone || !email || !date) {
      console.error('[POST /api/appointments] Missing required fields:', {
        business_id: !!business_id,
        service_id: !!service_id,
        employee_id: !!employee_id,
        name: !!name,
        phone: !!phone,
        email: !!email,
        date: !!date
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          business_id: !business_id ? 'Business ID is required' : undefined,
          service_id: !service_id ? 'Service ID is required' : undefined,
          employee_id: !employee_id ? 'Employee ID is required' : undefined,
          name: !name ? 'Name is required' : undefined,
          phone: !phone ? 'Phone is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          date: !date ? 'Date is required' : undefined
        }
      });
    }

    const appointmentDate = new Date(date);

    // Validate date
    if (isNaN(appointmentDate.getTime())) {
      console.error('[POST /api/appointments] Invalid date format:', date);
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    // Check for overlapping appointments - only active ones
    // An appointment overlaps if it starts before this one ends and ends after this one starts
    const activeStatuses = ['scheduled', 'confirmed', 'completed'];
    const appointmentEnd = new Date(appointmentDate.getTime() + (duration || 30) * 60000);

    // Optimize: only fetch appointments for the same day
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existing, error: existingErr } = await supabase!
      .from('appointments')
      .select('id, status, date, duration')
      .eq('business_id', business_id)
      .eq('employee_id', employee_id)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString())
      .in('status', activeStatuses); // Only check active appointments

    if (existingErr) {
      console.error('[POST /api/appointments] Error fetching existing:', existingErr);
      throw existingErr;
    }



    // Check for time slot overlaps
    if (existing && existing.length > 0) {
      const hasOverlap = existing.some((appt: any) => {
        const existingStart = new Date(appt.date);
        const existingEnd = new Date(existingStart.getTime() + (appt.duration || 30) * 60000);

        const overlaps = appointmentDate < existingEnd && appointmentEnd > existingStart;

        return overlaps;
      });

      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          error: 'This time slot overlaps with an existing appointment. Please choose another time.'
        });
      }
    }



    // Find or create customer by email
    let customerId = '';
    const { data: existingCustomer } = await supabase!
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    if (existingCustomer?.id) {
      customerId = existingCustomer.id;

    } else {

      const { data: newCustomer, error: custErr } = await supabase!
        .from('customers')
        .insert([{ name, email, phone }])
        .select('id')
        .single();
      if (custErr) {
        console.error('[POST /api/appointments] Error creating customer:', custErr);
        throw custErr;
      }
      customerId = newCustomer.id;

    }

    // Fetch service for duration if not provided
    let finalDuration = duration;
    if (!finalDuration) {
      const { data: svc } = await supabase!
        .from('services')
        .select('duration')
        .eq('id', service_id)
        .single();
      finalDuration = svc?.duration || 30;
    }


    const { data: inserted, error: insertErr } = await supabase!
      .from('appointments')
      .insert([{
        customer_id: customerId,
        service_id,
        business_id,
        employee_id,
        name,
        phone,
        email,
        notes: notes || null,
        date: appointmentDate.toISOString(),
        duration: finalDuration,
        status: 'scheduled',
        confirmation_status: 'pending', // Mark as pending until customer confirms
        confirmation_token: confirmation_token || null,
        confirmation_token_expires: confirmation_token_expires || null,
        reminder_sent: false
      }])
      .select('id')
      .single();
    if (insertErr) {
      console.error('[POST /api/appointments] Error inserting appointment:', insertErr);
      throw insertErr;
    }


    // Calendar sync will happen when the customer confirms the appointment via email
    // See confirm-appointment.js for calendar sync on confirmation

    return res.json({ success: true, appointmentId: inserted.id });
  } catch (error: any) {
    console.error('[POST /api/appointments] Unexpected error:', {
      message: error?.message,
      code: error?.code,
      details: error?.details
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      details: error?.message || 'Unknown error'
    });
  }
});

app.patch('/api/appointments/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, date, employee_id, service_id, name, email, phone, notes, duration } = req.body;

    console.log('[PATCH /api/appointments/:id] Updating appointment', { id, fields: Object.keys(req.body) });

    const updates: Record<string, any> = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'confirmed') {
        updates.confirmation_status = 'confirmed';
      }
    }
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;
    if (employee_id !== undefined) updates.employee_id = employee_id;
    if (service_id !== undefined) updates.service_id = service_id;
    if (duration !== undefined) {
      const d = Number(duration);
      if (Number.isFinite(d) && d > 0) updates.duration = Math.round(d);
    }

    if (date !== undefined) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }
      if (newDate < new Date()) {
        return res.status(400).json({ success: false, error: 'Cannot update appointment to a past date/time' });
      }
      updates.date = newDate.toISOString();
    }

    // Overlap check if scheduling fields change
    if (date !== undefined || employee_id !== undefined || duration !== undefined) {
      const { data: current } = await supabase!
        .from('appointments')
        .select('date, duration, employee_id, business_id')
        .eq('id', id)
        .maybeSingle();

      if (current) {
        const checkDate = updates.date ? new Date(updates.date) : new Date((current as any).date);
        const checkEmployee = updates.employee_id || (current as any).employee_id;
        const checkDuration = updates.duration || (current as any).duration || 30;

        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase!
          .from('appointments')
          .select('id, date, duration, status')
          .eq('business_id', (current as any).business_id)
          .eq('employee_id', checkEmployee)
          .neq('id', id)
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString())
          .in('status', ['scheduled', 'confirmed', 'completed']);

        if (existing && existing.length > 0) {
          const appointmentEnd = new Date(checkDate.getTime() + checkDuration * 60000);
          const hasOverlap = (existing as any[]).some((appt: any) => {
            const s = new Date(appt.date);
            const e = new Date(s.getTime() + (appt.duration || 30) * 60000);
            return checkDate < e && appointmentEnd > s;
          });

          if (hasOverlap) {
            console.warn('[PATCH /api/appointments/:id] Overlap detected', { id, checkDate, checkEmployee });
            return res.status(409).json({
              success: false,
              error: 'This time slot overlaps with an existing appointment. Please choose another time.'
            });
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await supabase!
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[PATCH /api/appointments/:id] Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update appointment',
        code: error.code,
        details: error.details,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    console.log('[PATCH /api/appointments/:id] Updated successfully', { id });
    return res.json({ success: true, appointment: data[0] });
  } catch (error: any) {
    console.error('[PATCH /api/appointments/:id] Error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to update appointment',
      details: error?.message || 'Unknown error'
    });
  }
});

// Customers (basic list and create)
app.get('/api/customers', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, customers: [] });
    }
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('customers query error:', error.message);
      return res.json({ success: true, customers: [] });
    }
    return res.json({ success: true, customers: data || [] });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', requireDb, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      console.error('[POST /api/customers] Missing required fields:', { name: !!name, email: !!email, phone: !!phone });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          phone: !phone ? 'Phone is required' : undefined
        }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('[POST /api/customers] Invalid email format:', email);
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }



    const { data, error } = await supabase!
      .from('customers')
      .insert([{ name, email, phone }])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/customers] Supabase error:', error);
      // Handle duplicate email error gracefully
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return res.status(409).json({
          success: false,
          error: 'A customer with this email already exists'
        });
      }
      throw error;
    }


    return res.json({ success: true, customer: data });
  } catch (error: any) {
    console.error('[POST /api/customers] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create customer',
      details: error?.message || 'Unknown error'
    });
  }
});

function normalizeServicePriceInput(price: unknown): number | null | undefined {
  if (price === undefined) return undefined;
  if (price === null || price === '') return null;
  const n = typeof price === 'number' ? price : parseFloat(String(price).trim());
  return Number.isFinite(n) ? n : null;
}

// Helper: compute max workday duration in minutes from working_hours array
function computeMaxWorkdayMinutes(workingHours: any[]): number {
  if (!Array.isArray(workingHours) || workingHours.length === 0) return 480;
  let max = 0;
  for (const day of workingHours) {
    if (day.isClosed) continue;
    const [openH = 9, openM = 0] = (day.open || '09:00').split(':').map(Number);
    const [closeH = 17, closeM = 0] = (day.close || '17:00').split(':').map(Number);
    const mins = (closeH * 60 + closeM) - (openH * 60 + openM);
    if (mins > max) max = mins;
  }
  return max > 0 ? max : 480;
}

// Services CRUD
app.post('/api/services', requireDb, async (req, res) => {
  try {
    const { business_id, name: rawName, description: rawDesc, duration, price, icon } = req.body;

    const name = String(rawName ?? '').trim();
    const description = String(rawDesc ?? '').trim();

    if (!name) {
      return res.status(400).json({ success: false, error: 'Service name is required' });
    }
    if (!description) {
      return res.status(400).json({ success: false, error: 'Service description is required' });
    }
    const parsedDuration = parseInt(String(duration), 10);
    if (!parsedDuration || parsedDuration <= 0) {
      return res.status(400).json({ success: false, error: 'Duration must be greater than 0' });
    }

    // Validate duration does not exceed the longest work day
    if (business_id) {
      const { data: settings } = await supabase!
        .from('business_settings')
        .select('working_hours')
        .eq('business_id', business_id)
        .single();
      if ((settings as any)?.working_hours) {
        const maxDuration = computeMaxWorkdayMinutes((settings as any).working_hours);
        if (parsedDuration > maxDuration) {
          const h = Math.floor(maxDuration / 60);
          const m = maxDuration % 60;
          const label = m > 0 ? `${h}h ${m}m` : `${h}h`;
          return res.status(400).json({
            success: false,
            error: `Service duration cannot exceed the longest work day (${label})`
          });
        }
      }
    }

    const normalizedPrice = normalizeServicePriceInput(price);
    const priceForInsert = normalizedPrice === undefined ? null : normalizedPrice;

    console.log('[POST /api/services] Creating service', { business_id, name, duration: parsedDuration });
    const { data, error } = await supabase!
      .from('services')
      .insert([{ business_id, name, description, duration: parsedDuration, price: priceForInsert, icon }])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, service: data });
  } catch (error) {
    console.error('[POST /api/services] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create service' });
  }
});

app.patch('/api/services/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { name: rawName, description: rawDesc, duration, price, icon, business_id } = req.body || {};

    const updates: Record<string, any> = {};

    if (rawName !== undefined) {
      const name = String(rawName ?? '').trim();
      if (!name) {
        return res.status(400).json({ success: false, error: 'Service name cannot be empty' });
      }
      updates.name = name;
    }
    if (rawDesc !== undefined) {
      const description = String(rawDesc ?? '').trim();
      if (!description) {
        return res.status(400).json({ success: false, error: 'Service description cannot be empty' });
      }
      updates.description = description;
    }
    if (duration !== undefined) {
      const parsedDuration = parseInt(String(duration), 10);
      if (!parsedDuration || parsedDuration <= 0) {
        return res.status(400).json({ success: false, error: 'Duration must be greater than 0' });
      }

      if (business_id) {
        const { data: settings } = await supabase!
          .from('business_settings')
          .select('working_hours')
          .eq('business_id', business_id)
          .single();
        if ((settings as any)?.working_hours) {
          const maxDuration = computeMaxWorkdayMinutes((settings as any).working_hours);
          if (parsedDuration > maxDuration) {
            const h = Math.floor(maxDuration / 60);
            const m = maxDuration % 60;
            const label = m > 0 ? `${h}h ${m}m` : `${h}h`;
            return res.status(400).json({
              success: false,
              error: `Service duration cannot exceed the longest work day (${label})`
            });
          }
        }
      }
      updates.duration = parsedDuration;
    }
    if (price !== undefined) {
      updates.price = normalizeServicePriceInput(price);
    }
    if (icon !== undefined) updates.icon = icon;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    console.log('[PATCH /api/services/:id] Updating service', { id, updates });
    const { data: rows, error } = await supabase!
      .from('services')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) {
      const code = error.code || '';
      const msg = error.message || error.details || String(error);
      console.error('[PATCH /api/services/:id] Supabase error:', { code, msg, error });

      if (code === '23502' || /not-null|not null/i.test(msg)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot clear price: the database still requires a price. Run the migration that makes services.price nullable, or leave a numeric price.',
          details: msg,
          code
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update service',
        details: msg,
        code: code || undefined
      });
    }

    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
        details: 'No row was updated for the given id'
      });
    }

    return res.json({ success: true, service: data });
  } catch (error: any) {
    const msg =
      error?.message ||
      error?.details ||
      (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error('[PATCH /api/services/:id] Error:', msg, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update service',
      details: msg
    });
  }
});

app.delete('/api/services/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase!
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
});

// Employees CRUD
// List employees (optional; helps UI in dev)
app.get('/api/employees', async (req, res) => {
  try {
    const { businessId } = req.query as { businessId?: string };

    if (!supabase) {
      // Return in-memory list for dev
      const list = businessId
        ? devStore.employees.filter(emp => emp.business_id === businessId)
        : devStore.employees;
      return res.json({ success: true, employees: list });
    }
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (businessId) {
      query = query.eq('business_id', String(businessId));
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, employees: data || [] });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const employee = req.body;

    if (!supabase) {
      // In-memory fallback for dev
      const created = { id: generateId('emp'), created_at: new Date().toISOString(), ...employee };
      devStore.employees.unshift(created);
      return res.json({ success: true, employee: created });
    }

    const { data, error } = await supabase!
      .from('employees')
      .insert([employee])
      .select()
      .single();
    if (error) {
      console.error('[POST /api/employees] Supabase error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    return res.json({ success: true, employee: data });
  } catch (error: any) {
    console.error('[POST /api/employees] Error creating employee:', {
      message: error?.message,
      code: error?.code
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create employee',
      details: error?.message
    });
  }
});

// Update employee
app.patch('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};



    if (!supabase) {
      const index = devStore.employees.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ success: false, error: 'Employee not found' });
      devStore.employees[index] = { ...devStore.employees[index], ...updates };
      return res.json({ success: true, employee: devStore.employees[index] });
    }

    const { data, error } = await supabase!
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[employees/:id PATCH] Supabase error:', error);
      throw error;
    }


    return res.json({ success: true, employee: data });
  } catch (error: any) {
    console.error('[employees/:id PATCH] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update employee', details: error.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      const before = devStore.employees.length;
      devStore.employees = devStore.employees.filter(e => e.id !== id);
      const deleted = devStore.employees.length < before;
      return res.json({ success: true, deleted });
    }

    const { error } = await supabase!
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete employee' });
  }
});

// Reviews create
app.post('/api/reviews', requireDb, async (req, res) => {
  try {
    const review = req.body || {};
    const { data, error } = await supabase!
      .from('reviews')
      .insert({ ...review, is_approved: true, is_featured: false })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, review: data });
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ success: false, error: 'Failed to create review' });
  }
});

// Reviews (read-only for now)
app.get('/api/reviews', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ success: true, reviews: [] });
    }
    const { approved } = req.query;
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (approved !== undefined) {
      query = query.eq('is_approved', String(approved) === 'true');
    }
    const { data, error } = await query;
    if (error) {
      console.warn('reviews query error:', error.message);
      return res.json({ success: true, reviews: [] });
    }
    return res.json({ success: true, reviews: data || [] });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});


export default app;







