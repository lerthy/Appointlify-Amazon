import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting backend...');
// Load .env from root or backend
const rootEnvPath = resolve(__dirname, '.env');
const backendEnvPath = resolve(__dirname, 'backend', '.env');
const envPath = existsSync(rootEnvPath) ? rootEnvPath : (existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath);
dotenv.config({ path: envPath });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client - use service role for backend to bypass RLS (matches Netlify functions)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);

} else {

}

// Initialize Twilio client (optional)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && accountSid.startsWith('AC') && authToken.length > 10) {
  try {
    client = twilio(accountSid, authToken);

  } catch (error) {

  }
} else {
  
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Get embeddable appointment form widget
app.get('/api/appointment-form', async (req, res) => {
  try {
    const businessId = req.query.business_id;

    if (!businessId) {
      return res.status(400).json({
        error: 'business_id query parameter is required'
      });
    }

    // Fetch services and employees for this business
    let services = [];
    let employees = [];
    let businessName = 'Our Business';

    if (supabase) {
      try {
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, description, price, duration')
          .eq('business_id', businessId)
          .order('name');

        if (!servicesError && servicesData) {
          services = servicesData;
        }

        // Fetch employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('id, name, role')
          .eq('business_id', businessId)
          .order('name');

        if (!employeesError && employeesData) {
          employees = employeesData;
        }

        // Fetch business name
        const { data: businessData } = await supabase
          .from('users')
          .select('name')
          .eq('id', businessId)
          .single();

        if (businessData?.name) {
          businessName = businessData.name;
        }
      } catch (dbError) {
        console.error('Error fetching business data:', dbError);
      }
    }

    const apiUrl = `${req.protocol}://${req.get('host')}`;
    // Properly escape JSON for embedding in JavaScript
    const escapeJsonForJs = (jsonStr) => {
      return jsonStr
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    };
    const servicesJson = escapeJsonForJs(JSON.stringify(services));
    const employeesJson = escapeJsonForJs(JSON.stringify(employees));

    // Generate available dates (next 30 days)
    const availableDates = [];
    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      availableDates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book Appointment - ${businessName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    .appointlify-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .appointlify-widget h2 {
      color: #1f2937;
      margin-bottom: 24px;
      font-size: 24px;
      font-weight: 600;
    }
    
    .appointlify-form-group {
      margin-bottom: 20px;
    }
    
    .appointlify-form-group label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }
    
    .appointlify-form-group label .required {
      color: #ef4444;
    }
    
    .appointlify-form-group input,
    .appointlify-form-group select,
    .appointlify-form-group textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    
    .appointlify-form-group input:focus,
    .appointlify-form-group select:focus,
    .appointlify-form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .appointlify-form-group textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    .appointlify-error {
      color: #ef4444;
      font-size: 12px;
      margin-top: 4px;
      display: none;
    }
    
    .appointlify-error.show {
      display: block;
    }
    
    .appointlify-button {
      width: 100%;
      padding: 14px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 8px;
    }
    
    .appointlify-button:hover:not(:disabled) {
      background: #2563eb;
    }
    
    .appointlify-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .appointlify-message {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      display: none;
    }
    
    .appointlify-message.success {
      display: block;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    
    .appointlify-message.error {
      display: block;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
  </style>
</head>
<body>
  <div class="appointlify-widget">
    <h2>Book Your Appointment</h2>
    
    <div id="appointlify-message" class="appointlify-message"></div>
    
    <form id="appointlify-form">
      <div class="appointlify-form-group">
        <label>Service <span class="required">*</span></label>
        <select id="service_id" name="service_id" required>
          <option value="">Select a service</option>
        </select>
        <div class="appointlify-error" id="error-service_id"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Employee <span class="required">*</span></label>
        <select id="employee_id" name="employee_id" required>
          <option value="">Select an employee</option>
        </select>
        <div class="appointlify-error" id="error-employee_id"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Date <span class="required">*</span></label>
        <input type="date" id="date" name="date" required min="${new Date().toISOString().split('T')[0]}">
        <div class="appointlify-error" id="error-date"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Time <span class="required">*</span></label>
        <input type="time" id="time" name="time" required>
        <div class="appointlify-error" id="error-time"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Full Name <span class="required">*</span></label>
        <input type="text" id="name" name="name" required placeholder="Enter your full name">
        <div class="appointlify-error" id="error-name"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Phone Number <span class="required">*</span></label>
        <input type="tel" id="phone" name="phone" required placeholder="+383 44 123 456">
        <div class="appointlify-error" id="error-phone"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Email <span class="required">*</span></label>
        <input type="email" id="email" name="email" required placeholder="your.email@example.com">
        <div class="appointlify-error" id="error-email"></div>
      </div>
      
      <div class="appointlify-form-group">
        <label>Notes (Optional)</label>
        <textarea id="notes" name="notes" placeholder="Any additional information..."></textarea>
      </div>
      
      <button type="submit" class="appointlify-button" id="submit-btn">Book Appointment</button>
    </form>
  </div>

  <script>
    (function() {
      const services = JSON.parse('${servicesJson.replace(/'/g, "\\'")}');
      const employees = JSON.parse('${employeesJson.replace(/'/g, "\\'")}');
      const apiUrl = '${apiUrl}';
      const businessId = '${businessId}';
      
      // Populate services dropdown
      const serviceSelect = document.getElementById('service_id');
      services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = \`\${service.name} - $\${service.price} (\${service.duration} min)\`;
        serviceSelect.appendChild(option);
      });
      
      // Populate employees dropdown
      const employeeSelect = document.getElementById('employee_id');
      employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name + (employee.role ? \` - \${employee.role}\` : '');
        employeeSelect.appendChild(option);
      });
      
      // Set minimum date to today
      const dateInput = document.getElementById('date');
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
      
      // Form submission handler
      const form = document.getElementById('appointlify-form');
      const submitBtn = document.getElementById('submit-btn');
      const messageDiv = document.getElementById('appointlify-message');
      
      function showError(field, message) {
        const errorDiv = document.getElementById(\`error-\${field}\`);
        if (errorDiv) {
          errorDiv.textContent = message;
          errorDiv.classList.add('show');
        }
      }
      
      function clearErrors() {
        document.querySelectorAll('.appointlify-error').forEach(el => {
          el.classList.remove('show');
          el.textContent = '';
        });
      }
      
      function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = \`appointlify-message \${type}\`;
      }
      
      function validateEmail(email) {
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
      }
      
      function validatePhone(phone) {
        return /^\\+?[\\d\\s\\-\\(\\)]+$/.test(phone);
      }
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();
        showMessage('', '');
        
        // Get form data
        const formData = {
          business_id: businessId,
          service_id: serviceSelect.value,
          employee_id: employeeSelect.value,
          date: dateInput.value,
          time: document.getElementById('time').value,
          name: document.getElementById('name').value.trim(),
          phone: document.getElementById('phone').value.trim(),
          email: document.getElementById('email').value.trim(),
          notes: document.getElementById('notes').value.trim()
        };
        
        // Validation
        let isValid = true;
        
        if (!formData.service_id) {
          showError('service_id', 'Please select a service');
          isValid = false;
        }
        
        if (!formData.employee_id) {
          showError('employee_id', 'Please select an employee');
          isValid = false;
        }
        
        if (!formData.date) {
          showError('date', 'Please select a date');
          isValid = false;
        }
        
        if (!formData.time) {
          showError('time', 'Please select a time');
          isValid = false;
        }
        
        if (!formData.name) {
          showError('name', 'Please enter your name');
          isValid = false;
        }
        
        if (!formData.phone) {
          showError('phone', 'Please enter your phone number');
          isValid = false;
        } else if (!validatePhone(formData.phone)) {
          showError('phone', 'Please enter a valid phone number');
          isValid = false;
        }
        
        if (!formData.email) {
          showError('email', 'Please enter your email');
          isValid = false;
        } else if (!validateEmail(formData.email)) {
          showError('email', 'Please enter a valid email address');
          isValid = false;
        }
        
        if (!isValid) return;
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';
        
        try {
          const response = await fetch(\`\${apiUrl}/api/book-appointment\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
          });
          
          const result = await response.json();
          
          if (result.success) {
            showMessage(\`✅ \${result.message || 'Appointment booked successfully!'}\`, 'success');
            form.reset();
            clearErrors();
          } else {
            showMessage(\`❌ \${result.error || 'Failed to book appointment. Please try again.'}\`, 'error');
            
            // Show field-specific errors if available
            if (result.errors) {
              Object.keys(result.errors).forEach(field => {
                const errorMsg = result.errors[field];
                if (typeof errorMsg === 'string') {
                  showError(field, errorMsg);
                } else if (typeof errorMsg === 'object') {
                  const firstError = Object.values(errorMsg)[0];
                  if (firstError) showError(field, firstError);
                }
              });
            }
          }
        } catch (error) {
          console.error('Error:', error);
          showMessage('❌ Network error. Please check your connection and try again.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Book Appointment';
        }
      });
    })();
  </script>
</body>
</html>`;

    res.type('html').send(html);
  } catch (error) {
    console.error('Error generating appointment form:', error);
    res.status(500).json({
      error: 'Failed to generate appointment form'
    });
  }
});

// Mock booking endpoint (replace with your actual booking logic)
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { name, service, date, time, email, phone, business_id, service_id, employee_id, notes } = req.body;

    // Support both old and new format
    const appointmentData = {
      name: name || req.body.name,
      service: service || req.body.service,
      service_id: service_id || req.body.service_id,
      employee_id: employee_id || req.body.employee_id,
      date: date || req.body.date,
      time: time || req.body.time,
      email: email || req.body.email,
      phone: phone || req.body.phone,
      notes: notes || req.body.notes,
      business_id: business_id || req.body.business_id
    };



    // Here you would integrate with your actual booking system
    // For now, we'll just simulate a successful booking
    const bookingId = `apt_${Date.now()}`;

    res.json({
      success: true,
      bookingId,
      message: `Appointment booked successfully! Your booking ID is ${bookingId}`,
      details: appointmentData
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

// Health check (for verifying proxy: open http://localhost:3000/api/health)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is up' });
});

// Get business info by ID or subdomain (for AppointmentPage)
app.get('/api/business/:businessId/info', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);

    let query = supabase
      .from('users')
      .select('id, name, description, logo, subdomain, business_address');

    if (isUuid) {
      query = query.eq('id', businessId);
    } else {
      query = query.eq('subdomain', businessId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return res.status(404).json({ success: false, error: 'Business not found' });
      }
      throw error;
    }

    return res.json({ success: true, info: data || null });
  } catch (error) {
    console.error('[GET /api/business/:businessId/info]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch business info'
    });
  }
});

// Get business settings (for AppointmentForm - public booking, no auth required)
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

async function ensureBusinessSettings(businessId) {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!error && Array.isArray(data) && data.length > 0) {
    return { data: data[0], created: false };
  }

  if (error && error.code !== 'PGRST116') {
    console.error('[ensureBusinessSettings] Unexpected Supabase error:', error);
    throw error;
  }

  let businessName = 'Business Settings';
  try {
    const { data: userData } = await supabase
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

  const { data: inserted, error: insertError } = await supabase
    .from('business_settings')
    .insert([defaultSettings])
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return { data: inserted, created: true };
}

app.get('/api/business/:businessId/settings', async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data } = await ensureBusinessSettings(businessId);
    return res.json({ success: true, settings: data || null });
  } catch (error) {
    console.error('[GET /api/business/:businessId/settings]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch business settings'
    });
  }
});

app.patch('/api/business/:businessId/settings', async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body || {};

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const normalized = {
      working_hours: Array.isArray(updates.working_hours) ? updates.working_hours : buildDefaultWorkingHours(),
      blocked_dates: Array.isArray(updates.blocked_dates) ? updates.blocked_dates : [],
      breaks: Array.isArray(updates.breaks) ? updates.breaks : [],
      appointment_duration: typeof updates.appointment_duration === 'number' && updates.appointment_duration > 0
        ? updates.appointment_duration
        : 30,
      updated_at: new Date().toISOString()
    };

    const { data: existingRows, error: existingError } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false });

    if (existingError) {
      console.error('[PATCH /api/business/:businessId/settings] error checking existing:', existingError);
      return res.status(500).json({ success: false, error: existingError.message });
    }

    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;
    let dbResult = null;

    if (existing) {
      const { data, error } = await supabase
        .from('business_settings')
        .update(normalized)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[PATCH /api/business/:businessId/settings] update error:', error);
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
        appointment_duration: normalized.appointment_duration,
        updated_at: normalized.updated_at
      };

      const { data, error } = await supabase
        .from('business_settings')
        .insert([insertPayload])
        .select()
        .single();

      if (error) {
        console.error('[PATCH /api/business/:businessId/settings] insert error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
      dbResult = data;
    }

    return res.json({ success: true, settings: dbResult });
  } catch (error) {
    console.error('[PATCH /api/business/:businessId/settings]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update business settings'
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
