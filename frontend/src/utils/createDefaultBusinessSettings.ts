import { supabase } from './supabaseClient';

/**
 * Creates default business settings for a business
 * @param businessId - The ID of the business
 * @param businessName - The name of the business (optional, defaults to 'Business')
 * @returns Promise that resolves to the created settings or null if error
 */
export const createDefaultBusinessSettings = async (
  businessId: string,
  businessName: string = 'Business'
): Promise<any | null> => {
  try {
    // Default working hours (same as fixBusinessSettings)
    const defaultWorkingHours = [
      { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ];

    const settingsToInsert = {
      business_id: businessId,
      name: businessName,
      working_hours: defaultWorkingHours,
      blocked_dates: [],
      breaks: [],
      appointment_duration: 30
    };

    const { data: insertedSettings, error: insertError } = await supabase
      .from('business_settings')
      .insert([settingsToInsert])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating default business settings:', insertError);
      return null;
    }

    console.log(`[createDefaultBusinessSettings] Created settings for business ${businessId}`);
    return insertedSettings;
  } catch (error) {
    console.error('Unexpected error creating default business settings:', error);
    return null;
  }
};
