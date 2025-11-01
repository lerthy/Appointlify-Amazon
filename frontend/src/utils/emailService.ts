// Backend email relay; the backend will handle the actual send

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
    const subject = `Appointment Confirmation - ${params.business_name}`;
    const text = `Hi ${params.to_name}, your appointment for ${params.service_name || 'service'} on ${params.appointment_date} at ${params.appointment_time} is confirmed. Manage: ${params.cancel_link}`;
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: params.to_email, subject, text }),
    });
    return res.ok;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
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