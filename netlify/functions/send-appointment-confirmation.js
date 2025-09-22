// Netlify function that replicates the exact sendAppointmentConfirmation function from the frontend
// This allows backend functions to use the same email service as the appointment form

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
      cancel_link,
      service_name 
    } = JSON.parse(event.body);
    
    // Validate required fields (same as frontend)
    if (!to_name || !to_email || !appointment_date || !appointment_time || !business_name || !cancel_link) {
      console.error('Missing required fields:', { 
        to_name, 
        to_email, 
        appointment_date, 
        appointment_time, 
        business_name,
        cancel_link 
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to_name, to_email, appointment_date, appointment_time, business_name, cancel_link' 
        })
      };
    }

    // Use the EXACT same EmailJS configuration as frontend
    const SERVICE_ID = 'service_n4o1nab';
    const TEMPLATE_ID = 'template_6nc7amq';
    const PUBLIC_KEY = 'KBjlWLFZG4KBjiPvL';

    // Prepare template params EXACTLY like the frontend
    const templateParams = {
      to_name: to_name,
      email: to_email,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      service_name: service_name || '',
      business_name: business_name,
      cancel_link: cancel_link,
    };

    console.log('Sending appointment confirmation email:', {
      to: to_email,
      business: business_name,
      service: service_name
    });

    // Call EmailJS API exactly like the frontend does
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
      console.error('EmailJS API error:', response.status, errorText);
      return {
        statusCode: 200, // Don't fail the booking
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: `EmailJS error: ${response.status}`,
          details: errorText
        })
      };
    }

    const result = await response.text();
    console.log('✅ Email sent successfully:', result);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result,
        message: 'Appointment confirmation email sent successfully'
      })
    };
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    
    return {
      statusCode: 200, // Don't fail the booking
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send appointment confirmation email'
      })
    };
  }
};
