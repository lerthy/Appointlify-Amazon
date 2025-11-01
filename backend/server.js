import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import OpenAI from 'openai';
import { supabase } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prefer a local backend/.env so backend can run independently; fallback to root .env
const localEnvPath = resolve(__dirname, '.env');
const rootEnvPath = resolve(__dirname, '../.env');
dotenv.config({ path: fs.existsSync(localEnvPath) ? localEnvPath : rootEnvPath });

const app = express();
app.use(cors());
app.use(express.json());

// Lightweight in-memory store for dev when Supabase is not configured
const hasSupabase = !!supabase;
const devStore = {
  employees: [],
};
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Basic status routes so visiting the root doesn't 404
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
function requireDb(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.'
    });
  }
  next();
}

// Initialize Twilio client (optional)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
  try {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized');
  } catch (error) {
    console.log('⚠️ Twilio initialization failed:', error.message);
  }
} else {
  console.log('⚠️ Twilio not configured (using placeholder values)');
}

// OpenAI client (lazy init to avoid crashing when no key is set)
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
    const serviceList = services.map(s => `• ${s.name} - $${s.price} (${s.duration} min)`).join('\n');
    return serviceList ? `Here are our available services:\n\n${serviceList}\n\nWhich service interests you?` : 
           'We offer various services including consultations, treatments, and more. What type of service are you looking for?';
  }
  
  // Booking intent
  if (/\b(book|appointment|schedule|want|need)\b/.test(message)) {
    // Simple booking flow - check if we have enough info
    const hasName = /(?:i'm|my name is|i am)\s+([a-zA-Z]+)/i.test(userMessage);
    const hasService = services.some(s => message.includes(s.name.toLowerCase()));
    const hasTime = /\d{1,2}:?\d{0,2}\s*(am|pm|o'clock)/i.test(message);
    const hasDate = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message);
    
    if (hasName && hasService && hasTime && hasDate) {
      // Extract basic info for demo
      const nameMatch = userMessage.match(/(?:i'm|my name is|i am)\s+([a-zA-Z]+)/i);
      const serviceName = services.find(s => message.includes(s.name.toLowerCase()))?.name || 'service';
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

// OpenAI Chat endpoint for AI Chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    // Check if OpenAI is available
    const useOpenAI = process.env.OPENAI_API_KEY && process.env.USE_OPENAI !== 'false';
    
    if (!useOpenAI) {
      // Use mock AI service as fallback
      const mockResponse = await getMockAIResponse(messages, context);
      return res.json({ 
        success: true, 
        message: mockResponse,
        provider: 'mock',
        note: 'Using mock AI service. Set OPENAI_API_KEY and USE_OPENAI=true to use OpenAI.'
      });
    }

    // Create system prompt with booking context
    const systemPrompt = `You are an intelligent booking assistant for ${context?.businessName || 'our business'}. 
You help customers book appointments in a conversational way.

AVAILABLE SERVICES:
${context?.services?.map(s => `- ${s.name}: $${s.price} (${s.duration} min)${s.description ? ' - ' + s.description : ''}`).join('\n') || 'Loading services...'}

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
      ...messages
    ];

    const openai = getOpenAI();
    if (!openai) {
      // Guard in case key disappeared between checks
      const mockResponse = await getMockAIResponse(messages, context);
      return res.json({ 
        success: true, 
        message: mockResponse,
        provider: 'mock',
        note: 'OPENAI_API_KEY not set; using mock AI service.'
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    res.json({ 
      success: true, 
      message: assistantMessage,
      provider: 'openai',
      usage: completion.usage
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // Fall back to mock AI service on OpenAI errors
    try {
      console.log('Falling back to mock AI service...');
      const mockResponse = await getMockAIResponse(messages, context);
      res.json({ 
        success: true, 
        message: mockResponse,
        provider: 'mock-fallback',
        note: 'OpenAI unavailable, using mock AI service as fallback.'
      });
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      res.status(500).json({ 
        success: false, 
        error: 'Both OpenAI and fallback services are unavailable'
      });
    }
  }
});

// Mock booking endpoint (replace with your actual booking logic)
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { name, service, date, time, email, phone } = req.body;
    
    console.log('Booking request received:', { name, service, date, time, email, phone });
    
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
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email endpoint (simulated; replace with real provider like SES/SendGrid)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body || {};
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ success: false, error: 'Missing to, subject, and html or text' });
    }
    console.log('Email would be sent:', { to, subject, hasHtml: !!html, hasText: !!text });
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
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) throw error;
    return res.json({ success: true, services: data || [] });
  } catch (error) {
    console.error('Error fetching services:', error);
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
    console.error('Error fetching employees:', error);
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
      .single();
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('business_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, settings: data });
  } catch (error) {
    console.error('Error updating business settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to update business settings' });
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
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

app.get('/api/business/:businessId/appointmentsByDay', requireDb, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date, employeeId } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'date is required (YYYY-MM-DD)' });
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    let query = supabase
      .from('appointments')
      .select('date, duration, employee_id, status')
      .eq('business_id', businessId)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString());
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
    const { business_id, service_id, employee_id, name, phone, email, notes, date, duration } = req.body || {};
    if (!business_id || !service_id || !employee_id || !name || !phone || !email || !date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const appointmentDate = new Date(date);

    // Prevent duplicate within same minute
    const { data: existing, error: existingErr } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', business_id)
      .gte('date', appointmentDate.toISOString())
      .lt('date', new Date(appointmentDate.getTime() + 60000).toISOString());
    if (existingErr) throw existingErr;
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Time slot already booked' });
    }

    // Find or create customer by email
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

    // Fetch service for duration if not provided
    let finalDuration = duration;
    if (!finalDuration) {
      const { data: svc } = await supabase
        .from('services')
        .select('duration')
        .eq('id', service_id)
        .single();
      finalDuration = svc?.duration || 30;
    }

    const { data: inserted, error: insertErr } = await supabase
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
        reminder_sent: false
      }])
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    return res.json({ success: true, appointmentId: inserted.id });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

app.patch('/api/appointments/:id', requireDb, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ success: false, error: 'Missing status' });
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return res.status(500).json({ success: false, error: 'Failed to update appointment' });
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
    const { name, email, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: 'Missing name or email' });
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, email, phone }])
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, customer: data });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// Services CRUD
app.post('/api/services', requireDb, async (req, res) => {
  try {
    const service = req.body || {};
    if (!service.business_id || !service.name || typeof service.duration !== 'number' || typeof service.price !== 'number') {
      return res.status(400).json({ success: false, error: 'Missing required service fields (business_id, name, duration, price)' });
    }
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    if (!supabase) {
      // Return in-memory list for dev
      return res.json({ success: true, employees: devStore.employees });
    }
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
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
    const employee = req.body || {};
    if (!employee.business_id || !employee.name || !employee.role || !employee.email) {
      return res.status(400).json({ success: false, error: 'Missing required employee fields (business_id, name, role, email)' });
    }

    if (!supabase) {
      // In-memory fallback for dev
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

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, employee: data });
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ success: false, error: 'Failed to update employee' });
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

    const { error } = await supabase
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
    const { data, error } = await supabase
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

