import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
