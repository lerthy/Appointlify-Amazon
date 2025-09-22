// Netlify function to send emails via EmailJS (same as frontend)
// This allows backend functions like the chatbot to use the same email service

const emailjs = require('@emailjs/nodejs');

// EmailJS configuration (same as frontend)
const SERVICE_ID = 'service_n4o1nab';
const TEMPLATE_ID = 'template_6nc7amq';
const PUBLIC_KEY = 'KBjlWLFZG4KBjiPvL';
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY; // Set this in Netlify environment

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

    // Send email via EmailJS
    const result = await emailjs.send(
      SERVICE_ID, 
      TEMPLATE_ID, 
      templateParams, 
      {
        publicKey: PUBLIC_KEY,
        privateKey: PRIVATE_KEY
      }
    );

    console.log('EmailJS success:', result.status, result.text);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result.text,
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
