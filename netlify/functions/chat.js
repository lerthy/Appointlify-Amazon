import OpenAI from 'openai';

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
    
    // Check if OpenAI is available
    const useOpenAI = process.env.OPENAI_API_KEY && process.env.USE_OPENAI !== 'false';
    
    if (!useOpenAI) {
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

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create system prompt with booking context
    const systemPrompt = `You are an intelligent booking assistant for ${chatContext?.businessName || 'our business'}. 
You help customers book appointments in a conversational way.

AVAILABLE SERVICES:
${chatContext?.services?.map(s => `- ${s.name}: $${s.price} (${s.duration} min)${s.description ? ' - ' + s.description : ''}`).join('\n') || 'Loading services...'}

AVAILABLE TIME SLOTS:
${chatContext?.availableTimes?.join(', ') || 'Checking availability...'}

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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: assistantMessage,
        provider: 'openai',
        usage: completion.usage
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
