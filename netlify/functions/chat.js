import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
  
  // Fetch live business/services context using MCP integration
  console.log('chat.js: Starting MCP fetch for businesses and services...');
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    // Fetch businesses from users table and services
    const [businessResponse, servicesResponse] = await Promise.all([
      fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'fetch-table',
            arguments: {
              table: 'users',
              select: 'id, name, description, logo',
              limit: 50
            }
          }
        })
      }),
      fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'fetch-table',
            arguments: {
              table: 'services',
              select: 'id, name, price, duration, description, business_id',
              limit: 200
            }
          }
        })
      })
    ]);
    
    const businessResult = await businessResponse.json();
    const servicesResult = await servicesResponse.json();
    
    console.log('chat.js: MCP results:', {
      businessSuccess: !businessResult.error,
      servicesSuccess: !servicesResult.error,
      businessError: businessResult.error?.message,
      servicesError: servicesResult.error?.message
    });
    
    if (!businessResult.error && businessResult.result?.content?.[0]?.json) {
      dbContext.businesses = businessResult.result.content[0].json;
      console.log('chat.js: Found', dbContext.businesses.length, 'businesses:', dbContext.businesses.map(b => b.name));
    } else {
      console.log('chat.js: No businesses found - error:', businessResult.error?.message, 'result:', businessResult.result);
    }
    
    if (!servicesResult.error && servicesResult.result?.content?.[0]?.json) {
      dbContext.services = servicesResult.result.content[0].json;
      console.log('chat.js: Found', dbContext.services.length, 'services');
    }
    
  } catch (e) {
    console.error('chat.js: MCP fetch failed:', e);
    
    // Fallback to direct Supabase if MCP fails
    console.log('chat.js: Falling back to direct Supabase...');
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && serviceKey) {
        const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        
        const [{ data: businesses, error: bizError }, { data: services, error: svcError }] = await Promise.all([
          sb.from('users').select('id, name, description, logo').limit(50),
          sb.from('services').select('id, name, price, duration, description, business_id').limit(200)
        ]);
        
        console.log('chat.js: Supabase fallback results:', { 
          businessCount: businesses?.length || 0, 
          serviceCount: services?.length || 0,
          bizError: bizError?.message,
          svcError: svcError?.message
        });
        
        dbContext.businesses = businesses || [];
        dbContext.services = services || [];
      }
    } catch (fallbackError) {
      console.error('chat.js: Supabase fallback also failed:', fallbackError);
    }
  }
  
  return dbContext;
}

// Check if user message contains complete booking information
function hasCompleteBookingInfo(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Check for required fields - support both user input format and assistant response format
  const hasName = /(?:name is|i'm|i am)\s+([a-zA-Z\s]+)/i.test(userMessage) || /•\s*\*\*name:\*\*\s*([a-zA-Z\s]+)/i.test(userMessage);
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
  // Try user input format first
  let nameMatch = userMessage.match(/(?:name is|i'm|i am)\s+([a-zA-Z\s]+)/i);
  let emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  let phoneMatch = userMessage.match(/(\+?[\d\s\-\(\)]{10,})/);
  let serviceMatch = userMessage.match(/(haircut|consultation|basic service|diqka tjeter)/i);
  let businessMatch = userMessage.match(/(lerdi salihi|nike|sample business|my business|filan fisteku|business test)/i);
  let dateMatch = userMessage.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);
  let timeMatch = userMessage.match(/(\d{1,2}:?\d{0,2}\s*(am|pm))/i);
  
  // If no name found in user format, try assistant response format
  if (!nameMatch) {
    nameMatch = userMessage.match(/•\s*\*\*name:\*\*\s*([a-zA-Z\s]+)/i);
  }
  
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
        requiresConfirmation: true,
        nextStep: 'confirmation'
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
    console.log('handleBookingConfirmation: Starting confirmation process');
    console.log('handleBookingConfirmation: Booking data:', JSON.stringify(bookingData, null, 2));
    
    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    console.log('handleBookingConfirmation: User message:', userMessage);
    
    if (userMessage.includes('yes') || userMessage.includes('confirm') || userMessage.includes('book')) {
      console.log('handleBookingConfirmation: User confirmed, creating appointment...');
      // Create appointment in Supabase via MCP
      const appointmentId = await createAppointment(bookingData);
      console.log('handleBookingConfirmation: Appointment ID:', appointmentId);
      
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

// Parse appointment date from day name and time
function parseAppointmentDate(dayName, time) {
  try {
    // Get the next occurrence of the specified day
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) {
      throw new Error(`Invalid day name: ${dayName}`);
    }
    
    // Calculate days until the target day
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7; // Next week
    }
    
    // Create the target date
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    // Parse the time
    const timeMatch = time.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)/i);
    if (!timeMatch) {
      throw new Error(`Invalid time format: ${time}`);
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const ampm = timeMatch[3].toLowerCase();
    
    // Convert to 24-hour format
    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
    
    // Set the time
    targetDate.setHours(hours, minutes, 0, 0);
    
    return targetDate.toISOString();
  } catch (error) {
    console.error('Error parsing appointment date:', error);
    // Fallback to current date + 1 day
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    fallbackDate.setHours(10, 0, 0, 0);
    return fallbackDate.toISOString();
  }
}

// Create appointment in Supabase
async function createAppointment(bookingData) {
  let appointmentData = null;
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

    // Get or create customer
    const customerId = await getOrCreateCustomer(bookingData);
    if (!customerId) {
      throw new Error('Failed to create customer');
    }

    // Get employee_id for the business
    const employeeId = await getEmployeeId(businessId);
    if (!employeeId) {
      throw new Error('No employee found for business');
    }

    // Create appointment record
    appointmentData = {
      id: randomUUID(),
      business_id: businessId,
      service_id: serviceId,
      customer_id: customerId,
      employee_id: employeeId,
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      date: parseAppointmentDate(bookingData.date, bookingData.time),
      duration: 30, // Default duration, could be fetched from service
      status: 'scheduled',
      reminder_sent: false,
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
    console.log('MCP upsert result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('MCP upsert error:', result.error);
      throw new Error(result.error.message);
    }

    console.log('Appointment created successfully:', appointmentData.id);
    return appointmentData.id;
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (appointmentData) {
      console.error('Appointment data that failed:', JSON.stringify(appointmentData, null, 2));
    } else {
      console.error('Failed before appointment data was created');
    }
    return null;
  }
}

// Get business_id from business name
async function getBusinessId(businessName) {
  try {
    // Use the business mapping we already have
    const businessMap = {
      'lerdi salihi': 'c7aac928-b5dd-407e-90d5-3621f18fede1',
      'nike': '8632da60-830e-4df1-9f64-3e60d274bcb5',
      'sample business': '550e8400-e29b-41d4-a716-446655440000',
      'my business': '8632da60-830e-4df1-9f64-3e60d274bcb5',
      'filan fisteku': 'd5319a6d-a78f-4a56-b288-aa123da023af',
      'business test': '9cd05682-b03d-4bff-80b2-4c623dd7fd0a',
      'bussiness test': '9cd05682-b03d-4bff-80b2-4c623dd7fd0a'
    };
    
    const businessId = businessMap[businessName.toLowerCase()];
    if (!businessId) {
      throw new Error(`Business "${businessName}" not found in mapping`);
    }
    
    console.log(`Found business ID for "${businessName}": ${businessId}`);
    return businessId;
  } catch (error) {
    console.error('Error getting business ID:', error);
    return null;
  }
}

// Get service_id from service name and business_id
async function getServiceId(serviceName, businessId) {
  try {
    console.log(`Looking for service "${serviceName}" for business ID: ${businessId}`);
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
    console.log('Service lookup result:', JSON.stringify(result, null, 2));
    
    if (result.result?.content?.[0]?.json?.[0]) {
      const serviceId = result.result.content[0].json[0].id;
      console.log(`Found service ID: ${serviceId}`);
      return serviceId;
    }
    
    console.log('No service found with exact name match, trying case-insensitive search...');
    
    // Try case-insensitive search
    const response2 = await fetch(mcpUrl, {
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
              business_id: businessId
            }
          }
        }
      })
    });

    const result2 = await response2.json();
    console.log('All services for business:', JSON.stringify(result2, null, 2));
    
    if (result2.result?.content?.[0]?.json) {
      const services = result2.result.content[0].json;
      const matchingService = services.find(service => 
        service.name.toLowerCase().includes(serviceName.toLowerCase()) ||
        serviceName.toLowerCase().includes(service.name.toLowerCase())
      );
      
      if (matchingService) {
        console.log(`Found matching service: ${matchingService.name} (ID: ${matchingService.id})`);
        return matchingService.id;
      }
    }
    
    console.log('No matching service found');
    return null;
  } catch (error) {
    console.error('Error getting service ID:', error);
    return null;
  }
}

// Get or create customer
async function getOrCreateCustomer(bookingData) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    
    // First, try to find existing customer by email
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
            table: 'customers',
            eq: { 
              email: bookingData.email
            }
          }
        }
      })
    });

    const result = await response.json();
    console.log('Customer lookup result:', JSON.stringify(result, null, 2));
    
    if (result.result?.content?.[0]?.json?.[0]) {
      const customerId = result.result.content[0].json[0].id;
      console.log(`Found existing customer: ${customerId}`);
      return customerId;
    }
    
    // If no existing customer, create a new one
    console.log('No existing customer found, creating new customer...');
    const newCustomerData = {
      id: randomUUID(),
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      created_at: new Date().toISOString()
    };

    const createResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'upsert-rows',
          arguments: {
            table: 'customers',
            rows: [newCustomerData]
          }
        }
      })
    });

    const createResult = await createResponse.json();
    console.log('Customer creation result:', JSON.stringify(createResult, null, 2));
    
    if (createResult.error) {
      throw new Error(createResult.error.message);
    }
    
    console.log(`Created new customer: ${newCustomerData.id}`);
    return newCustomerData.id;
  } catch (error) {
    console.error('Error getting or creating customer:', error);
    return null;
  }
}

// Get employee_id for a business
async function getEmployeeId(businessId) {
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
            table: 'employees',
            eq: { 
              business_id: businessId
            }
          }
        }
      })
    });

    const result = await response.json();
    console.log('Employee lookup result:', JSON.stringify(result, null, 2));
    
    if (result.result?.content?.[0]?.json?.[0]) {
      const employeeId = result.result.content[0].json[0].id;
      console.log(`Found employee ID: ${employeeId}`);
      return employeeId;
    }
    
    console.log('No employee found for business');
    return null;
  } catch (error) {
    console.error('Error getting employee ID:', error);
    return null;
  }
}

// Send confirmation notifications using the same methods as appointment form
async function sendConfirmationNotifications(bookingData, appointmentId) {
  try {
    // Parse the date to proper format
    const appointmentDate = parseAppointmentDate(bookingData.date, bookingData.time);
    const dateObj = new Date(appointmentDate);
    const dateString = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeString = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create cancel link
    const cancelLink = `https://appointly-ks.netlify.app/cancel/${appointmentId}`;

    // Send email notification using the exact same function as appointment form
    try {
      const emailSent = await fetch('https://appointly-ks.netlify.app/.netlify/functions/send-appointment-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_name: bookingData.name,
          to_email: bookingData.email,
          appointment_date: dateString,
          appointment_time: timeString,
          business_name: bookingData.business,
          service_name: bookingData.service,
          cancel_link: cancelLink
        })
      });

      const emailResult = await emailSent.json();
      
      if (emailResult.success) {
        console.log('✅ Email notification sent successfully:', emailResult.messageId);
      } else {
        console.log('⚠️ Email notification failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
    }

    // Send SMS notification using the frontend SMS service  
    try {
      const smsMessage = `Hi ${bookingData.name}! Your ${bookingData.service} appointment is confirmed for ${dateString} at ${timeString}. Reply STOP to cancel.`;
      
      const smsResponse = await fetch('https://appointly-ks.netlify.app/.netlify/functions/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: bookingData.phone,
          message: smsMessage
        })
      });

      if (smsResponse.ok) {
        const smsData = await smsResponse.json();
        if (smsData.success) {
          console.log('✅ SMS notification sent successfully');
        } else {
          console.log('⚠️ SMS notification failed:', smsData.error);
        }
      } else {
        console.log('⚠️ SMS notification failed:', await smsResponse.text());
      }
    } catch (smsError) {
      console.error('❌ SMS notification failed:', smsError);
    }

    console.log('Notification process completed for appointment:', appointmentId);
  } catch (error) {
    console.error('Error in notification system:', error);
    // Don't fail the booking if notifications fail
  }
}

// Get available times for businesses mentioned in conversation
async function getAvailableTimesForContext(messages, dbContext) {
  try {
    // Look for business names mentioned in recent messages
    const recentMessages = messages.slice(-5).map(m => m.content).join(' ');
    const businessMatches = recentMessages.match(/(lerdi salihi|nike|sample business|my business|filan fisteku|business test)/gi);
    
    if (!businessMatches) {
      return 'No specific business mentioned - available times will be shown when you select a business.';
    }
    
    const businessName = businessMatches[0].toLowerCase();
    const businessIds = {
      'lerdi salihi': 'c7aac928-b5dd-407e-90d5-3621f18fede1',
      'nike': 'business-id-2',
      'sample business': 'business-id-3',
      'my business': 'business-id-4',
      'filan fisteku': 'business-id-5',
      'business test': 'business-id-6'
    };
    
    const businessId = businessIds[businessName];
    if (!businessId) {
      return 'Business not found in our system.';
    }
    
    // Get today's date for available times
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Fetch business settings to get working hours
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'query-rows',
          arguments: {
            table: 'business_settings',
            where: { business_id: businessId }
          }
        }
      })
    });
    
    const result = await response.json();
    const businessSettings = result?.result?.rows?.[0];
    
    if (!businessSettings?.working_hours) {
      return `${businessName} - Working hours not configured yet.`;
    }
    
    // Get today's working hours
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = businessSettings.working_hours.find(wh => wh.day === dayOfWeek);
    
    if (!todayHours || todayHours.isClosed) {
      return `${businessName} is closed today (${dayOfWeek}).`;
    }
    
    // Generate available time slots (simplified version)
    const availableTimes = generateSimpleTimeSlots(todayHours.open, todayHours.close);
    
    return `${businessName} is available today (${dayOfWeek}) from ${todayHours.open} to ${todayHours.close}. Available slots: ${availableTimes.slice(0, 8).join(', ')}${availableTimes.length > 8 ? '...' : ''}`;
    
  } catch (error) {
    console.error('Error getting available times for context:', error);
    return 'Checking availability...';
  }
}

// Generate simple time slots between open and close times
function generateSimpleTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  const open = new Date();
  open.setHours(openHour, openMinute, 0, 0);
  
  const close = new Date();
  close.setHours(closeHour, closeMinute, 0, 0);
  
  let current = new Date(open);
  
  while (current < close) {
    const timeStr = current.toTimeString().slice(0, 5);
    const hour = current.getHours();
    const minute = current.getMinutes();
    
    // Format as 12-hour time
    const displayTime = current.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    slots.push(displayTime);
    current.setMinutes(current.getMinutes() + 30); // 30-minute slots
  }
  
  return slots;
}

// Mock AI Service for fallback
async function getMockAIResponse(messages, context) {
  const userMessage = messages[messages.length - 1]?.content || '';
  const businessName = context?.businessName || 'our business';
  const services = context?.services || [];
  const availableTimes = context?.availableTimes || [];
  
  // Debug logging
  console.log('getMockAIResponse - received context:', {
    businessCount: context?.businesses?.length || 0,
    serviceCount: context?.services?.length || 0,
    businessNames: context?.businesses?.map(b => b.name) || [],
    contextKeys: Object.keys(context || {})
  });
  
  // Simple mock AI logic
  const message = userMessage.toLowerCase();
  
  // Greeting
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(message)) {
    // Get businesses from context
    const businesses = context?.businesses || [];
    console.log('getMockAIResponse - greeting businesses:', businesses.length, businesses.map(b => b.name));
    
    const businessList = businesses.length > 0 
      ? businesses.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}${b.description ? ' - ' + b.description : ''}`).join('\n')
      : 'No businesses found. Please contact support.';
    
    return `Hello! Welcome to Appointly. I'm here to help you book an appointment with one of our businesses.

**Available Businesses:**
${businessList}

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
    
    // Get available times for this business
    const businessTimesContext = await getAvailableTimesForContext([{content: userMessage}], {});
    
    return `Great choice! ${businessName} is one of our available businesses.

${businessTimesContext}

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
    
    // First check if this is a confirmation response (user said yes/no to booking)
    const userMessageLower = userMessage.toLowerCase();
    if ((userMessageLower.includes('yes') || userMessageLower.includes('no')) && messages.length > 1) {
      console.log('chat.js: Confirmation response detected, looking for booking details');
      
      // Look for AI confirmation message that contains appointment details
      const previousMessages = messages.slice(0, -1);
      for (let i = previousMessages.length - 1; i >= 0; i--) {
        const msg = previousMessages[i].content;
        console.log('chat.js: Checking message', i, 'for appointment details');
        
        // Check if this is an AI confirmation message with appointment details
        if (msg.includes('**Appointment Details:**') && msg.includes('**Please confirm:**')) {
          console.log('chat.js: Found AI confirmation message, extracting booking data');
          
          // Extract booking data from the AI's confirmation message
          const businessMatch = msg.match(/\*\*Business:\*\* ([^\n]+)/);
          const serviceMatch = msg.match(/\*\*Service:\*\* ([^\n]+)/);
          const dateMatch = msg.match(/\*\*Date:\*\* ([^\n]+)/);
          const timeMatch = msg.match(/\*\*Time:\*\* ([^\n]+)/);
          const nameMatch = msg.match(/\*\*Name:\*\* ([^\n]+)/);
          const emailMatch = msg.match(/\*\*Email:\*\* ([^\n]+)/);
          const phoneMatch = msg.match(/\*\*Phone:\*\* ([^\n]+)/);
          
          if (businessMatch && serviceMatch && dateMatch && timeMatch && nameMatch && emailMatch && phoneMatch) {
            const bookingInfo = {
              business: businessMatch[1].trim(),
              service: serviceMatch[1].trim(),
              date: dateMatch[1].trim(),
              time: timeMatch[1].trim(),
              name: nameMatch[1].trim(),
              email: emailMatch[1].trim(),
              phone: phoneMatch[1].trim()
            };
            
            console.log('chat.js: Extracted booking info from confirmation:', bookingInfo);
            return await handleBookingConfirmation(messages, bookingInfo, headers);
          }
        }
        
        // Fallback: check for complete booking info in user messages
        const hasComplete = hasCompleteBookingInfo(msg);
        if (hasComplete) {
          console.log('chat.js: Found booking info in previous message, processing confirmation');
          const bookingInfo = extractBookingInfo(msg);
          console.log('chat.js: Extracted booking info:', bookingInfo);
          return await handleBookingConfirmation(messages, bookingInfo, headers);
        }
      }
      
      console.log('chat.js: No booking data found in confirmation flow');
    }
    
    // Then check if user message contains complete booking information
    console.log('chat.js: Checking for complete booking info in message:', userMessage);
    const hasComplete = hasCompleteBookingInfo(userMessage);
    console.log('chat.js: Has complete booking info:', hasComplete);
    
    if (hasComplete) {
      console.log('chat.js: Complete booking info detected, generating BOOKING_READY response');
      const bookingInfo = extractBookingInfo(userMessage);
      console.log('chat.js: Extracted booking info:', bookingInfo);
      const bookingReadyMessage = `BOOKING_READY: ${JSON.stringify(bookingInfo)}`;
      return await handleBookingReady(bookingReadyMessage, headers);
    }
    
    // Prefer Groq if available; else OpenAI; else mock
    const useGroq = Boolean(process.env.GROQ_API_KEY);
    const useOpenAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_OPENAI !== 'false';
    console.log('chat.js provider flags => useGroq:', useGroq, 'useOpenAI:', useOpenAI);
    
    if (!useGroq && !useOpenAI) {
      // Use mock AI service as fallback - pass the real dbContext with businesses
      const contextWithBusinesses = {
        ...chatContext,
        businesses: dbContext.businesses,
        services: dbContext.services
      };
      console.log('chat.js: Passing context to mock AI:', {
        businessCount: contextWithBusinesses.businesses?.length || 0,
        businessNames: contextWithBusinesses.businesses?.map(b => b.name) || []
      });
      const mockResponse = await getMockAIResponse(messages, contextWithBusinesses);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: mockResponse,
          provider: 'mock',
          note: 'Using mock AI service. Set OPENAI_API_KEY and USE_OPENAI=true to use OpenAI.',
          context: {
            businesses: dbContext.businesses.length,
            services: dbContext.services.length
          }
        })
      };
    }

    // Try Groq first
    if (useGroq) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

      // Debug Groq context
      console.log('chat.js: Groq section - dbContext businesses:', {
        count: dbContext.businesses.length,
        names: dbContext.businesses.map(b => b.name)
      });

      // Create system prompt with booking context and MCP knowledge
      const servicesByBiz = dbContext.services.map(s => `- ${s.name} ($${s.price}, ${s.duration} min)`).slice(0, 50).join('\n');
      const businessList = dbContext.businesses.length > 0
        ? dbContext.businesses.map((b, i) => `${i + 1}. ${b.name}${b.description ? ' - ' + b.description : ''}`).slice(0, 25).join('\n')
        : 'No businesses found in database. Please add businesses via the admin panel.';
      
      console.log('chat.js: Groq businessList:', businessList);
      
      const knowledgeContext = dbContext.knowledge.length > 0 ? 
        `\nRELEVANT KNOWLEDGE BASE INFORMATION:\n${dbContext.knowledge.map(k => `- ${k.content} (Source: ${k.source})`).join('\n')}\n\n` : '';
      
      // Get available times for businesses mentioned in recent messages
      const availableTimesContext = await getAvailableTimesForContext(messages, dbContext);
      
      const systemPrompt = `You are a professional booking assistant for Appointly. You help customers book appointments with a friendly, structured approach.

CRITICAL INSTRUCTION: When a customer provides ALL booking details (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY JSON format. Do not ask for confirmation or summarize. Just output the JSON.

BUSINESSES AVAILABLE:
${businessList || 'No businesses found.'}

SERVICES AVAILABLE:
${servicesByBiz || 'No services found.'}

AVAILABLE TIME SLOTS:
${availableTimesContext}

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
    
    // Create business list from database
    const businessList = dbContext.businesses.length > 0
      ? dbContext.businesses.map((b, i) => `${i + 1}. ${b.name}${b.description ? ' - ' + b.description : ''}`).slice(0, 25).join('\n')
      : 'No businesses found in database. Please add businesses via the admin panel.';
    
    const knowledgeContext = dbContext.knowledge.length > 0 ? 
      `\nRELEVANT KNOWLEDGE BASE INFORMATION:\n${dbContext.knowledge.map(k => `- ${k.content} (Source: ${k.source})`).join('\n')}\n\n` : '';
    
    // Get available times for businesses mentioned in recent messages
    const availableTimesContext = await getAvailableTimesForContext(messages, dbContext);
    
    const systemPrompt = `You are a professional booking assistant for Appointly. You help customers book appointments with a friendly, structured approach.

CRITICAL INSTRUCTION: When a customer provides ALL booking details (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY JSON format. Do not ask for confirmation or summarize. Just output the JSON.

BUSINESSES AVAILABLE:
${businessList || 'No businesses found.'}

SERVICES AVAILABLE:
${servicesByBiz || 'No services found.'}

AVAILABLE TIME SLOTS:
${availableTimesContext}

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
