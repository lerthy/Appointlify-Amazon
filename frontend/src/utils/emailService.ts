// Backend email relay; the backend will handle the actual send

interface EmailParams {
  to_name: string;
  to_email: string;
  appointment_date: string;
  appointment_time: string;
  business_name: string;
  cancel_link: string;
  confirmation_link?: string;
  service_name?: string;
}

interface CancellationEmailParams {
  to_name: string;
  to_email: string;
  appointment_date: string;
  appointment_time: string;
  business_name: string;
  service_name?: string;
  business_phone?: string;
  business_id: string;
  reschedule_link: string;
}

export const sendAppointmentConfirmation = async (params: EmailParams): Promise<boolean> => {
  try {
    console.log('📧 Sending appointment confirmation email to:', params.to_email);
    
    // Try the Netlify function endpoint
    const res = await fetch('/.netlify/functions/send-appointment-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    // Check if request was successful
    if (!res.ok) {
      console.warn(`⚠️ Netlify function returned ${res.status}. Email functionality requires Netlify deployment or 'netlify dev'.`);
      console.log('📝 Email details that would be sent:', params);
      // Don't fail the booking, just log the email details
      return true;
    }
    
    const data = await res.json();
    console.log('Email response:', data);
    
    if (data.success) {
      console.log('✅ Email sent successfully!');
      return true;
    } else {
      console.error('❌ Email failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('⚠️ Email service error (this is expected in local dev without netlify dev):', error);
    console.log('📝 Email details that would be sent:', params);
    // Don't fail the booking if email fails
    return true;
  }
};

export const sendAppointmentCancellation = async (params: CancellationEmailParams): Promise<boolean> => {
  try {
    const subject = `CANCELLED: Appointment - ${params.business_name}`;
    const text = `Your appointment on ${params.appointment_date} at ${params.appointment_time} has been cancelled. Book a new time: ${params.reschedule_link}`;
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: params.to_email, subject, text }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return false;
  }
}; 