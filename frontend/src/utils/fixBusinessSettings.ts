import { supabase } from './supabaseClient';

export const fixBusinessSettings = async () => {
  try {


    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {

      return;
    }



    // Get all existing business settings
    const { data: existingSettings, error: settingsError } = await supabase
      .from('business_settings')
      .select('business_id');

    if (settingsError) {
      console.error('Error fetching business settings:', settingsError);
      return;
    }

    const existingBusinessIds = new Set(existingSettings?.map(s => s.business_id) || []);

    // Find users without business settings
    const usersWithoutSettings = users.filter(user => !existingBusinessIds.has(user.id));

    if (usersWithoutSettings.length === 0) {

      return;
    }



    // Create default business settings for each user
    const defaultWorkingHours = [
      { day: 'Monday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Tuesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Wednesday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Thursday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Friday', open: '09:00', close: '17:00', isClosed: false },
      { day: 'Saturday', open: '10:00', close: '15:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ];

    const settingsToInsert = usersWithoutSettings.map(user => ({
      business_id: user.id,
      name: user.name,
      working_hours: defaultWorkingHours,
      blocked_dates: [],
      breaks: [],
      appointment_duration: 30
    }));

    const { data: insertedSettings, error: insertError } = await supabase
      .from('business_settings')
      .insert(settingsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting business settings:', insertError);
      return;
    }



    // Now check for users without services and create default services
    const { data: existingServices, error: servicesError } = await supabase
      .from('services')
      .select('business_id');

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return;
    }

    const existingServiceBusinessIds = new Set(existingServices?.map(s => s.business_id) || []);
    const usersWithoutServices = users.filter(user => !existingServiceBusinessIds.has(user.id));

    if (usersWithoutServices.length > 0) {


      const defaultServices = usersWithoutServices.flatMap(user => [
        {
          business_id: user.id,
          name: 'Consultation',
          description: 'Initial consultation and assessment',
          duration: 30,
          price: 25.00
        },
        {
          business_id: user.id,
          name: 'Basic Service',
          description: 'Standard service offering',
          duration: 60,
          price: 50.00
        }
      ]);

      const { data: insertedServices, error: insertServicesError } = await supabase
        .from('services')
        .insert(defaultServices)
        .select();

      if (insertServicesError) {
        console.error('Error inserting services:', insertServicesError);
      } else {

      }
    }

    // Check for users without employees and create default employees
    const { data: existingEmployees, error: employeesError } = await supabase
      .from('employees')
      .select('business_id');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return;
    }

    const existingEmployeeBusinessIds = new Set(existingEmployees?.map(e => e.business_id) || []);
    const usersWithoutEmployees = users.filter(user => !existingEmployeeBusinessIds.has(user.id));

    if (usersWithoutEmployees.length > 0) {


      const defaultEmployees = usersWithoutEmployees.map(user => ({
        business_id: user.id,
        name: 'Main Staff',
        email: 'staff@example.com',
        phone: '+1234567890',
        role: 'Service Provider'
      }));

      const { data: insertedEmployees, error: insertEmployeesError } = await supabase
        .from('employees')
        .insert(defaultEmployees)
        .select();

      if (insertEmployeesError) {
        console.error('Error inserting employees:', insertEmployeesError);
      } else {

      }
    }



  } catch (error) {
    console.error('Unexpected error in fixBusinessSettings:', error);
  }
}; 