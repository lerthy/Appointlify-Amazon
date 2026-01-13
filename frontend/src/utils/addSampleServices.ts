import { supabase } from './supabaseClient';

export async function addSampleServices() {
  try {


    // Get the business IDs from your business_settings table
    const { data: businesses, error: businessError } = await supabase
      .from('business_settings')
      .select('id, name')
      .limit(1); // Just get the first business

    if (businessError) {
      console.error('Error fetching businesses:', businessError);
      return false;
    }

    if (!businesses || businesses.length === 0) {
      console.error('No businesses found in business_settings table');
      return false;
    }

    const businessId = businesses[0].id;
    `);

    // Check if services already exist for this business
    const { data: existingServices } = await supabase
      .from('services')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (existingServices && existingServices.length > 0) {
      
      return true;
    }

    

    // Add sample services
    const sampleServices = [
      {
        business_id: businessId,
        name: 'Hair Cut & Style',
        description: 'Professional hair cutting and styling service',
        duration: 60,
        price: 50
      },
      {
        business_id: businessId,
        name: 'Hair Color',
        description: 'Full hair coloring service with premium products',
        duration: 120,
        price: 85
      },
      {
        business_id: businessId,
        name: 'Manicure',
        description: 'Complete nail care and polish application',
        duration: 45,
        price: 35
      },
      {
        business_id: businessId,
        name: 'Facial Treatment',
        description: 'Relaxing facial with deep cleansing and moisturizing',
        duration: 75,
        price: 65
      },
      {
        business_id: businessId,
        name: 'Eyebrow Shaping',
        description: 'Professional eyebrow trimming and shaping',
        duration: 30,
        price: 25
      }
    ];

    const { data: createdServices, error: serviceError } = await supabase
      .from('services')
      .insert(sampleServices)
      .select();

    if (serviceError) {
      console.error('❌ Error creating services:', serviceError);
      console.error('Error details:', serviceError.message);
      return false;
    }

    
    .join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Error in addSampleServices:', error);
    return false;
  }
}

// Auto-run when imported
addSampleServices().then(success => {
  if (success) {
    
  } else {
    
  }
});
