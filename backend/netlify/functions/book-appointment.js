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
    const { name, service, date, time, email, phone } = JSON.parse(event.body);



    // Here you would integrate with your actual booking system
    // For now, we'll just simulate a successful booking
    const bookingId = `apt_${Date.now()}`;

    // You could integrate with Supabase here for actual database storage
    // const { data, error } = await supabase
    //   .from('appointments')
    //   .insert([{ name, service, date, time, email, phone, booking_id: bookingId }]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bookingId,
        message: `Appointment booked successfully! Your booking ID is ${bookingId}`,
        details: { name, service, date, time, email, phone }
      })
    };
  } catch (error) {
    console.error('Error booking appointment:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to book appointment'
      })
    };
  }
}
