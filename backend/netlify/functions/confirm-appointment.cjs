/**
 * Appointment Confirmation Endpoint
 * Allows customers to confirm their appointments using tokens sent via email/SMS
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!supabase) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Database not configured'
      })
    };
  }

  try {
    // Handle GET request (confirm appointment with token)
    if (event.httpMethod === 'GET') {
      const token = event.queryStringParameters?.token;

      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Confirmation token is required'
          })
        };
      }

      // Find appointment with this token
      const { data: appointment, error: findError } = await supabase
        .from('appointments')
        .select('id, confirmation_status, confirmation_token_expires, customer_id, service_id, business_id, date, name, email')
        .eq('confirmation_token', token)
        .single();

      if (findError || !appointment) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid or expired confirmation token'
          })
        };
      }

      // Check if already confirmed
      if (appointment.confirmation_status === 'confirmed') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Appointment already confirmed',
            alreadyConfirmed: true,
            appointment: {
              id: appointment.id,
              date: appointment.date,
              name: appointment.name
            }
          })
        };
      }

      // Check if token is expired
      if (new Date(appointment.confirmation_token_expires) < new Date()) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Confirmation token has expired. Please contact the business to reschedule.',
            expired: true
          })
        };
      }

      // Confirm the appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          confirmation_status: 'confirmed',
          status: 'confirmed', // Also update the main status
          confirmation_token: null,
          confirmation_token_expires: null
        })
        .eq('id', appointment.id);

      if (updateError) {
        console.error('Error updating appointment confirmation:', updateError);
        throw updateError;
      }

      // Sync to Google Calendar now that appointment is confirmed
      try {
        // Get full appointment details for calendar sync
        const { data: fullAppointment } = await supabase
          .from('appointments')
          .select('id, name, email, phone, date, duration, notes, service_id, employee_id, business_id')
          .eq('id', appointment.id)
          .single();

        if (fullAppointment) {
          console.log('[confirm-appointment] Attempting to sync appointment to Google Calendar:', {
            appointmentId: fullAppointment.id,
            businessId: fullAppointment.business_id
          });
          
          const { createCalendarEvent } = await import('../../services/googleCalendarSync.js');
          const calendarResult = await createCalendarEvent(fullAppointment.business_id, {
            id: fullAppointment.id,
            name: fullAppointment.name,
            email: fullAppointment.email,
            phone: fullAppointment.phone,
            date: fullAppointment.date,
            duration: fullAppointment.duration,
            notes: fullAppointment.notes || null,
            service_id: fullAppointment.service_id,
            employee_id: fullAppointment.employee_id,
          });
          
          if (calendarResult.success) {
            console.log('[confirm-appointment] ✅ Calendar event created successfully:', {
              appointmentId: appointment.id,
              eventId: calendarResult.eventId
            });
          } else {
            console.warn('[confirm-appointment] ⚠️ Calendar sync failed (non-critical):', {
              appointmentId: appointment.id,
              error: calendarResult.error
            });
          }
        }
      } catch (calendarErr) {
        // Log but don't fail the confirmation if calendar sync fails
        console.error('[confirm-appointment] ❌ Calendar sync error (non-critical):', {
          appointmentId: appointment.id,
          error: calendarErr.message,
          stack: calendarErr.stack
        });
      }

      // Get service and business details for confirmation message
      const { data: service } = await supabase
        .from('services')
        .select('name, price, duration')
        .eq('id', appointment.service_id)
        .single();

      const { data: business } = await supabase
        .from('users')
        .select('name, phone, email, business_address')
        .eq('id', appointment.business_id)
        .single();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Appointment confirmed successfully!',
          appointment: {
            id: appointment.id,
            date: appointment.date,
            customerName: appointment.name,
            serviceName: service?.name || 'Service',
            businessName: business?.name || 'Business',
            businessPhone: business?.phone,
            businessEmail: business?.email,
            businessAddress: business?.business_address
          }
        })
      };
    }

    // Handle POST request (get appointment details by token)
    if (event.httpMethod === 'POST') {
      const { token } = JSON.parse(event.body || '{}');

      if (!token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Confirmation token is required'
          })
        };
      }

      // Find appointment with this token
      const { data: appointment, error: findError } = await supabase
        .from('appointments')
        .select(`
          id,
          confirmation_status,
          confirmation_token_expires,
          date,
          name,
          email,
          phone,
          notes,
          duration,
          service_id,
          business_id,
          employee_id
        `)
        .eq('confirmation_token', token)
        .single();

      if (findError || !appointment) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid confirmation token'
          })
        };
      }

      // Check if token is expired
      const isExpired = new Date(appointment.confirmation_token_expires) < new Date();

      // Get related data
      const { data: service } = await supabase
        .from('services')
        .select('name, price, duration, description')
        .eq('id', appointment.service_id)
        .single();

      const { data: business } = await supabase
        .from('users')
        .select('name, phone, email, business_address, logo')
        .eq('id', appointment.business_id)
        .single();

      const { data: employee } = await supabase
        .from('employees')
        .select('name, role')
        .eq('id', appointment.employee_id)
        .single();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          appointment: {
            id: appointment.id,
            confirmationStatus: appointment.confirmation_status,
            isExpired,
            date: appointment.date,
            customerName: appointment.name,
            customerEmail: appointment.email,
            customerPhone: appointment.phone,
            notes: appointment.notes,
            duration: appointment.duration,
            service: service || null,
            business: business || null,
            employee: employee || null
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };

  } catch (error) {
    console.error('Error in confirm-appointment handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

