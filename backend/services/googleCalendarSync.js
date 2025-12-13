import { callGoogleCalendar } from './googleCalendarApi.js';
import { fetchCalendarStatus } from './googleTokenStore.js';

/**
 * Create a Google Calendar event for an appointment
 * @param {string} userId - The business owner's user ID (same as business_id)
 * @param {Object} appointment - Appointment data
 * @param {string} appointment.id - Appointment ID
 * @param {string} appointment.name - Customer name
 * @param {string} appointment.email - Customer email
 * @param {string} appointment.phone - Customer phone
 * @param {string} appointment.date - Appointment date/time (ISO string)
 * @param {number} appointment.duration - Duration in minutes
 * @param {string} appointment.notes - Optional notes
 * @param {string} appointment.service_id - Service ID
 * @param {string} appointment.employee_id - Employee ID
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
export async function createCalendarEvent(userId, appointment) {
  try {
    // CRITICAL: Only create calendar events for confirmed appointments
    // Check appointment confirmation status from database
    const { supabase } = await import('../supabaseClient.js');
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('confirmation_status, id')
      .eq('id', appointment.id)
      .single();

    if (!appointmentData) {
      console.warn(`[createCalendarEvent] Appointment ${appointment.id} not found in database`);
      return { success: false, error: 'Appointment not found' };
    }

    if (appointmentData.confirmation_status !== 'confirmed') {
      . Skipping calendar sync.`);
      return { 
        success: false, 
        error: 'Appointment must be confirmed via email before syncing to calendar',
        requiresConfirmation: true
      };
    }
    
    // Check if calendar is linked and user granted permission
    const status = await fetchCalendarStatus(userId);
    if (!status || status.status !== 'linked' || !status.refresh_token) {
      console.log(`[createCalendarEvent] Calendar not linked for user ${ userId }`, {
        hasStatus: !!status,
        statusValue: status?.status,
        hasRefreshToken: !!status?.refresh_token
      });
      return { success: false, error: 'Google Calendar not linked. Please connect your calendar in Settings.' };
    }

    // Verify calendar scope was granted
    const hasCalendarScope = status.scope && 
      Array.isArray(status.scope) && 
      status.scope.includes('https://www.googleapis.com/auth/calendar.events');
    
    if (!hasCalendarScope) {
      
      return { success: false, error: 'Calendar permissions not granted. Please reconnect your calendar.' };
    }

    // Get service and employee names for the event description
    let serviceName = 'Service';
    let employeeName = '';

    try {
      if (appointment.service_id) {
        const { data: service } = await supabase
          .from('services')
          .select('name')
          .eq('id', appointment.service_id)
          .single();
        if (service?.name) serviceName = service.name;
      }

      if (appointment.employee_id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('name')
          .eq('id', appointment.employee_id)
          .single();
        if (employee?.name) employeeName = employee.name;
      }
    } catch (err) {
      console.warn('[createCalendarEvent] Error fetching service/employee details:', err);
    }

    const startDate = new Date(appointment.date);
    const endDate = new Date(startDate.getTime() + (appointment.duration || 30) * 60 * 1000);

    const event = {
      summary: `${ serviceName }${ employeeName ? ` with ${employeeName}` : '' } - ${ appointment.name } `,
      description: [
        `Customer: ${ appointment.name } `,
        `Email: ${ appointment.email } `,
        `Phone: ${ appointment.phone } `,
        appointment.notes ? `Notes: ${ appointment.notes } ` : null,
      ].filter(Boolean).join('\n'),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    const result = await callGoogleCalendar(userId, '/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });

    

    // Store the calendar event ID in the appointment record for future updates/deletions
    // Note: This field may not exist in the schema yet, so we catch and ignore errors
    try {
      await supabase
        .from('appointments')
        .update({ google_calendar_event_id: result.id })
        .eq('id', appointment.id);
    } catch (err) {
      // Field might not exist in schema - that's okay, we'll just log it
      if (err.code === '42703' || err.message?.includes('column') || err.message?.includes('does not exist')) {
        
      } else {
        console.warn('[createCalendarEvent] Failed to store calendar event ID:', err);
      }
    }

    return { success: true, eventId: result.id };
  } catch (error) {
    console.error(`[createCalendarEvent] Error creating calendar event for user ${ userId }: `, error);
    return { 
      success: false, 
      error: error.message || 'Failed to create calendar event' 
    };
  }
}

/**
 * Update a Google Calendar event for an appointment
 */
export async function updateCalendarEvent(userId, appointment, eventId) {
  try {
    const status = await fetchCalendarStatus(userId);
    if (!status || status.status !== 'linked' || !status.refresh_token) {
      return { success: false, error: 'Google Calendar not linked' };
    }

    const { supabase } = await import('../supabaseClient.js');
    let serviceName = 'Service';
    let employeeName = '';

    try {
      if (appointment.service_id) {
        const { data: service } = await supabase
          .from('services')
          .select('name')
          .eq('id', appointment.service_id)
          .single();
        if (service?.name) serviceName = service.name;
      }

      if (appointment.employee_id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('name')
          .eq('id', appointment.employee_id)
          .single();
        if (employee?.name) employeeName = employee.name;
      }
    } catch (err) {
      console.warn('[updateCalendarEvent] Error fetching service/employee details:', err);
    }

    const startDate = new Date(appointment.date);
    const endDate = new Date(startDate.getTime() + (appointment.duration || 30) * 60 * 1000);

    const event = {
      summary: `${ serviceName }${ employeeName ? ` with ${employeeName}` : '' } - ${ appointment.name } `,
      description: [
        `Customer: ${ appointment.name } `,
        `Email: ${ appointment.email } `,
        `Phone: ${ appointment.phone } `,
        appointment.notes ? `Notes: ${ appointment.notes } ` : null,
      ].filter(Boolean).join('\n'),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    };

    await callGoogleCalendar(userId, `/ calendars / primary / events / ${ eventId } `, {
      method: 'PUT',
      body: JSON.stringify(event),
    });

    return { success: true };
  } catch (error) {
    console.error(`[updateCalendarEvent] Error: `, error);
    return { success: false, error: error.message || 'Failed to update calendar event' };
  }
}

/**
 * Delete a Google Calendar event for an appointment
 */
export async function deleteCalendarEvent(userId, eventId) {
  try {
    const status = await fetchCalendarStatus(userId);
    if (!status || status.status !== 'linked' || !status.refresh_token) {
      return { success: false, error: 'Google Calendar not linked' };
    }

    await callGoogleCalendar(userId, `/ calendars / primary / events / ${ eventId } `, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error) {
    console.error(`[deleteCalendarEvent] Error: `, error);
    return { success: false, error: error.message || 'Failed to delete calendar event' };
  }
}

