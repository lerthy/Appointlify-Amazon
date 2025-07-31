import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_n4o1nab';
const TEMPLATE_ID = 'template_6nc7amq';
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