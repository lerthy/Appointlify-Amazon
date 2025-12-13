import 'reflect-metadata';
import express from 'express';
import twilio from 'twilio';
import cors, { CorsOptions } from 'cors';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
    console.log('[Google OAuth Router] Request received:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url
    });
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
    const serviceList = services.map((s: any) => `• ${s.name} - $${s.price} (${s.duration} min)`).join('\n');
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




    // Check provider availability: Groq first, then OpenAI, then mock
    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const useOpenAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_OPENAI !== 'false';



    // Create system prompt with booking context
    const systemPrompt = `You are an intelligent booking assistant for ${context?.businessName || 'our business'}. 
You help customers book appointments in a conversational way.

AVAILABLE SERVICES:
${context?.services?.map((s: any) => `- ${s.name}: $${s.price} (${s.duration} min)${s.description ? ' - ' + s.description : ''}`).join('\n') || 'Loading services...'}

AVAILABLE TIME SLOTS:
${context?.availableTimes?.join(', ') || 'Checking availability...'}

BOOKING INSTRUCTIONS:
1. Be friendly and conversational
2. Help customers choose the right service
3. Collect: Customer name, service selection, preferred date and time
4. Confirm all details before finalizing
5. If they have all required info, respond with: "BOOKING_READY: {name: 'Customer Name', service: 'Service Name', date: 'YYYY-MM-DD', time: 'HH:MM AM/PM'}"

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
          temperature: 0.7,
        });


        const assistantMessage = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

        if (!assistantMessage || assistantMessage.trim() === '') {
          throw new Error('Groq returned empty response');
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
          temperature: 0.7,
        });


        const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

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

    // Fall back to mock AI service

    try {
      const mockResponse = await getMockAIResponse(messages, context || {});
      return res.json({
        success: true,
        message: mockResponse,
        provider: 'mock',
        note: 'Using mock AI service. Set GROQ_API_KEY or OPENAI_API_KEY to use AI providers.'
      });
    } catch (mockError: any) {
      console.error('app.ts: Mock AI error:', mockError);
      // Last resort - return a basic response
      return res.json({
        success: true,
        message: "Hello! I'm your AI assistant for Appointly. I can help you book appointments with various businesses. How can I assist you today?",
        provider: 'emergency-fallback',
        note: 'All services unavailable, using emergency fallback.'
      });
    }
  } catch (error: any) {
    console.error('app.ts: Top-level error in chat endpoint:', {
      message: error?.message,
      stack: error?.stack
    });

    // Always return a response, never 500
    try {
      const mockResponse = await getMockAIResponse(req.body?.messages || [], req.body?.context || {});
      return res.json({
        success: true,
        message: mockResponse,
        provider: 'error-fallback',
        note: 'Error occurred, using fallback response.'
      });
    } catch (fallbackError: any) {
      console.error('app.ts: Fallback also failed:', fallbackError);
      return res.json({
        success: true,
        message: "Hello! I'm your AI assistant for Appointly. I can help you book appointments. How can I assist you today?",
        provider: 'emergency',
        note: 'Service error, using emergency response.'
      });
    }
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

  const defaultSettings = {
    business_id: businessId,
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



    // Ensure a row exists so upsert succeeds
    await ensureBusinessSettings(businessId);

    const normalizedUpdates = {
      working_hours: updates.working_hours ?? buildDefaultWorkingHours(),
      blocked_dates: Array.isArray(updates.blocked_dates) ? updates.blocked_dates : [],
      breaks: Array.isArray(updates.breaks) ? updates.breaks : [],
      appointment_duration: updates.appointment_duration ?? 30
    };

    const payload = {
      business_id: businessId,
      ...normalizedUpdates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase!
      .from('business_settings')
      .upsert(payload, { onConflict: 'business_id' })
      .select()
      .single();

    if (error) {
      console.error('[business/:id/settings PATCH] Supabase error:', error);
      throw error;
    }


    return res.json({ success: true, settings: data });
  } catch (error: any) {
    console.error('[business/:id/settings PATCH] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update business settings', details: error.message });
  }
});

// Get all businesses
app.get('/api/businesses', requireDb, async (req, res) => {
  try {

    const { data, error } = await supabase!
      .from('users')
      .select('id, name, description, logo, category, business_address, phone, owner_name, website, role');

    if (error) {
      console.error('[GET /api/businesses] Error:', error);
      throw error;
    }

    // Filter for businesses (role='business' or null, since default is business)
    const businesses = data || [];

    return res.json({ success: true, businesses });
  } catch (error: any) {
    console.error('[GET /api/businesses] Handler error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch businesses', details: error.message });
  }
});

app.get('/api/business/:businessId/info', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, error } = await supabase!
      .from('users')
      .select('id, name, description, logo')
      .eq('id', businessId)
      .single();
    if (error) throw error;
    return res.json({ success: true, info: data || null });
  } catch (error) {
    console.error('Error fetching business info:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch business info' });
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
    const { includeUnconfirmed } = req.query;



    let query = supabase!
      .from('appointments')
      .select('*')
      .eq('business_id', businessId);

    // By default, only show confirmed appointments in business dashboard
    // Unless explicitly requested to include unconfirmed
    if (includeUnconfirmed !== 'true') {
      query = query.eq('confirmation_status', 'confirmed');
    }

    query = query.order('date', { ascending: true });

    const { data, error } = await query;

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
    const startOfDay = new Date(`${date} T00:00:00`);
    const endOfDay = new Date(`${date} T23: 59: 59`);

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

    console.log('[POST /api/appointments] Checking for overlaps:', {
      business_id,
      employee_id,
      appointmentDate: appointmentDate.toISOString(),
      appointmentEnd: appointmentEnd.toISOString(),
      duration: duration || 30
    });

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

        if (overlaps) {
          console.log('[POST /api/appointments] Overlap detected:', {
            existing: {
              id: appt.id,
              start: existingStart.toISOString(),
              end: existingEnd.toISOString(),
              duration: appt.duration,
              status: appt.status
            },
            new: {
              start: appointmentDate.toISOString(),
              end: appointmentEnd.toISOString(),
              duration: duration || 30
            }
          });
        }

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
    const { status } = req.body;

    console.log('[PATCH /api/appointments/:id] Request:', {
      id,
      status,
      body: req.body,
      hasSupabase: !!supabase
    });

    if (!status) {
      console.error('[PATCH /api/appointments/:id] Missing status in request body');
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const { data, error } = await supabase!
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/appointments/:id] Supabase error:', error);
      throw error;
    }


    return res.json({ success: true, appointment: data });
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

// Services CRUD
app.post('/api/services', requireDb, async (req, res) => {
  try {
    const service = req.body;
    const { data, error } = await supabase!
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, service: data });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({ success: false, error: 'Failed to create service' });
  }
});

app.patch('/api/services/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const { data, error } = await supabase!
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, service: data });
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(500).json({ success: false, error: 'Failed to update service' });
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
    if (error) throw error;
    return res.json({ success: true, employee: data });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ success: false, error: 'Failed to create employee' });
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







