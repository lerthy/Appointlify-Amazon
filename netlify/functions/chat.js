import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

// MCP Client for RAG capabilities
async function queryMCPKnowledge(question, matchCount = 3) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    const mcpRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "query-knowledge",
        arguments: {
          question,
          matchCount,
          minSimilarity: 0.1
        }
      }
    };

    console.log('chat.js: Querying MCP knowledge for:', question);
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpRequest)
    });

    if (!response.ok) {
      console.log('chat.js: MCP query failed:', response.status);
      return [];
    }

    const result = await response.json();
    
    // Handle MCP errors gracefully
    if (result.error) {
      console.log('chat.js: MCP error:', result.error.message);
      if (result.error.message.includes('quota') || result.error.message.includes('billing')) {
        console.log('chat.js: OpenAI quota exceeded, continuing without knowledge');
      }
      return [];
    }
    
    const knowledge = result.result?.content?.[0]?.json || [];
    console.log('chat.js: MCP returned', knowledge.length, 'knowledge items');
    return knowledge;
  } catch (error) {
    console.error('chat.js: MCP query error:', error);
    return [];
  }
}

// Enhanced context fetching with MCP integration
async function getEnhancedContext(chatContext, messages = []) {
  let dbContext = { businesses: [], services: [], knowledge: [] };
  
  // If we have business context from the frontend, use it exclusively
  if (chatContext?.businessName && chatContext?.services) {
    console.log('chat.js: Using frontend business context exclusively:', chatContext.businessName);
    dbContext.businesses = [{ name: chatContext.businessName, id: chatContext.businessId }];
    dbContext.services = chatContext.services || [];
    return dbContext;
  }
  
  // If no frontend context, try to detect business from user message
  const userMessage = messages[messages.length - 1]?.content || '';
  const businessNameMatch = userMessage.match(/(lerdi salihi|nike|sample business|my business|filan fisteku|business test|bussiness test)/i);
  if (businessNameMatch) {
    const detectedBusiness = businessNameMatch[0].toLowerCase();
    console.log('chat.js: Detected business from message:', detectedBusiness);
    
    // Map detected business names to their business_ids (for services table)
    const businessMap = {
      'lerdi salihi': 'c7aac928-b5dd-407e-90d5-3621f18fede1',
      'nike': '8632da60-830e-4df1-9f64-3e60d274bcb5',
      'sample business': '550e8400-e29b-41d4-a716-446655440000',
      'my business': '8632da60-830e-4df1-9f64-3e60d274bcb5',
      'filan fisteku': 'd5319a6d-a78f-4a56-b288-aa123da023af',
      'business test': '9cd05682-b03d-4bff-80b2-4c623dd7fd0a',
      'bussiness test': '9cd05682-b03d-4bff-80b2-4c623dd7fd0a'
    };
    
    const businessId = businessMap[detectedBusiness];
    if (businessId) {
      // Fetch services for this specific business
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && serviceKey) {
          const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
          
          const { data: services, error: svcError } = await sb
            .from('services')
            .select('id, name, price, duration, description')
            .eq('business_id', businessId);
          
          if (!svcError && services) {
            console.log('chat.js: Found services for detected business:', services.length, 'services:', services.map(s => s.name));
            dbContext.businesses = [{ name: businessNameMatch[0], id: businessId }];
            dbContext.services = services;
            return dbContext;
          } else {
            console.log('chat.js: Error fetching services for detected business:', svcError);
          }
        }
      } catch (e) {
        console.error('chat.js: Error fetching services for detected business:', e);
      }
    }
  }
  
  // Fetch live business/services context from Supabase
  console.log('chat.js: Starting Supabase fetch...');
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && serviceKey) {
      const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      console.log('chat.js: Created Supabase client, querying...');
      
      const [{ data: businesses, error: bizError }, { data: services, error: svcError }] = await Promise.all([
        sb.from('business_settings').select('id, name, working_hours').limit(50),
        sb.from('services').select('id, name, price, duration, description, business_id').limit(200)
      ]);
      
      console.log('chat.js: Query results:', { 
        businessCount: businesses?.length || 0, 
        serviceCount: services?.length || 0,
        bizError: bizError?.message,
        svcError: svcError?.message
      });
      
      dbContext.businesses = businesses || [];
      dbContext.services = services || [];
    } else {
      console.log('chat.js: Missing Supabase env vars, skipping DB fetch');
    }
  } catch (e) {
    console.error('chat.js: Supabase fetch failed:', e);
  }
  
  return dbContext;
}

// Check if user message contains complete booking information
function hasCompleteBookingInfo(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Check for required fields
  const hasName = /(?:name is|i'm|i am)\s+([a-zA-Z\s]+)/i.test(userMessage);
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(userMessage);
  const hasPhone = /\+?[\d\s\-\(\)]{10,}/.test(userMessage);
  const hasService = /(?:haircut|consultation|basic service|diqka tjeter)/i.test(userMessage);
  const hasBusiness = /(?:lerdi salihi|nike|sample business|my business|filan fisteku|business test)/i.test(userMessage);
  const hasDate = /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i.test(userMessage);
  const hasTime = /\d{1,2}:?\d{0,2}\s*(am|pm)/i.test(userMessage);
  
  return hasName && hasEmail && hasPhone && hasService && hasBusiness && hasDate && hasTime;
}

// Extract booking information from user message
function extractBookingInfo(userMessage) {
  const nameMatch = userMessage.match(/(?:name is|i'm|i am)\s+([a-zA-Z\s]+)/i);
  const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = userMessage.match(/(\+?[\d\s\-\(\)]{10,})/);
  const serviceMatch = userMessage.match(/(haircut|consultation|basic service|diqka tjeter)/i);
  const businessMatch = userMessage.match(/(lerdi salihi|nike|sample business|my business|filan fisteku|business test)/i);
  const dateMatch = userMessage.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);
  const timeMatch = userMessage.match(/(\d{1,2}:?\d{0,2}\s*(am|pm))/i);
  
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    email: emailMatch ? emailMatch[1] : null,
    phone: phoneMatch ? phoneMatch[1].trim() : null,
    service: serviceMatch ? serviceMatch[1] : null,
    business: businessMatch ? businessMatch[1] : null,
    date: dateMatch ? dateMatch[1] : null,
    time: timeMatch ? timeMatch[1] : null
  };
}

// Handle booking ready responses
async function handleBookingReady(assistantMessage, headers) {
  try {
    // Extract booking data from the message
    const bookingMatch = assistantMessage.match(/BOOKING_READY:\s*({.*})/);
    if (!bookingMatch) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: assistantMessage,
          provider: 'booking-ready',
          requiresConfirmation: true
        })
      };
    }

    const bookingData = JSON.parse(bookingMatch[1]);
    console.log('Booking data extracted:', bookingData);

    // Ask for confirmation
    const confirmationMessage = `I have all the details for your appointment:

**Appointment Details:**
• **Business:** ${bookingData.business || 'Selected Business'}
• **Service:** ${bookingData.service}
• **Date:** ${bookingData.date}
• **Time:** ${bookingData.time}
• **Name:** ${bookingData.name}
• **Email:** ${bookingData.email}
• **Phone:** ${bookingData.phone}

**Please confirm:** Would you like me to book this appointment? Type "yes" to confirm or "no" to make changes.`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: confirmationMessage,
        provider: 'booking-confirmation',
        bookingData: bookingData,
        requiresConfirmation: true
      })
    };
  } catch (error) {
    console.error('Error handling booking ready:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: assistantMessage,
        provider: 'booking-ready-error'
      })
    };
  }
}

// Handle booking confirmation
async function handleBookingConfirmation(messages, bookingData, headers) {
  try {
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    if (userMessage.includes('yes') || userMessage.includes('confirm') || userMessage.includes('book')) {
      // Create appointment in Supabase via MCP
      const appointmentId = await createAppointment(bookingData);
      
      if (appointmentId) {
        // Send confirmation email and SMS
        await sendConfirmationNotifications(bookingData, appointmentId);
        
        const successMessage = `✅ **Appointment Confirmed!**

**Your booking details:**
• **Booking ID:** ${appointmentId}
• **Business:** ${bookingData.business || 'Selected Business'}
• **Service:** ${bookingData.service}
• **Date:** ${bookingData.date}
• **Time:** ${bookingData.time}
• **Name:** ${bookingData.name}

You will receive a confirmation email and SMS shortly. If you need to make any changes, please contact us.

Thank you for choosing Appointly! 🎉`;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: successMessage,
            provider: 'booking-confirmed',
            appointmentId: appointmentId
          })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Sorry, there was an error creating your appointment. Please try again or contact support.",
            provider: 'booking-error'
          })
        };
      }
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "No problem! What would you like to change about your appointment?",
          provider: 'booking-cancelled'
        })
      };
    }
  } catch (error) {
    console.error('Error handling booking confirmation:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Sorry, there was an error processing your confirmation. Please try again.",
        provider: 'booking-confirmation-error'
      })
    };
  }
}

// Create appointment in Supabase
async function createAppointment(bookingData) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    // Get business_id for the appointment
    const businessId = await getBusinessId(bookingData.business);
    if (!businessId) {
      throw new Error('Business not found');
    }

    // Get service_id for the appointment
    const serviceId = await getServiceId(bookingData.service, businessId);
    if (!serviceId) {
      throw new Error('Service not found');
    }

    // Create appointment record
    const appointmentData = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      business_id: businessId,
      service_id: serviceId,
      customer_name: bookingData.name,
      customer_email: bookingData.email,
      customer_phone: bookingData.phone,
      date: new Date(`${bookingData.date} ${bookingData.time}`).toISOString(),
      status: 'scheduled',
      notes: bookingData.notes || '',
      created_at: new Date().toISOString()
    };

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'upsert-rows',
          arguments: {
            table: 'appointments',
            rows: [appointmentData]
          }
        }
      })
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log('Appointment created successfully:', appointmentData.id);
    return appointmentData.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    return null;
  }
}

// Get business_id from business name
async function getBusinessId(businessName) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'fetch-table',
          arguments: {
            table: 'business_settings',
            eq: { name: businessName }
          }
        }
      })
    });

    const result = await response.json();
    if (result.result?.content?.[0]?.json?.[0]) {
      return result.result.content[0].json[0].business_id;
    }
    return null;
  } catch (error) {
    console.error('Error getting business ID:', error);
    return null;
  }
}

// Get service_id from service name and business_id
async function getServiceId(serviceName, businessId) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'fetch-table',
          arguments: {
            table: 'services',
            eq: { 
              name: serviceName,
              business_id: businessId
            }
          }
        }
      })
    });

    const result = await response.json();
    if (result.result?.content?.[0]?.json?.[0]) {
      return result.result.content[0].json[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error getting service ID:', error);
    return null;
  }
}

// Send confirmation notifications
async function sendConfirmationNotifications(bookingData, appointmentId) {
  try {
    // Send email notification
    const emailResponse = await fetch('https://appointly-ks.netlify.app/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: bookingData.email,
        subject: 'Appointment Confirmation - Appointly',
        html: `
          <h2>Appointment Confirmed!</h2>
          <p>Dear ${bookingData.name},</p>
          <p>Your appointment has been successfully booked.</p>
          <ul>
            <li><strong>Booking ID:</strong> ${appointmentId}</li>
            <li><strong>Business:</strong> ${bookingData.business}</li>
            <li><strong>Service:</strong> ${bookingData.service}</li>
            <li><strong>Date:</strong> ${bookingData.date}</li>
            <li><strong>Time:</strong> ${bookingData.time}</li>
          </ul>
          <p>Thank you for choosing Appointly!</p>
        `
      })
    });

    // Send SMS notification
    const smsResponse = await fetch('https://appointly-ks.netlify.app/.netlify/functions/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: bookingData.phone,
        message: `Appointment confirmed! Booking ID: ${appointmentId}. ${bookingData.service} on ${bookingData.date} at ${bookingData.time}. - Appointly`
      })
    });

    console.log('Notifications sent:', { email: emailResponse.ok, sms: smsResponse.ok });
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

// Mock AI Service for fallback
async function getMockAIResponse(messages, context) {
  const userMessage = messages[messages.length - 1]?.content || '';
  const businessName = context?.businessName || 'our business';
  const services = context?.services || [];
  const availableTimes = context?.availableTimes || [];
  
  // Simple mock AI logic
  const message = userMessage.toLowerCase();
  
  // Greeting
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(message)) {
    return `Hello! Welcome to Appointly. I'm here to help you book an appointment with one of our businesses.

**Available Businesses:**
${services.slice(0, 5).map((s, i) => `${i + 1}. ${s.name || 'Business'}`).join('\n')}

What can I help you with today? Would you like to book an appointment?`;
  }
  
  // Service inquiry
  if (/\b(services|what do you offer|menu|options)\b/.test(message)) {
    const serviceList = services.map(s => `• ${s.name} - $${s.price} (${s.duration} min)`).join('\n');
    return serviceList ? `Here are our available services:\n\n${serviceList}\n\nWhich service interests you?` : 
           'We offer various services including consultations, treatments, and more. What type of service are you looking for?';
  }
  
  // Business selection
  if (/\b(lerdi salihi|sample business|my business|nike|filan fisteku)\b/i.test(userMessage)) {
    const businessName = userMessage.match(/\b(lerdi salihi|sample business|my business|nike|filan fisteku)\b/i)?.[0];
    return `Great choice! ${businessName} is one of our available businesses.

**Next Steps:**
1. **Service Selection** - What service would you like to book?
2. **Date & Time** - When would you prefer?
3. **Your Details** - I'll need your name and contact info

What service are you interested in?`;
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
      
      return `BOOKING_READY: {"name": "${nameMatch?.[1] || 'Customer'}", "business": "Selected Business", "service": "${serviceName}", "date": "${dateStr}", "time": "${timeMatch?.[0] || '2:00 PM'}", "email": "customer@example.com", "phone": "+1234567890"}`;
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

export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { messages, context: chatContext } = JSON.parse(event.body);

    // Get enhanced context with MCP integration
    console.log('chat.js: Received context:', JSON.stringify(chatContext, null, 2));
    const dbContext = await getEnhancedContext(chatContext, messages);
    console.log('chat.js: Final dbContext:', JSON.stringify(dbContext, null, 2));
    
    // Query MCP knowledge base for relevant information
    const userMessage = messages[messages.length - 1]?.content || '';
    const knowledge = await queryMCPKnowledge(userMessage, 3);
    dbContext.knowledge = knowledge;
    
    // Check if user message contains complete booking information
    if (hasCompleteBookingInfo(userMessage)) {
      console.log('chat.js: Complete booking info detected, generating BOOKING_READY response');
      const bookingInfo = extractBookingInfo(userMessage);
      const bookingReadyMessage = `BOOKING_READY: ${JSON.stringify(bookingInfo)}`;
      return await handleBookingReady(bookingReadyMessage, headers);
    }
    
    // Prefer Groq if available; else OpenAI; else mock
    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const useOpenAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_OPENAI !== 'false';
    console.log('chat.js provider flags => useGroq:', useGroq, 'useOpenAI:', useOpenAI);
    
    if (!useGroq && !useOpenAI) {
      // Use mock AI service as fallback
      const mockResponse = await getMockAIResponse(messages, chatContext);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: mockResponse,
          provider: 'mock',
          note: 'Using mock AI service. Set OPENAI_API_KEY and USE_OPENAI=true to use OpenAI.'
        })
      };
    }

    // Try Groq first
    if (useGroq) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

      // Create system prompt with booking context and MCP knowledge
      const servicesByBiz = dbContext.services.map(s => `- ${s.name} ($${s.price}, ${s.duration} min)`).slice(0, 50).join('\n');
      const businessList = dbContext.businesses.map((b, i) => `${i + 1}. ${b.name || 'Business'}${b.working_hours ? ' - Working hours available' : ''}`).slice(0, 25).join('\n');
      const knowledgeContext = dbContext.knowledge.length > 0 ? 
        `\nRELEVANT KNOWLEDGE BASE INFORMATION:\n${dbContext.knowledge.map(k => `- ${k.content} (Source: ${k.source})`).join('\n')}\n\n` : '';
      
      const systemPrompt = `You are a professional booking assistant for Appointly. You help customers book appointments with a friendly, structured approach.

CRITICAL INSTRUCTION: When a customer provides ALL booking details (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY JSON format. Do not ask for confirmation or summarize. Just output the JSON.

BUSINESSES AVAILABLE:
${businessList || 'No businesses found.'}

SERVICES AVAILABLE:
${servicesByBiz || 'No services found.'}

AVAILABLE TIME SLOTS:
${chatContext?.availableTimes?.join(', ') || 'Checking availability...'}

${knowledgeContext}
CONVERSATION GUIDELINES:
1. Be professional, friendly, and helpful
2. Use clear, structured responses
3. Guide customers through booking step by step
4. Ask for one piece of information at a time
5. Confirm details before finalizing
6. Use the knowledge base information to provide accurate answers

BOOKING FLOW:
1. Greet and ask what they need
2. Help them choose a business
3. Help them select a service
4. Ask for preferred date and time
5. Collect their name and contact info
6. Confirm all details
7. Use BOOKING_READY format when complete

BOOKING_READY FORMAT (CRITICAL):
When you have all booking details, you MUST output exactly this format:
BOOKING_READY: {"name": "Customer Name", "business": "Business Name", "service": "Service Name", "date": "Date", "time": "Time", "email": "email@example.com", "phone": "+1234567890"}

EXAMPLE:
If customer says "Book me for a haircut at Lerdi Salihi on Monday at 10 AM, my name is John, email is john@email.com, phone is +1234567890"
You MUST respond with:
BOOKING_READY: {"name": "John", "business": "Lerdi Salihi", "service": "Haircut", "date": "Monday", "time": "10:00 AM", "email": "john@email.com", "phone": "+1234567890"}

Do NOT format it as a nice message. Output the exact JSON format above.

RESPONSE STYLE:
- Use bullet points for lists
- Be concise but informative
- Ask follow-up questions naturally
- Provide clear next steps
- Use professional but warm tone

IMPORTANT: When you have ALL the required information (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY format. Do not ask for more confirmation. Do not summarize. Just output the JSON format.

Required fields: name, business, service, date, time, email, phone.`;

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      console.log('chat.js using provider: groq');
      const completion = await groq.chat.completions.create({
        model,
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      // Check if this is a booking ready response
      if (assistantMessage.includes('BOOKING_READY:')) {
        return await handleBookingReady(assistantMessage, headers);
      }
      
      // Check if this is a confirmation response (user said yes/no to booking)
      const userMessageGroq = messages[messages.length - 1]?.content?.toLowerCase() || '';
      if ((userMessageGroq.includes('yes') || userMessageGroq.includes('no') || userMessageGroq.includes('confirm')) && 
          messages.length > 1 && 
          messages[messages.length - 2]?.content?.includes('Please confirm')) {
        // This is a response to a booking confirmation
        const previousResponse = JSON.parse(event.body);
        if (previousResponse.bookingData) {
          return await handleBookingConfirmation(messages, previousResponse.bookingData, headers);
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: assistantMessage,
          provider: 'groq',
          mcpKnowledgeUsed: dbContext.knowledge.length,
          context: {
            businesses: dbContext.businesses.length,
            services: dbContext.services.length,
            knowledge: dbContext.knowledge.length
          }
        })
      };
    }

    // Initialize OpenAI client
    console.log('chat.js using provider: openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create system prompt with booking context and MCP knowledge
    const servicesByBiz = dbContext.services.map(s => `- ${s.name}: $${s.price} (${s.duration} min)${s.description ? ' - ' + s.description : ''}`).slice(0, 50).join('\n');
    const businessList = dbContext.businesses.map((b, i) => `${i + 1}. ${b.name || 'Business'}${b.working_hours ? ' - Working hours available' : ''}`).slice(0, 25).join('\n');
    const knowledgeContext = dbContext.knowledge.length > 0 ? 
      `\nRELEVANT KNOWLEDGE BASE INFORMATION:\n${dbContext.knowledge.map(k => `- ${k.content} (Source: ${k.source})`).join('\n')}\n\n` : '';
    
    const systemPrompt = `You are a professional booking assistant for Appointly. You help customers book appointments with a friendly, structured approach.

CRITICAL INSTRUCTION: When a customer provides ALL booking details (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY JSON format. Do not ask for confirmation or summarize. Just output the JSON.

BUSINESSES AVAILABLE:
${businessList || 'No businesses found.'}

SERVICES AVAILABLE:
${servicesByBiz || 'No services found.'}

AVAILABLE TIME SLOTS:
${chatContext?.availableTimes?.join(', ') || 'Checking availability...'}

${knowledgeContext}
CONVERSATION GUIDELINES:
1. Be professional, friendly, and helpful
2. Use clear, structured responses
3. Guide customers through booking step by step
4. Ask for one piece of information at a time
5. Confirm details before finalizing
6. Use the knowledge base information to provide accurate answers

BOOKING FLOW:
1. Greet and ask what they need
2. Help them choose a business
3. Help them select a service
4. Ask for preferred date and time
5. Collect their name and contact info
6. Confirm all details
7. Use BOOKING_READY format when complete

BOOKING_READY FORMAT (CRITICAL):
When you have all booking details, you MUST output exactly this format:
BOOKING_READY: {"name": "Customer Name", "business": "Business Name", "service": "Service Name", "date": "Date", "time": "Time", "email": "email@example.com", "phone": "+1234567890"}

EXAMPLE:
If customer says "Book me for a haircut at Lerdi Salihi on Monday at 10 AM, my name is John, email is john@email.com, phone is +1234567890"
You MUST respond with:
BOOKING_READY: {"name": "John", "business": "Lerdi Salihi", "service": "Haircut", "date": "Monday", "time": "10:00 AM", "email": "john@email.com", "phone": "+1234567890"}

Do NOT format it as a nice message. Output the exact JSON format above.

RESPONSE STYLE:
- Use bullet points for lists
- Be concise but informative
- Ask follow-up questions naturally
- Provide clear next steps
- Use professional but warm tone

IMPORTANT: When you have ALL the required information (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY format. Do not ask for more confirmation. Do not summarize. Just output the JSON format.

Required fields: name, business, service, date, time, email, phone.`;

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
    
    // Check if this is a booking ready response
    if (assistantMessage.includes('BOOKING_READY:')) {
      return await handleBookingReady(assistantMessage, headers);
    }
    
    // Check if this is a confirmation response (user said yes/no to booking)
    const userMessageOpenAI = messages[messages.length - 1]?.content?.toLowerCase() || '';
    if ((userMessageOpenAI.includes('yes') || userMessageOpenAI.includes('no') || userMessageOpenAI.includes('confirm')) && 
        messages.length > 1 && 
        messages[messages.length - 2]?.content?.includes('Please confirm')) {
      // This is a response to a booking confirmation
      const previousResponse = JSON.parse(event.body);
      if (previousResponse.bookingData) {
        return await handleBookingConfirmation(messages, previousResponse.bookingData, headers);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: assistantMessage,
        provider: 'openai',
        usage: completion.usage,
        mcpKnowledgeUsed: dbContext.knowledge.length,
        context: {
          businesses: dbContext.businesses.length,
          services: dbContext.services.length,
          knowledge: dbContext.knowledge.length
        }
      })
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // Fall back to mock AI service on OpenAI errors
    try {
      console.log('Falling back to mock AI service...');
      const { messages, context: chatContext } = JSON.parse(event.body);
      const mockResponse = await getMockAIResponse(messages, chatContext);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: mockResponse,
          provider: 'mock-fallback',
          note: 'OpenAI unavailable, using mock AI service as fallback.'
        })
      };
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Both OpenAI and fallback services are unavailable'
        })
      };
    }
  }
}
