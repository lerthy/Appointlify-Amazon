import 'reflect-metadata';
import './loadEnv.js';
import express from 'express';
import { request as httpsRequest } from 'https';
import twilio from 'twilio';
import cors from 'cors';
import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';
import googleAuthRouter from './routes/googleAuthRouter.js';
import { subdomainResolver } from './middleware/subdomainResolver.js';
import { startGoogleHealthMonitor } from './services/googleHealthMonitor.js';

console.log('Supabase available at startup:', !!supabase);

// Configure CORS allowlist for production
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5000,http://localhost:3000')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return cb(null, true);
    }
    
    // In development, always allow localhost origins
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return cb(null, true);
      }
    }
    
    // Check against allowed origins
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
      return cb(null, true);
    }
    
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return cb(null, true);
    }
    
    // Log CORS rejection for debugging
    console.warn('[CORS] Rejected origin:', origin, 'Allowed origins:', allowedOrigins);
    // In development, allow anyway but log
    if (isDevelopment) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const app = express();

/** Where the React SPA is served (Vite :3000 in dev, Netlify in prod). Email links must use this, not the API port. */
function getPublicAppOrigin() {
  const raw = process.env.FRONTEND_URL;
  let base = raw ? raw.split(',')[0].trim().replace(/\/$/, '') : 'http://localhost:3000';
  try {
    const u = new URL(base);
    // Common mistake: FRONTEND_URL=http://localhost:5000 (Express API). Vite SPA is on :3000.
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === '5000') {
      u.port = '3000';
      base = u.origin;
    }
  } catch (_) {
    /* keep base */
  }
  if (!raw && process.env.NODE_ENV === 'production') {
    console.warn('[config] FRONTEND_URL is unset; email/redirect links default to http://localhost:3000 — set FRONTEND_URL in production.');
  }
  return base;
}

app.use(cors(corsOptions));
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${req.method}] ${req.path}`, {
      origin: req.headers.origin,
      host: req.headers.host,
      query: req.query
    });
  }
  next();
});

// Subdomain middleware: attaches business context if subdomain is present
app.use(subdomainResolver);
app.use('/api', googleAuthRouter);
console.log('✅ Google OAuth routes registered at /api');

// Lightweight in-memory store for dev when Supabase is not configured
const hasSupabase = !!supabase;
const devStore = {
  employees: [],
};
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Basic status routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/** Follow HTTP redirects for short Google Maps links (maps.app.goo.gl) — browsers cannot do this due to CORS. */
function isResolvableShortMapsUrl(urlString) {
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

/**
 * Reads the raw Location header from the first redirect hop using Node's https module.
 * Native fetch redirect:'manual' returns an opaque response where headers are inaccessible.
 */
function getFirstRedirectLocation(urlString) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlString);
      const req = httpsRequest(
        {
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            // SOCS cookie tells Google consent was already given — avoids consent.google.com redirect
            Cookie: 'SOCS=CAESEwgDEgk2MDQxMzMxMTQaAmVuIAEaBgiAuPqcBg==',
          },
        },
        (incoming) => {
          resolve(incoming.headers['location'] || null);
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'SOCS=CAESEwgDEgk2MDQxMzMxMTQaAmVuIAEaBgiAuPqcBg==',
      },
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
  } catch (e) {
    console.error('[api/resolve-maps-url]', e.message || e);
    return res.status(502).json({ error: 'Failed to resolve maps URL', message: String(e.message || e) });
  }
});

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
    <style>body{font-family:system-ui;padding:24px;line-height:1.5}</style>
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

// Email links may point at the API host by mistake (e.g. old FRONTEND_URL). Send users to the SPA.
app.get('/confirm-appointment', (req, res) => {
  const base = getPublicAppOrigin();
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, `${base}/confirm-appointment${q}`);
});

app.get('/cancel/:appointmentId', (req, res) => {
  const base = getPublicAppOrigin();
  res.redirect(302, `${base}/cancel/${req.params.appointmentId}`);
});

// Middleware: guard DB-backed routes if Supabase isn't configured
function requireDb(req, res, next) {
  if (!supabase) {
    console.warn('requireDb blocked request (DB not configured):', req.method, req.originalUrl);
    return res.status(503).json({
      success: false,
      error: 'Database not configured'
    });
  }
  next();
}

// Initialize Twilio client (optional)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && twilioPhoneNumber) {
  // Validate Account SID format (should start with 'AC')
  if (accountSid.startsWith('AC') && authToken.length > 10) {
    try {
      client = twilio(accountSid, authToken);
      console.log('✅ Twilio client initialized');
    } catch (error) {
      console.log('⚠️ Twilio initialization failed:', error.message);
    }
  } else {
    console.log('⚠️ Twilio credentials appear invalid (Account SID should start with "AC")');
  }
} else {
  const missing = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!twilioPhoneNumber) missing.push('TWILIO_PHONE_NUMBER');
  console.log(`⚠️ Twilio not configured - missing: ${missing.join(', ')}`);
}

// OpenAI client (lazy init)
let openaiClient = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Mock AI Service for fallback
async function getMockAIResponse(messages, context) {
  const userMessage = messages[messages.length - 1]?.content || '';
  const businessName = context?.businessName || 'our business';
  const services = context?.services || [];
  const availableTimes = context?.availableTimes || [];
  const message = userMessage.toLowerCase();
  
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(message)) {
    return `Hello! Welcome to ${businessName}. I'm here to help you book an appointment. What service would you like to schedule today?`;
  }
  
  if (/\b(services|what do you offer|menu|options)\b/.test(message)) {
    const serviceList = services.map(s => `• ${s.name}${s.price != null ? ` - $${s.price}` : ''} (${s.duration} min)`).join('\n');
    return serviceList ? `Here are our available services:\n\n${serviceList}\n\nWhich service interests you?` : 
           'We offer various services. What type of service are you looking for?';
  }
  
  return "I'm here to help you book an appointment. Tell me what service you need, when you'd like to come in, and your name!";
}

// OpenAI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    const useOpenAI = process.env.OPENAI_API_KEY && process.env.USE_OPENAI !== 'false';
    
    if (!useOpenAI) {
      const mockResponse = await getMockAIResponse(messages, context);
      return res.json({ 
        success: true, 
        message: mockResponse,
        provider: 'mock'
      });
    }

    const systemPrompt = `You are an intelligent booking assistant for ${context?.businessName || 'our business'}.`;
    const chatMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    const openai = getOpenAI();
    
    if (!openai) {
      const mockResponse = await getMockAIResponse(messages, context);
      return res.json({ success: true, message: mockResponse, provider: 'mock' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ success: true, message: assistantMessage, provider: 'openai', usage: completion.usage });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    try {
      const mockResponse = await getMockAIResponse(req.body.messages, req.body.context);
      res.json({ success: true, message: mockResponse, provider: 'mock-fallback' });
    } catch (fallbackError) {
      res.status(500).json({ success: false, error: 'Services unavailable' });
    }
  }
});

app.post('/api/book-appointment', async (req, res) => {
  try {
    const { name, service, date, time, email, phone } = req.body;
    const bookingId = `apt_${Date.now()}`;
    // Use business context from subdomain
    const business = req.business;
    if (!business) {
      return res.status(404).json({ success: false, error: 'Business not found for this subdomain.' });
    }
    // You can add business-specific logic here, e.g. check service availability, save appointment to business, etc.
    res.json({
      success: true,
      bookingId,
      business: {
        id: business.id,
        name: business.name,
        subdomain: business.subdomain,
        email: business.email,
      },
      message: `Appointment booked successfully for ${business.name}!`,
      details: { name, service, date, time, email, phone }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to book appointment' });
  }
});

app.post('/api/send-sms', async (req, res) => {
  try {
    if (!client) {
      return res.status(503).json({ 
        success: false, 
        error: 'SMS service not configured',
        details: 'Twilio credentials are missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
      });
    }
    
    // Validate credentials are present
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return res.status(503).json({ 
        success: false, 
        error: 'SMS service not fully configured',
        details: {
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasPhoneNumber: !!twilioPhoneNumber
        }
      });
    }
    
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to and message' 
      });
    }
    
    let formattedPhone = to.replace(/\D/g, '');
    formattedPhone = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone
    });
    
    res.json({ success: true, messageId: result.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Handle Twilio authentication errors specifically
    if (error.code === 20003) {
      return res.status(401).json({ 
        success: false, 
        error: 'Twilio authentication failed',
        details: 'Invalid Twilio credentials. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
        code: error.code,
        moreInfo: error.moreInfo
      });
    }
    
    // Handle other Twilio errors
    if (error.status && error.code) {
      return res.status(error.status).json({ 
        success: false, 
        error: error.message || 'SMS sending failed',
        code: error.code,
        moreInfo: error.moreInfo
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send SMS' 
    });
  }
});

/** White Appointly logo for dark email header (Supabase public storage). */
const APPOINTLY_CONFIRMATION_EMAIL_LOGO =
  'https://dvbgblopuepbisvdgyci.supabase.co/storage/v1/object/public/logos/appointly-logo.png';

/**
 * Send appointment confirmation email (fire-and-forget). Never throws.
 * Logs success/failure with appointmentId. Used after successful appointment insert.
 */
async function sendAppointmentConfirmationEmail(params) {
  const {
    appointmentId,
    to_name,
    to_email,
    appointment_date,
    appointment_time,
    business_name,
    service_name,
    cancel_link,
    confirmation_link,
  } = params;
  try {
    const subject = `Appointment Confirmation - ${business_name}`;
    const logoBlock = `<div style="text-align: center; padding: 24px 20px 16px;"><img src="${APPOINTLY_CONFIRMATION_EMAIL_LOGO}" alt="Appointly" style="max-width: 180px; max-height: 80px; object-fit: contain;" /></div>`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Appointment Confirmation</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e3a5f; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          ${logoBlock}
          <h1 style="margin: 0; font-size: 1.25rem;">Appointment Confirmation – ${business_name}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Hi ${to_name},</p>
          <p>Your appointment has been successfully booked.</p>
          <div style="background: white; padding: 16px; margin: 16px 0; border-left: 4px solid #1e3a5f; border-radius: 4px;">
            <p style="margin: 6px 0;"><strong>Business:</strong> ${business_name}</p>
            ${service_name ? `<p style="margin: 6px 0;"><strong>Service:</strong> ${service_name}</p>` : ''}
            <p style="margin: 6px 0;"><strong>Date:</strong> ${appointment_date}</p>
            <p style="margin: 6px 0;"><strong>Time:</strong> ${appointment_time}</p>
          </div>
          ${confirmation_link ? `
          <p style="text-align: center; margin: 20px 0;"><strong>Please confirm your appointment to secure your booking:</strong></p>
          <p style="text-align: center;"><a href="${confirmation_link}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Appointment</a></p>
          <p style="color: #666; font-size: 14px; text-align: center;">This link expires in 48 hours.</p>
          ` : ''}
          ${cancel_link ? `
          <p style="margin-top: 24px; color: #666;">To cancel or manage your appointment:</p>
          <p style="text-align: center;"><a href="${cancel_link}" style="display: inline-block; background: #4b5563; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">Manage Appointment</a></p>
          ` : ''}
          <p style="margin-top: 24px;">We look forward to seeing you!</p>
          <p>Best regards,<br><strong>${business_name}</strong></p>
        </div>
        <p style="text-align: center; padding: 16px; color: #999; font-size: 12px;">Sent via Appointly booking system.</p>
      </div>
    </body>
    </html>`;
    const text = `Appointment Confirmation - ${business_name}\n\nHi ${to_name},\n\nYour appointment has been booked.\n\nBusiness: ${business_name}\n${service_name ? `Service: ${service_name}\n` : ''}Date: ${appointment_date}\nTime: ${appointment_time}\n\n${confirmation_link ? `Confirm: ${confirmation_link}\n\n` : ''}${cancel_link ? `Manage/Cancel: ${cancel_link}\n` : ''}\nBest regards,\n${business_name}`;

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
      console.log('[appointments] Email skipped (no Gmail config), appointmentId:', appointmentId);
      return;
    }
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword }
    });
    const result = await transporter.sendMail({
      from: `"${business_name}" <${gmailUser}>`,
      to: to_email,
      subject,
      html,
      text
    });
    console.log('[appointments] Email sent successfully', { appointmentId, messageId: result.messageId });
  } catch (err) {
    console.error('[appointments] Email failed', { appointmentId, error: err?.message || String(err) });
  }
}

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, and html or text' 
      });
    }
    
    // Try to send real email if Gmail credentials are configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (gmailUser && gmailAppPassword) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailAppPassword
          }
        });
        
        const mailOptions = {
          from: `"Appointly" <${gmailUser}>`,
          to: to,
          subject: subject,
          html: html,
          text: text || html?.replace(/<[^>]*>/g, '') || ''
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return res.json({ 
          success: true, 
          messageId: result.messageId, 
          message: 'Email sent successfully' 
        });
      } catch (emailError) {
        console.error('❌ Failed to send email via Gmail:', emailError.message);
        // Fall through to simulation mode
      }
    }
    
    // Fallback: Log email details (for localhost development without email config)
    console.log('📧 Email would be sent (simulated):', {
      to,
      subject,
      hasHtml: !!html,
      hasText: !!text,
      note: gmailUser && gmailAppPassword 
        ? 'Gmail credentials configured but sending failed' 
        : 'Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables to send real emails'
    });
    
    const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return res.json({ 
      success: true, 
      messageId: emailId, 
      message: 'Email sent (simulated - configure Gmail credentials for real emails)' 
    });
  } catch (error) {
    console.error('Error in /api/send-email:', error);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// Business data endpoints
app.get('/api/business/:businessId/services', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) throw error;
    return res.json({ success: true, services: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

app.get('/api/business/:businessId/employees', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) throw error;
    return res.json({ success: true, employees: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

app.get('/api/business/:businessId/settings', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    console.log('[settings GET] Fetching settings for business:', businessId);
    
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[settings GET] Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If it's a PGRST116 (no rows), return empty settings
      if (error.code === 'PGRST116') {
        return res.json({ success: true, settings: null });
      }
      
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch settings' });
    }

    const settingsRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
    console.log('[settings GET] Found settings:', settingsRow ? 'yes' : 'no');
    return res.json({ success: true, settings: settingsRow });
  } catch (error) {
    console.error('[settings GET] Unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.patch('/api/business/:businessId/settings', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body || {};
    
    const normalized = {
      working_hours: Array.isArray(updates.working_hours) ? updates.working_hours : [],
      blocked_dates: Array.isArray(updates.blocked_dates) ? updates.blocked_dates : [],
      breaks: Array.isArray(updates.breaks) ? updates.breaks : [],
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.appointment_duration === 'number' && updates.appointment_duration > 0) {
      normalized.appointment_duration = updates.appointment_duration;
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });

    if (existingError) {
      console.error('[settings PATCH] error checking existing:', existingError);
      return res.status(500).json({ success: false, error: existingError.message });
    }

    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
    let dbResult = null;

    if (existing) {
      let name = existing.name;
      if (name == null || name === '') {
        const { data: userRow } = await supabase.from('users').select('name').eq('id', businessId).maybeSingle();
        name = (userRow?.name != null && userRow.name !== '') ? String(userRow.name) : 'Business';
      }
      const updatePayload = { ...normalized, name: String(name) };
      const { data, error } = await supabase
        .from('business_settings')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[settings PATCH] update error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
      dbResult = data;
    } else {
      let businessName = 'Business';
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('name')
          .eq('id', businessId)
          .maybeSingle();
        if (userRow?.name != null && userRow.name !== '') businessName = String(userRow.name);
      } catch {}

      const insertPayload = {
        business_id: businessId,
        name: String(businessName || 'Business'),
        working_hours: normalized.working_hours,
        blocked_dates: normalized.blocked_dates,
        breaks: normalized.breaks,
        appointment_duration: normalized.appointment_duration ?? 30,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('business_settings')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error('[settings PATCH] insert error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
      dbResult = data;
    }
    
    return res.json({ success: true, settings: dbResult });
  } catch (error) {
    console.error('[settings PATCH] handler error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/businesses', requireDb, async (req, res) => {
  try {
    console.log('[GET /api/businesses] Fetching completed businesses with single query...');
    
    // Use a single query with Postgres to find businesses that have employees, services, and settings
    // We'll use Supabase's RPC capability or fetch distinct business_ids and find intersection
    
    // Get distinct business_ids from each table
    const [employeesResult, servicesResult, settingsResult] = await Promise.all([
      supabase.from('employees').select('business_id').not('business_id', 'is', null),
      supabase.from('services').select('business_id').not('business_id', 'is', null),
      supabase.from('business_settings').select('business_id').not('business_id', 'is', null)
    ]);
    
    if (employeesResult.error) throw employeesResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (settingsResult.error) throw settingsResult.error;
    
    // Extract unique business_ids from each result
    const businessIdsWithEmployees = new Set((employeesResult.data || []).map(e => e.business_id));
    const businessIdsWithServices = new Set((servicesResult.data || []).map(s => s.business_id));
    const businessIdsWithSettings = new Set((settingsResult.data || []).map(bs => bs.business_id));
    
    // Find intersection: businesses that have all three
    const validBusinessIds = Array.from(businessIdsWithEmployees).filter(id => 
      businessIdsWithServices.has(id) && businessIdsWithSettings.has(id)
    );
    
    if (validBusinessIds.length === 0) {
      console.log('[GET /api/businesses] No businesses found with employees, services, and settings');
      return res.json({ success: true, businesses: [] });
    }
    
    // Fetch business details for valid business IDs in a single query
    const { data: businesses, error: businessesError } = await supabase
      .from('users')
      .select('id, name, description, logo, category, business_address, phone, owner_name, website, role')
      .in('id', validBusinessIds);
    
    if (businessesError) throw businessesError;
    
    console.log(`[GET /api/businesses] Found ${businesses?.length || 0} completed businesses (out of ${validBusinessIds.length} valid IDs)`);
    return res.json({ success: true, businesses: businesses || [] });
  } catch (error) {
    console.error('[GET /api/businesses] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
  }
});

// Resolve subdomain → business ID (only if business is fully set up: has employees, services, settings)
app.get('/api/resolve-subdomain/:subdomain', requireDb, async (req, res) => {
  try {
    const { subdomain } = req.params;
    if (!subdomain || subdomain.length < 3) {
      return res.status(400).json({ success: false, error: 'Invalid subdomain' });
    }

    // Find user with this subdomain
    const { data: business, error: bizError } = await supabase
      .from('users')
      .select('id, name, description, logo, subdomain, business_address')
      .eq('subdomain', subdomain.toLowerCase())
      .single();

    if (bizError || !business) {
      return res.status(404).json({ success: false, error: 'Business not found' });
    }

    // Verify business meets homepage requirements (has employees, services, settings)
    const [empResult, svcResult, setResult] = await Promise.all([
      supabase.from('employees').select('id').eq('business_id', business.id).limit(1),
      supabase.from('services').select('id').eq('business_id', business.id).limit(1),
      supabase.from('business_settings').select('id').eq('business_id', business.id).limit(1),
    ]);

    const hasEmployees = (empResult.data?.length || 0) > 0;
    const hasServices = (svcResult.data?.length || 0) > 0;
    const hasSettings = (setResult.data?.length || 0) > 0;
    const isEligible = hasEmployees && hasServices && hasSettings;

    return res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        subdomain: business.subdomain,
        isEligible,
        setupDetails: { hasEmployees, hasServices, hasSettings }
      },
    });
  } catch (error) {
    console.error('[GET /api/resolve-subdomain] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resolve subdomain' });
  }
});

app.get('/api/business/:businessId/info', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('id, name, description, logo')
      .eq('id', businessId)
      .single();
    if (error) throw error;
    return res.json({ success: true, info: data || null });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch business info' });
  }
});

// Optimized endpoint: fetch all business data in parallel (single request, parallel DB queries)
app.get('/api/business/:businessId/data', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    console.log('[GET /api/business/:businessId/data] Fetching all data for business:', businessId);
    
    // Fetch all data in parallel
    const [
      businessInfoResult,
      settingsResult,
      employeesResult,
      servicesResult,
      appointmentsResult,
      customersResult,
      reviewsResult
    ] = await Promise.all([
      // Business info
      supabase
        .from('users')
        .select('id, name, description, logo, business_address')
        .eq('id', businessId)
        .single(),
      
      // Settings
      supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Employees
      supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('name'),
      
      // Services
      supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('name'),
      
      // Appointments
      supabase
        .from('appointments')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: true }),
      
      // Customers (scoped to business via appointments)
      supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false }),
      
      // Reviews (approved only)
      supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
    ]);
    
    // Handle business info
    if (businessInfoResult.error && businessInfoResult.error.code !== 'PGRST116') {
      throw businessInfoResult.error;
    }
    const businessInfo = businessInfoResult.data || null;
    
    // Handle settings (null if not found)
    const settings = settingsResult.error && settingsResult.error.code === 'PGRST116' 
      ? null 
      : (Array.isArray(settingsResult.data) && settingsResult.data.length > 0 ? settingsResult.data[0] : null);
    
    // Handle employees
    if (employeesResult.error) throw employeesResult.error;
    const employees = employeesResult.data || [];
    
    // Handle services
    if (servicesResult.error) throw servicesResult.error;
    const services = servicesResult.data || [];
    
    // Handle appointments
    if (appointmentsResult.error) throw appointmentsResult.error;
    const appointments = appointmentsResult.data || [];
    
    // Handle customers (log error but don't fail)
    const customers = customersResult.error ? [] : (customersResult.data || []);
    if (customersResult.error) {
      console.warn('[GET /api/business/:businessId/data] Customers query error:', customersResult.error.message);
    }
    
    // Handle reviews (log error but don't fail)
    const reviews = reviewsResult.error ? [] : (reviewsResult.data || []);
    if (reviewsResult.error) {
      console.warn('[GET /api/business/:businessId/data] Reviews query error:', reviewsResult.error.message);
    }
    
    console.log(`[GET /api/business/:businessId/data] Success: info=${!!businessInfo}, settings=${!!settings}, employees=${employees.length}, services=${services.length}, appointments=${appointments.length}, customers=${customers.length}, reviews=${reviews.length}`);
    
    return res.json({
      success: true,
      data: {
        info: businessInfo,
        settings,
        employees,
        services,
        appointments,
        customers,
        reviews
      }
    });
  } catch (error) {
    console.error('[GET /api/business/:businessId/data] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch business data' });
  }
});

app.get('/api/users/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: 'email required' });
    if (!supabase) return res.json({ success: true, user: null });
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', String(email))
      .single();
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.json({ success: true, user: null });
      }
      return res.json({ success: true, user: null });
    }
    return res.json({ success: true, user: data || null });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// Update user profile
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[PATCH /api/users/:id] ▶ Received update request:', {
      userId: id,
      fieldsReceived: Object.keys(updates || {}),
      subdomainValue: updates?.subdomain,
      bodyType: typeof updates,
    });

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
    const updateData = {};
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
      console.log('[PATCH /api/users/:id] 🔗 Subdomain processing:', { raw, type: typeof raw });
      const subdomain = raw === null || raw === '' ? '' : String(raw).toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9-]/g, '');
      console.log('[PATCH /api/users/:id] 🔗 Subdomain sanitized:', { sanitized: subdomain });
      if (subdomain && subdomain.length < 3) {
        console.log('[PATCH /api/users/:id] ❌ Subdomain too short:', subdomain.length);
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
          console.log('[PATCH /api/users/:id] ❌ Subdomain taken by:', existing.id);
          return res.status(400).json({
            success: false,
            error: 'This subdomain is already taken',
          });
        }
      }
      updateData.subdomain = subdomain || null;
      console.log('[PATCH /api/users/:id] ✅ Subdomain set in updateData:', updateData.subdomain);
    } else {
      console.log('[PATCH /api/users/:id] ⚠️ No subdomain field in request body');
    }

    console.log('[PATCH /api/users/:id] 📦 Final updateData keys:', Object.keys(updateData));
    console.log('[PATCH /api/users/:id] 📦 Final updateData:', JSON.stringify(updateData, null, 2));

    // Update the user
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[PATCH /api/users/:id] ❌ Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to update profile',
        details: error 
      });
    }

    if (!data) {
      console.error('[PATCH /api/users/:id] ❌ No data returned from Supabase');
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log('[PATCH /api/users/:id] ✅ Update successful. Returned subdomain:', data.subdomain);
    return res.json({ 
      success: true, 
      user: data 
    });
  } catch (error) {
    console.error('[PATCH /api/users/:id] 💥 Exception:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to update profile' 
    });
  }
});

app.get('/api/business/:businessId/appointments', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, appointments: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

app.get('/api/business/:businessId/appointmentsByDay', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, employeeId } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date required' });
    
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    
    let query = supabase
      .from('appointments')
      .select('date, duration, employee_id, status')
      .eq('business_id', businessId)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString());
    
    if (employeeId) query = query.eq('employee_id', String(employeeId));
    
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ success: true, appointments: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

app.post('/api/appointments', requireDb, async (req, res) => {
  try {
    const { business_id, service_id, employee_id, name, phone, email, notes, date, duration, confirmation_token, confirmation_token_expires } = req.body;
    const appointmentDate = new Date(date);

    // Check for overlapping active appointments for the same employee
    const activeStatuses = ['scheduled', 'confirmed', 'completed'];
    const appointmentEnd = new Date(appointmentDate.getTime() + (duration || 30) * 60000);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existing } = await supabase
      .from('appointments')
      .select('id, date, duration, status')
      .eq('business_id', business_id)
      .eq('employee_id', employee_id)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString())
      .in('status', activeStatuses);

    if (existing && existing.length > 0) {
      const hasOverlap = existing.some(appt => {
        const s = new Date(appt.date);
        const e = new Date(s.getTime() + (appt.duration || 30) * 60000);
        return appointmentDate < e && appointmentEnd > s;
      });
      if (hasOverlap) {
        return res.status(409).json({ success: false, error: 'This time slot overlaps with an existing appointment. Please choose another time.' });
      }
    }

    let customerId = '';
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingCustomer?.id) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert([{ name, email, phone }])
        .select('id')
        .single();
      if (custErr) throw custErr;
      customerId = newCustomer.id;
    }

    let finalDuration = duration;
    if (!finalDuration) {
      const { data: svc } = await supabase
        .from('services')
        .select('duration')
        .eq('id', service_id)
        .single();
      finalDuration = svc?.duration || 30;
    }

    const appointmentData = { 
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
      reminder_sent: false
    };

    // Add confirmation token if provided
    if (confirmation_token) {
      appointmentData.confirmation_token = confirmation_token;
    }
    if (confirmation_token_expires) {
      appointmentData.confirmation_token_expires = confirmation_token_expires;
    }
    if (confirmation_token) {
      appointmentData.confirmation_status = 'pending';
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select('id, confirmation_token')
      .single();
    
    if (insertErr) throw insertErr;

    console.log('[appointments] Created appointment', { appointmentId: inserted.id, business_id, email });

    const baseUrl = getPublicAppOrigin();
    const cancelLink = `${baseUrl}/cancel/${inserted.id}`;
    const confirmationLink = inserted.confirmation_token
      ? `${baseUrl}/confirm-appointment?token=${inserted.confirmation_token}`
      : null;
    const appointmentDateStr = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTimeStr = appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    Promise.all([
      supabase.from('users').select('name, logo').eq('id', business_id).single(),
      supabase.from('services').select('name').eq('id', service_id).single()
    ])
      .then(([businessRes, serviceRes]) => {
        const business_name = businessRes.data?.name || 'Business';
        const business_logo_url = businessRes.data?.logo || null;
        const service_name = serviceRes.data?.name || 'Service';
        return sendAppointmentConfirmationEmail({
          appointmentId: inserted.id,
          to_name: name,
          to_email: email,
          appointment_date: appointmentDateStr,
          appointment_time: appointmentTimeStr,
          business_name,
          service_name,
          cancel_link: cancelLink,
          confirmation_link: confirmationLink,
          business_logo_url
        });
      })
      .catch((err) => {
        console.error('[appointments] Email send failed', { appointmentId: inserted.id, error: err?.message || String(err) });
      });

    return res.json({ success: true, appointmentId: inserted.id });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

app.patch('/api/appointments/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, date, employee_id, service_id, name, email, phone, notes, duration } = req.body;

    console.log('[PATCH /api/appointments/:id] Updating appointment', { id, fields: Object.keys(req.body) });

    // Do not set updated_at here — many appointments schemas only have created_at; writing unknown columns causes 500s.
    const updates = {};
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
      const { data: current } = await supabase
        .from('appointments')
        .select('date, duration, employee_id, business_id')
        .eq('id', id)
        .maybeSingle();

      if (current) {
        const checkDate = updates.date ? new Date(updates.date) : new Date(current.date);
        const checkEmployee = updates.employee_id || current.employee_id;
        const checkDuration = updates.duration || current.duration || 30;

        const startOfDay = new Date(checkDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(checkDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from('appointments')
          .select('id, date, duration, status')
          .eq('business_id', current.business_id)
          .eq('employee_id', checkEmployee)
          .neq('id', id)
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString())
          .in('status', ['scheduled', 'confirmed', 'completed']);

        if (existing && existing.length > 0) {
          const appointmentEnd = new Date(checkDate.getTime() + checkDuration * 60000);
          const hasOverlap = existing.some(appt => {
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

    const { data, error } = await supabase
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
  } catch (error) {
    console.error('[PATCH /api/appointments/:id] Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to update appointment',
      details: String(error),
    });
  }
});

// Confirm appointment endpoint (GET - confirm, POST - get details)
app.get('/api/confirm-appointment', requireDb, async (req, res) => {
  try {
    const { token } = req.query;
    console.log('[confirm-appointment GET] Received request with token:', token ? `${token.substring(0, 10)}...` : 'none');

    if (!token) {
      console.log('[confirm-appointment GET] No token provided');
      return res.status(400).json({
        success: false,
        error: 'Confirmation token is required'
      });
    }

    // Find appointment with this token
    console.log('[confirm-appointment GET] Querying database for appointment with token...');
    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select('id, confirmation_status, confirmation_token_expires, customer_id, service_id, business_id, date, name, email')
      .eq('confirmation_token', token)
      .single();
    
    console.log('[confirm-appointment GET] Query result:', { 
      found: !!appointment, 
      error: findError?.message,
      appointmentId: appointment?.id 
    });

    if (findError || !appointment) {
      console.log('[confirm-appointment GET] Appointment not found or error:', findError?.message || 'No appointment found');
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired confirmation token'
      });
    }

    // Check if already confirmed
    if (appointment.confirmation_status === 'confirmed') {
      return res.json({
        success: true,
        message: 'Appointment already confirmed',
        alreadyConfirmed: true,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          name: appointment.name
        }
      });
    }

    // Check if token is expired
    if (new Date(appointment.confirmation_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation token has expired. Please contact the business to reschedule.',
        expired: true
      });
    }

    // Customer confirmed via email: mark confirmation_status only. Keep status 'scheduled' until the business confirms in the dashboard.
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        confirmation_status: 'confirmed',
        confirmation_token: null,
        confirmation_token_expires: null
      })
      .eq('id', appointment.id);

    if (updateError) {
      console.error('Error updating appointment confirmation:', updateError);
      throw updateError;
    }

    // Sync to Google Calendar now that appointment is confirmed
    try {
      // Get full appointment details for calendar sync
      const { data: fullAppointment } = await supabase
        .from('appointments')
        .select('id, name, email, phone, date, duration, notes, service_id, employee_id, business_id')
        .eq('id', appointment.id)
        .single();

      if (fullAppointment) {
        console.log('[confirm-appointment] Attempting to sync appointment to Google Calendar:', {
          appointmentId: fullAppointment.id,
          businessId: fullAppointment.business_id
        });
        
        const { createCalendarEvent } = await import('./services/googleCalendarSync.js');
        const calendarResult = await createCalendarEvent(fullAppointment.business_id, {
          id: fullAppointment.id,
          name: fullAppointment.name,
          email: fullAppointment.email,
          phone: fullAppointment.phone,
          date: fullAppointment.date,
          duration: fullAppointment.duration,
          notes: fullAppointment.notes || null,
          service_id: fullAppointment.service_id,
          employee_id: fullAppointment.employee_id,
        });
        
        if (calendarResult.success) {
          console.log('[confirm-appointment] ✅ Calendar event created successfully:', {
            appointmentId: appointment.id,
            eventId: calendarResult.eventId
          });
        } else {
          console.warn('[confirm-appointment] ⚠️ Calendar sync failed (non-critical):', {
            appointmentId: appointment.id,
            error: calendarResult.error
          });
        }
      }
    } catch (calendarErr) {
      // Log but don't fail the confirmation if calendar sync fails
      console.error('[confirm-appointment] ❌ Calendar sync error (non-critical):', {
        appointmentId: appointment.id,
        error: calendarErr.message,
        stack: calendarErr.stack
      });
    }

    // Get service and business details for confirmation message
    const { data: service } = await supabase
      .from('services')
      .select('name, price, duration')
      .eq('id', appointment.service_id)
      .single();

    const { data: business } = await supabase
      .from('users')
      .select('name, phone, email, business_address')
      .eq('id', appointment.business_id)
      .single();

    return res.json({
      success: true,
      message: 'Appointment confirmed successfully!',
      appointment: {
        id: appointment.id,
        date: appointment.date,
        customerName: appointment.name,
        serviceName: service?.name || 'Service',
        businessName: business?.name || 'Business',
        businessPhone: business?.phone,
        businessEmail: business?.email,
        businessAddress: business?.business_address
      }
    });
  } catch (error) {
    console.error('Error in confirm-appointment GET:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get appointment details by token (POST)
app.post('/api/confirm-appointment', requireDb, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation token is required'
      });
    }

    // Find appointment with this token
    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select(`
        id,
        confirmation_status,
        confirmation_token_expires,
        date,
        name,
        email,
        phone,
        notes,
        duration,
        service_id,
        business_id,
        employee_id
      `)
      .eq('confirmation_token', token)
      .single();

    if (findError || !appointment) {
      return res.status(404).json({
        success: false,
        error: 'Invalid confirmation token'
      });
    }

    // Check if token is expired
    const isExpired = new Date(appointment.confirmation_token_expires) < new Date();

    // Get related data
    const { data: service } = await supabase
      .from('services')
      .select('name, price, duration, description')
      .eq('id', appointment.service_id)
      .single();

    const { data: business } = await supabase
      .from('users')
      .select('name, phone, email, business_address, logo')
      .eq('id', appointment.business_id)
      .single();

    const { data: employee } = await supabase
      .from('employees')
      .select('name, role')
      .eq('id', appointment.employee_id)
      .single();

    return res.json({
      success: true,
      appointment: {
        id: appointment.id,
        confirmationStatus: appointment.confirmation_status,
        isExpired,
        date: appointment.date,
        customerName: appointment.name,
        customerEmail: appointment.email,
        customerPhone: appointment.phone,
        notes: appointment.notes,
        duration: appointment.duration,
        service: service || null,
        business: business || null,
        employee: employee || null
      }
    });
  } catch (error) {
    console.error('Error in confirm-appointment POST:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, customers: [] });
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
    return res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', requireDb, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, email, phone }])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, customer: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// Normalize optional service price for DB (nullable numeric)
function normalizeServicePriceInput(price) {
  if (price === undefined) return undefined;
  if (price === null || price === '') return null;
  const n = typeof price === 'number' ? price : parseFloat(String(price).trim());
  return Number.isFinite(n) ? n : null;
}

// Helper: compute max workday duration in minutes from working_hours array
function computeMaxWorkdayMinutes(workingHours) {
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
    const parsedDuration = parseInt(duration, 10);
    if (!parsedDuration || parsedDuration <= 0) {
      return res.status(400).json({ success: false, error: 'Duration must be greater than 0' });
    }

    // Validate duration does not exceed the longest work day
    if (business_id) {
      const { data: settings } = await supabase
        .from('business_settings')
        .select('working_hours')
        .eq('business_id', business_id)
        .single();
      if (settings?.working_hours) {
        const maxDuration = computeMaxWorkdayMinutes(settings.working_hours);
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
    const { data, error } = await supabase
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

    const updates = {};

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
      const parsedDuration = parseInt(duration, 10);
      if (!parsedDuration || parsedDuration <= 0) {
        return res.status(400).json({ success: false, error: 'Duration must be greater than 0' });
      }

      // Validate against business working hours if business_id provided
      if (business_id) {
        const { data: settings } = await supabase
          .from('business_settings')
          .select('working_hours')
          .eq('business_id', business_id)
          .single();
        if (settings?.working_hours) {
          const maxDuration = computeMaxWorkdayMinutes(settings.working_hours);
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
    const { data: rows, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) {
      const code = error.code || '';
      const msg = error.message || error.details || String(error);
      console.error('[PATCH /api/services/:id] Supabase error:', { code, msg, error });

      // Nullable price requires migration: make_service_price_nullable.sql
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
  } catch (error) {
    const msg = error?.message || error?.details || (typeof error === 'object' ? JSON.stringify(error) : String(error));
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
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, employees: devStore.employees });
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, employees: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const employee = req.body;

    if (!supabase) {
      const created = { id: generateId('emp'), created_at: new Date().toISOString(), ...employee };
      devStore.employees.unshift(created);
      return res.json({ success: true, employee: created });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, employee: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
});

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

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return res.json({ success: true, employee: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      const before = devStore.employees.length;
      devStore.employees = devStore.employees.filter(e => e.id !== id);
      const deleted = devStore.employees.length < before;
      return res.json({ success: true, deleted });
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete employee' });
  }
});

app.post('/api/reviews', requireDb, async (req, res) => {
  try {
    const review = req.body || {};
    const { data, error } = await supabase
      .from('reviews')
      .insert({ ...review, is_approved: true, is_featured: false })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, review: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create review' });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, reviews: [] });
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
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// Catch-all for unhandled API routes (must be before error handler)
// Note: Express will handle 404s naturally, but we can add logging here if needed

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled Express error:', error);
  const isDev = process.env.NODE_ENV !== 'production';
  // Handle CORS errors specifically
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: error.message
    });
  }
  res.status(error.status || 500).json({
    success: false,
    error: isDev ? error.message : 'Internal server error',
    ...(isDev && { stack: error.stack }),
  });
});

const PORT = process.env.PORT || 5000;
const isServerlessEnv = Boolean(
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.SERVERLESS
);

if (!isServerlessEnv) {
  startGoogleHealthMonitor();
}

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  if (!isServerlessEnv) process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  if (!isServerlessEnv) process.exit(1);
});

if (!isServerlessEnv) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} already in use`);
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });
}

export default app;
