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


    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
      body: JSON.stringify(mcpRequest)
    });

    if (!response.ok) {

      return [];
    }

    const result = await response.json();

    // Handle MCP errors gracefully
    if (result.error) {

      if (result.error.message.includes('quota') || result.error.message.includes('billing')) {

      }
      return [];
    }

    const knowledge = result.result?.content?.[0]?.json || [];

    return knowledge;
  } catch (error) {
    console.error('chat.js: MCP query error:', error);
    return [];
  }
}

// Enhanced context fetching with MCP integration
async function getEnhancedContext(chatContext, messages = []) {
  let dbContext = { businesses: [], services: [], knowledge: [] };

  // Note: We no longer restrict to frontend business context exclusively
  // This allows the AI to see all businesses when asked about available businesses
  let currentBusinessContext = null;
  if (chatContext?.businessName && chatContext?.services) {

    currentBusinessContext = {
      name: chatContext.businessName,
      id: chatContext.businessId,
      services: chatContext.services || []
    };
  }

  // If no frontend context, try to detect business from user message using MCP
  const userMessage = messages[messages.length - 1]?.content || '';


  // First get all businesses via MCP to check against user message
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';
    const businessResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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
    });

    const businessResult = await businessResponse.json();
    if (!businessResult.error && businessResult.result?.content?.[0]?.json) {
      const businesses = businessResult.result.content[0].json;

      // Look for business name mentions in user message
      const mentionedBusiness = businesses.find(business =>
        userMessage.toLowerCase().includes(business.name.toLowerCase())
      );

      if (mentionedBusiness) {


        // Fetch services for this specific business via MCP
        const servicesResponse = await fetch(mcpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.MCP_API_KEY
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'fetch-table',
              arguments: {
                table: 'services',
                select: 'id, name, price, duration, description, business_id',
                eq: { business_id: mentionedBusiness.id }
              }
            }
          })
        });

        const servicesResult = await servicesResponse.json();
        if (!servicesResult.error && servicesResult.result?.content?.[0]?.json) {
          dbContext.businesses = [mentionedBusiness];
          dbContext.services = servicesResult.result.content[0].json;

          return dbContext;
        }
      }
    }
  } catch (e) {
    console.error('chat.js: Error detecting business via MCP:', e);
  }

  // Fetch live business/services context using MCP integration

  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';

    // Fetch businesses from users table and services
    const [businessResponse, servicesResponse] = await Promise.all([
      fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.MCP_API_KEY
        },
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
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.MCP_API_KEY
        },
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
    } else {

    }

    if (!servicesResult.error && servicesResult.result?.content?.[0]?.json) {
      dbContext.services = servicesResult.result.content[0].json;

    }

  } catch (e) {
    console.error('chat.js: MCP fetch failed:', e);

    // Fallback to direct Supabase if MCP fails

    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

        const [{ data: businesses, error: bizError }, { data: services, error: svcError }] = await Promise.all([
          sb.from('users').select('id, name, description, logo').limit(50),
          sb.from('services').select('id, name, price, duration, description, business_id').limit(200)
        ]);

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
  const hasService = /(?:haircut|consultation|basic service|diqka tjeter|service|appointment)/i.test(userMessage);
  const hasBusiness = /\b(business|salon|clinic|shop|store|company)\b/i.test(userMessage) || userMessage.length > 10; // More flexible business detection
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
  let serviceMatch = userMessage.match(/(haircut|consultation|basic service|diqka tjeter|service|appointment)/i);
  let businessMatch = userMessage.match(/\b([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+(?:\s+(?:business|salon|clinic|shop|store|company))?)\b/i); // Flexible business name detection
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


    // Ask for confirmation
    const confirmationMessage = `I have all the details for your appointment. 

**Appointment Details:**
**Business:** ${bookingData.business}
**Service:** ${bookingData.service}
**Date:** ${bookingData.date}
**Time:** ${bookingData.time}
**Name:** ${bookingData.name}
**Email:** ${bookingData.email}
**Phone:** ${bookingData.phone}

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

    const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';


    if (userMessage.includes('yes') || userMessage.includes('confirm') || userMessage.includes('book')) {

      // Create appointment in Supabase via MCP
      const appointmentId = await createAppointment(bookingData);


      if (appointmentId) {
        // Send confirmation email and SMS
        await sendConfirmationNotifications(bookingData, appointmentId);

        const successMessage = `✅ **Appointment Confirmed!**

Your appointment has been successfully booked. You will receive a confirmation email and SMS with all the details shortly.

If you need to make any changes, please contact us.

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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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
      console.error('MCP upsert error:', result.error);
      throw new Error(result.error.message);
    }


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

// Get business_id from business name using MCP
async function getBusinessId(businessName) {
  try {
    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'fetch-table',
          arguments: {
            table: 'users',
            select: 'id, name',
            limit: 100
          }
        }
      })
    });

    const result = await response.json();
    if (result.result?.content?.[0]?.json) {
      const businesses = result.result.content[0].json;
      // 1) Exact match
      let matched = businesses.find(b =>
        (b.name || '').toLowerCase() === (businessName || '').toLowerCase()
      );
      // 2) Case-insensitive partial match
      if (!matched) {
        matched = businesses.find(b =>
          (b.name || '').toLowerCase().includes((businessName || '').toLowerCase())
        );
      }
      // 3) Fallback heuristics for known demo labels
      if (!matched) {
        const normalized = (businessName || '').toLowerCase();
        if (normalized.includes('home') && normalized.includes('service')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('home')) || null;
        } else if (normalized.includes('fitness')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('fitness')) || null;
        } else if (normalized.includes('tutor') || normalized.includes('education')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('tutor')) || null;
        } else if (normalized.includes('beauty') || normalized.includes('salon') || normalized.includes('spa')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('salon') || (b.name || '').toLowerCase().includes('spa')) || null;
        } else if (normalized.includes('clinic') || normalized.includes('medical') || normalized.includes('dental')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('clinic') || (b.name || '').toLowerCase().includes('dental')) || null;
        } else if (normalized.includes('consult')) {
          matched = businesses.find(b => (b.name || '').toLowerCase().includes('consult')) || null;
        }
      }

      if (matched) {

        return matched.id;
      }
    }

    throw new Error(`Business "${businessName}" not found in database`);
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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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
      const serviceId = result.result.content[0].json[0].id;

      return serviceId;
    }



    // Try case-insensitive search
    const response2 = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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


    if (result2.result?.content?.[0]?.json) {
      const services = result2.result.content[0].json;
      const matchingService = services.find(service =>
        service.name.toLowerCase().includes(serviceName.toLowerCase()) ||
        serviceName.toLowerCase().includes(service.name.toLowerCase())
      );

      if (matchingService) {
        return matchingService.id;
      }
    }
    
    
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
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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

    
    if (result.result?.content?.[0]?.json?.[0]) {
      const customerId = result.result.content[0].json[0].id;
      
      return customerId;
    }
    
    // If no existing customer, create a new one
    
    const newCustomerData = {
      id: randomUUID(),
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      created_at: new Date().toISOString()
    };

    const createResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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

    
    if (createResult.error) {
      throw new Error(createResult.error.message);
    }
    
    
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
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.MCP_API_KEY
      },
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

    
    if (result.result?.content?.[0]?.json?.[0]) {
      const employeeId = result.result.content[0].json[0].id;
      
      return employeeId;
    }
    
    
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
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.MCP_API_KEY
            },
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

          } else {

          }
        } catch (emailError) {
          console.error('❌ Email notification failed:', emailError);
        }

        // Send SMS notification using the frontend SMS service  
        try {
          const smsMessage = `Hi ${bookingData.name}! Your ${bookingData.service} appointment is confirmed for ${dateString} at ${timeString}. Reply STOP to cancel.`;

          const smsResponse = await fetch('https://appointly-ks.netlify.app/.netlify/functions/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.MCP_API_KEY
            },
            body: JSON.stringify({
              to: bookingData.phone,
              message: smsMessage
            })
          });

          if (smsResponse.ok) {
            const smsData = await smsResponse.json();
            if (smsData.success) {

            } else {

            }
          } else {
          }
        } catch (smsError) {
          console.error('❌ SMS notification failed:', smsError);
        }


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
        const businessMatches = recentMessages.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:business|salon|clinic|shop|store|company))?)\b/gi);

        if (!businessMatches) {
          return 'No specific business mentioned - available times will be shown when you select a business.';
        }

        const businessName = businessMatches[0];

        // Get business ID dynamically via MCP
        const businessId = await getBusinessId(businessName);
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
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.MCP_API_KEY
          },
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

      // Business selection - more flexible pattern matching
      const businessNameMatch = userMessage.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:business|salon|clinic|shop|store|company))?)\b/i);
      if (businessNameMatch) {
        const businessName = businessNameMatch[0];

        // Get available times for this business
        const businessTimesContext = await getAvailableTimesForContext([{ content: userMessage }], {});

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
      // Log function invocation immediately - this should always run
      try {

      } catch (logError) {
        // Even logging can fail, but we continue
        console.error('Failed to log initial info:', logError);
      }

      // Security headers with proper CORS
      const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
      const allowedOrigins = [
        'https://appointly-ks.netlify.app',
        'https://appointly-qa.netlify.app',
        'http://localhost:5173',
        'http://localhost:5000'
      ];
      const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];



      const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Type': 'application/json'
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

      // Validate request body
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Request body is required'
          })
        };
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(event.body);
      } catch (parseError) {
        console.error('chat.js: Failed to parse request body:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
            details: parseError.message
          })
        };
      }

      const { messages, context: chatContext } = parsedBody;

      // Validate messages
      if (!Array.isArray(messages) || messages.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Messages must be a non-empty array'
          })
        };
      }

      try {
    // Get enhanced context with MCP integration

        let dbContext;
        try {
          dbContext = await getEnhancedContext(chatContext || {}, messages);
        } catch (contextError) {
          console.error('chat.js: Error getting enhanced context:', contextError);
          // Use empty context if getEnhancedContext fails
          dbContext = { businesses: [], services: [], knowledge: [] };
        }


        // Query MCP knowledge base for relevant information
        const userMessage = messages[messages.length - 1]?.content || '';
        try {
          const knowledge = await queryMCPKnowledge(userMessage, 3);
          dbContext.knowledge = knowledge || [];
        } catch (knowledgeError) {
          console.error('chat.js: Error querying MCP knowledge:', knowledgeError);
          dbContext.knowledge = []; // Continue without knowledge if query fails
        }

        // First check if this is a confirmation response (user said yes/no to booking)
        const userMessageLower = userMessage.toLowerCase();
        if ((userMessageLower.includes('yes') || userMessageLower.includes('no')) && messages.length > 1) {


          // Look for AI confirmation message that contains appointment details
          const previousMessages = messages.slice(0, -1);
          for (let i = previousMessages.length - 1; i >= 0; i--) {
            const msg = previousMessages[i].content;


            // Check if this is an AI confirmation message with appointment details
            if (msg.includes('**Appointment Details:**') && msg.includes('**Please confirm:**')) {


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


                return await handleBookingConfirmation(messages, bookingInfo, headers);
              }
            }

            // Fallback: check for complete booking info in user messages
            const hasComplete = hasCompleteBookingInfo(msg);
            if (hasComplete) {

              const bookingInfo = extractBookingInfo(msg);

              return await handleBookingConfirmation(messages, bookingInfo, headers);
            }
          }


        }

        // Then check if user message contains complete booking information

        const hasComplete = hasCompleteBookingInfo(userMessage);


        if (hasComplete) {

          const bookingInfo = extractBookingInfo(userMessage);

          const bookingReadyMessage = `BOOKING_READY: ${JSON.stringify(bookingInfo)}`;
          return await handleBookingReady(bookingReadyMessage, headers);
        }

        // Prefer Groq if available; else OpenAI; else mock
        const useGroq = Boolean(process.env.GROQ_API_KEY);
        const useOpenAI = Boolean(process.env.OPENAI_API_KEY) && process.env.USE_OPENAI !== 'false';


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
          const groqApiKey = process.env.GROQ_API_KEY;
          if (!groqApiKey) {
            console.error('chat.js: GROQ_API_KEY is not set');
            throw new Error('GROQ_API_KEY environment variable is not configured');
          }

          const groq = new Groq({ apiKey: groqApiKey });
          const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

          // Debug Groq context
          console.log('chat.js: Groq section - dbContext businesses:', {
            count: dbContext.businesses.length,
            names: dbContext.businesses.map(b => b.name)
          });



          // Create system prompt with booking context and MCP knowledge
          // Group services by business to show proper associations
          const businessServiceMap = new Map();

          // Initialize map with all businesses
          dbContext.businesses.forEach(business => {
            businessServiceMap.set(business.id, {
              name: business.name,
              description: business.description,
              services: []
            });
          });

          // Add services to their respective businesses
          dbContext.services.forEach(service => {
            if (businessServiceMap.has(service.business_id)) {
              businessServiceMap.get(service.business_id).services.push(service);
            }
          });

          // Create business list with their services
          const businessList = dbContext.businesses.length > 0
            ? Array.from(businessServiceMap.values()).map((bizData, i) => {
              const serviceList = bizData.services.length > 0
                ? bizData.services.map(s => `  - ${s.name} ($${s.price}, ${s.duration} min)`).join('\n')
                : '  - No services available';
              return `${i + 1}. ${bizData.name}${bizData.description ? ' - ' + bizData.description : ''}\n   Services:\n${serviceList}`;
            }).slice(0, 25).join('\n\n')
            : 'No businesses found in database. Please add businesses via the admin panel.';



          const knowledgeContext = dbContext.knowledge.length > 0 ?
            `\nRELEVANT KNOWLEDGE BASE INFORMATION:\n${dbContext.knowledge.map(k => `- ${k.content} (Source: ${k.source})`).join('\n')}\n\n` : '';

          // Get available times for businesses mentioned in recent messages
          let availableTimesContext = '';
          try {
            availableTimesContext = await getAvailableTimesForContext(messages, dbContext);
          } catch (timesError) {
            console.error('chat.js: Error getting available times:', timesError);
            availableTimesContext = 'Checking availability...';
          }

          const systemPrompt = `You are a professional booking assistant for Appointly. You help customers book appointments with a friendly, structured approach.

CRITICAL INSTRUCTION: When a customer provides ALL booking details (name, business, service, date, time, email, phone), you MUST immediately output the BOOKING_READY JSON format. Do not ask for confirmation or summarize. Just output the JSON.

BUSINESSES AND THEIR SERVICES:
${businessList || 'No businesses found.'}

STRICT SERVICE RULES:
1. ONLY use the exact business-service associations shown above
2. NEVER assume or infer that a business offers a service not explicitly listed
3. When asked "which business has X service", ONLY mention businesses that explicitly list that service
4. If a business shows "No services available", it has NO services - do not suggest any
5. Do not mix services between businesses under any circumstances

EXAMPLE:
If only "Lerdi Salihi" shows "asd ($22.97, 30 min)" in their services list, then:
- When asked "which business has asd service?" → Answer: "Only Lerdi Salihi offers the asd service"
- When asked about "Daja" services → Answer: "Daja has no services available" (if their list shows "No services available")

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

          // Validate and prepare messages
          const chatMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.filter(msg => msg && msg.role && msg.content)
          ];





          try {
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

            // Check if this is a booking ready response
            if (assistantMessage.includes('BOOKING_READY:')) {
              return await handleBookingReady(assistantMessage, headers);
            }


            const response = {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: assistantMessage,
                provider: 'groq',
                model: model,
                mcpKnowledgeUsed: dbContext.knowledge.length,
                context: {
                  businesses: dbContext.businesses.length,
                  services: dbContext.services.length,
                  knowledge: dbContext.knowledge.length
                }
              })
            };

            return response;
          } catch (groqError) {
            console.error('chat.js: Groq API error details:', {
              message: groqError.message,
              status: groqError.status,
              statusText: groqError.statusText,
              error: groqError.error,
              stack: groqError.stack
            });

            // If it's an API key error, throw it so we get a clear message
            if (groqError.message?.includes('API key') || groqError.status === 401) {
              throw new Error(`Groq API key error: ${groqError.message || 'Invalid API key'}`);
            }

            // If it's a rate limit, throw it
            if (groqError.status === 429) {
              throw new Error(`Groq rate limit exceeded: ${groqError.message || 'Too many requests'}`);
            }

            // For other errors, log and throw
            throw new Error(`Groq API error: ${groqError.message || 'Unknown error'}`);
          }
        }

        // Initialize OpenAI client

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
        let availableTimesContext = '';
        try {
          availableTimesContext = await getAvailableTimesForContext(messages, dbContext);
        } catch (timesError) {
          console.error('chat.js: Error getting available times:', timesError);
          availableTimesContext = 'Checking availability...';
        }

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

        try {
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
        } catch (openaiError) {
          console.error('chat.js: OpenAI API error:', openaiError);
          // Fall through to mock AI fallback
          throw openaiError;
        }
      } catch (error) {
        console.error('chat.js: Error in chat handler:', error);
        console.error('chat.js: Error stack:', error.stack);

        // Fall back to mock AI service on errors
        try {

          const mockResponse = await getMockAIResponse(messages, chatContext || {});
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: mockResponse,
              provider: 'mock-fallback',
              note: 'Service unavailable, using mock AI service as fallback.',
              error: error.message
            })
          };
        } catch (fallbackError) {
          console.error('chat.js: Fallback error:', fallbackError);
          // Last resort - return a basic response
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "Hello! I'm your AI assistant for Appointly. I can help you book appointments with various businesses. How can I assist you today?",
              provider: 'emergency-fallback',
              note: 'All services unavailable, using emergency fallback.'
            })
          };
        }
      }
    }
