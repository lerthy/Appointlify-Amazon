import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_n4o1nab';
const TEMPLATE_ID = 'template_6nc7amq';
const CANCELLATION_TEMPLATE_ID = 'template_cancellation'; // You'll need to create this template in EmailJS
const PUBLIC_KEY = 'KBjlWLFZG4KBjiPvL';

interface EmailParams {
  to_name: string;
  to_email: string;
  appointment_date: string;
  appointment_time: string;
  business_name: string;
  cancel_link: string;
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
    const templateParams = {
      to_name: params.to_name,
      email: params.to_email,
      appointment_date: params.appointment_date,
      appointment_time: params.appointment_time,
      service_name: params.service_name || '',
      business_name: params.business_name,
      cancel_link: params.cancel_link,
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendAppointmentCancellation = async (params: CancellationEmailParams): Promise<boolean> => {
  try {
    // Create a custom cancellation email using the existing template but with modified parameters
    const templateParams = {
      to_name: params.to_name,
      email: params.to_email,
      appointment_date: params.appointment_date,
      appointment_time: params.appointment_time,
      service_name: params.service_name || '',
      business_name: params.business_name,
      business_phone: params.business_phone || '',
      business_id: params.business_id,
      reschedule_link: params.reschedule_link,
      // Override the confirmation message with cancellation message
      confirmation_message: `Your appointment on ${params.appointment_date} at ${params.appointment_time} has been cancelled by the service provider. We apologize for any inconvenience.`,
      // Change the button text and link for rescheduling
      cancel_link: params.reschedule_link,
      button_text: 'Book New Appointment',
      // Add cancellation-specific content
      cancellation_message: `Your appointment on ${params.appointment_date} at ${params.appointment_time} has been cancelled by the service provider. We apologize for any inconvenience.`,
      reschedule_message: 'Click the button below to book a new appointment with us.',
      // Add a custom subject prefix to differentiate
      subject_prefix: 'CANCELLED: '
    };

    // Use the regular template but with cancellation-specific parameters
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    
    return true;
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return false;
  }
}; 