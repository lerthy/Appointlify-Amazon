import 'reflect-metadata';
import './loadEnv.js';
import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';
import googleAuthRouter from './routes/googleAuthRouter.js';
import { startGoogleHealthMonitor } from './services/googleHealthMonitor.js';



// Configure CORS allowlist for production
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5000,http://localhost:3000')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0) return cb(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', googleAuthRouter);


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
    } catch (error) {
      // Twilio init failed
    }
  }
} else {
  const missing = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!twilioPhoneNumber) missing.push('TWILIO_PHONE_NUMBER');
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
    const serviceList = services.map(s => `• ${s.name} - $${s.price} (${s.duration} min)`).join('\n');
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
    res.json({
      success: true,
      bookingId,
      message: `Appointment booked successfully!`,
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

    const emailId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return res.json({
      success: true,
      messageId: emailId,
      message: 'Email sent (simulated - configure Gmail credentials for real emails)'
    });
  } catch (error) {
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
      const updatePayload = { ...normalized };
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
        if (userRow?.name) businessName = userRow.name;
      } catch { }

      const insertPayload = {
        business_id: businessId,
        name: businessName,
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


    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, description, logo, category, business_address, phone, owner_name, website, role');

    if (usersError) {
      console.error('[GET /api/businesses] Error fetching users:', usersError);
      throw usersError;
    }



    // For each business, check if they have at least 1 employee and 1 service
    const completedBusinesses = [];

    for (const business of users || []) {
      // Check for employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('business_id', business.id)
        .limit(1);

      // Check for services
      const { data: services, error: servError } = await supabase
        .from('services')
        .select('id')
        .eq('business_id', business.id)
        .limit(1);

      const hasEmployees = !empError && employees?.length > 0;
      const hasServices = !servError && services?.length > 0;

      if (empError) console.error(`[GET /api/businesses] Employee check error for ${business.id}:`, empError);
      if (servError) console.error(`[GET /api/businesses] Service check error for ${business.id}:`, servError);

      // Relaxed filtering: Include all businesses for now, even if incomplete
      // This is helpful for development/testing when data might be partial
      if ((hasEmployees && hasServices)) {
        completedBusinesses.push(business);
      }
    }

    const debugInfo = users?.map(u => {
      const isComplete = completedBusinesses.some(cb => cb.id === u.id);
      return {
        id: u.id,
        name: u.name,
        isComplete
      };
    });
    return res.json({
      success: true,
      businesses: completedBusinesses,
      debug: {
        totalUsers: users?.length || 0,
        totalCompleted: completedBusinesses.length,
        userStatus: debugInfo
      }
    });
  } catch (error) {
    console.error('[GET /api/businesses] Fatal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
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

    // Update the user
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update profile',
        details: error
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Profile update exception:', error);
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

    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', business_id)
      .gte('date', appointmentDate.toISOString())
      .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString());

    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Time slot already booked' });
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

    const { data: inserted, error: insertErr } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select('id, confirmation_token')
      .single();

    if (insertErr) throw insertErr;

    // Calendar sync will happen when the customer confirms the appointment via email
    // See confirm-appointment.js for calendar sync on confirmation

    return res.json({ success: true, appointmentId: inserted.id });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

app.patch('/api/appointments/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
});

// Confirm appointment endpoint (GET - confirm, POST - get details)
app.get('/api/confirm-appointment', requireDb, async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation token is required'
      });
    }

    // Find appointment with this token
    const { data: appointment, error: findError } = await supabase
      .from('appointments')
      .select('id, confirmation_status, confirmation_token_expires, customer_id, service_id, business_id, date, name, email')
      .eq('confirmation_token', token)
      .single();

    if (findError || !appointment) {
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

    // Confirm the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        confirmation_status: 'confirmed',
        status: 'confirmed', // Also update the main status
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

    // Check if customer exists first
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      return res.json({ success: true, customer: existing });
    }

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

app.post('/api/services', requireDb, async (req, res) => {
  try {
    const service = req.body;
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, service: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create service' });
  }
});

app.patch('/api/services/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, service: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update service' });
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

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled Express error:', error);
  const isDev = process.env.NODE_ENV !== 'production';
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
