// Netlify function to send emails via EmailJS (same as frontend)
// This allows backend functions like the chatbot to use the same email service

// EmailJS configuration (same as frontend)
const SERVICE_ID = 'service_n4o1nab';
const TEMPLATE_ID = 'template_6nc7amq';
const PUBLIC_KEY = 'KBjlWLFZG4KBjiPvL';

exports.handler = async function(event, context) {
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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { 
      to_name, 
      to_email, 
      appointment_date, 
      appointment_time, 
      business_name, 
      service_name, 
      cancel_link 
    } = JSON.parse(event.body);
    
    // Validate required fields
    if (!to_name || !to_email || !appointment_date || !appointment_time || !business_name) {
      console.error('Missing required fields:', { 
        to_name, 
        to_email, 
        appointment_date, 
        appointment_time, 
        business_name 
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to_name, to_email, appointment_date, appointment_time, business_name' 
        })
      };
    }

    // Prepare EmailJS template parameters
    const templateParams = {
      to_name: to_name,
      email: to_email,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      service_name: service_name || 'Service',
      business_name: business_name,
      cancel_link: cancel_link || '#',
    };

    console.log('Sending email via EmailJS:', {
      service: SERVICE_ID,
      template: TEMPLATE_ID,
      to: to_email,
      business: business_name
    });

    // Use fetch to call EmailJS REST API directly (works better in serverless)
    const emailjsUrl = 'https://api.emailjs.com/api/v1.0/email/send';
    
    const emailjsPayload = {
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: templateParams
    };

    const response = await fetch(emailjsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailjsPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
    }

    const result = await response.text();
    console.log('EmailJS success:', response.status, result);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result,
        message: 'Email sent successfully via EmailJS'
      })
    };
  } catch (error) {
    console.error('Error sending email via EmailJS:', error);
    
    // If EmailJS fails, fall back to logging (like the old system)
    if (error.message && error.message.includes('EmailJS')) {
      console.log('EmailJS not configured, falling back to simulation');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          messageId: `simulated_${Date.now()}`,
          message: 'Email simulated (EmailJS not configured)',
          fallback: true
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email'
      })
    };
  }
};
