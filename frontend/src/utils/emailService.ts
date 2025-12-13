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


    // Check if we're in development mode without local server
    const isDevelopment = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost';

    // In local development (not netlify dev), use Express server endpoint
    if (isDevelopment && isLocalhost && window.location.port !== '8888') {
      // Format the email using the appointment confirmation template
      const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; color: white;">🎉 Appointment Confirmation - ${params.business_name}</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Hi ${params.to_name},</p>
              <p>Your appointment has been successfully booked. Here are your appointment details:</p>
              
              <div style="background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #333;">📅 Appointment Details</h3>
                <p style="margin: 8px 0;"><strong>Business:</strong> ${params.business_name}</p>
                ${params.service_name ? `<p style="margin: 8px 0;"><strong>Service:</strong> ${params.service_name}</p>` : ''}
                <p style="margin: 8px 0;"><strong>Date:</strong> ${params.appointment_date}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${params.appointment_time}</p>
              </div>
              
              ${params.confirmation_link ? `
                <p style="text-align: center; margin: 30px 0; font-weight: bold; color: #333;">
                  Please confirm your appointment to secure your booking:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${params.confirmation_link}" 
                     style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                    ✅ Confirm Appointment
                  </a>
                </div>
                <p style="color: #666; font-size: 14px; text-align: center;">
                  This confirmation link expires in 48 hours. Your appointment will be added to the calendar once confirmed.
                </p>
              ` : ''}
              
              ${params.cancel_link ? `
                <p style="margin-top: 30px; color: #666;">If you need to cancel or reschedule your appointment, please use the button below:</p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${params.cancel_link}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                    📋 Manage Appointment
                  </a>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px;">We look forward to seeing you!</p>
              <p>Best regards,<br><strong>${params.business_name}</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee;">
              <p>This email was sent from Appointly booking system.</p>
              <p>If you have any questions, please contact ${params.business_name} directly.</p>
            </div>
          </div>
        `;

      const emailText = `Appointment Confirmation - ${params.business_name}\n\nHi ${params.to_name},\n\nYour appointment has been confirmed!\n\nDate: ${params.appointment_date}\nTime: ${params.appointment_time}${params.service_name ? `\nService: ${params.service_name}` : ''}${params.confirmation_link ? `\n\nConfirm: ${params.confirmation_link}` : ''}${params.cancel_link ? `\n\nCancel: ${params.cancel_link}` : ''}`;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: params.to_email,
          subject: `Appointment Confirmation - ${params.business_name}`,
          html: emailHtml,
          text: emailText
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Email HTTP error:', res.status, errorText);
        return false;
      }

      const data = await res.json();


      if (data.success) {

        return true;
      } else {
        console.error('❌ Email failed:', data.error);
        return false;
      }
    }

    // Use Netlify function (production or netlify dev)
    const res = await fetch('/.netlify/functions/send-appointment-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    // Check if request was successful
    if (!res.ok) {
      console.warn(`⚠️ Netlify function returned ${res.status}. Email functionality requires Netlify deployment or 'netlify dev'.`);

      // Don't fail the booking, just log the email details
      return true;
    }

    const data = await res.json();


    if (data.success) {

      return true;
    } else {
      console.error('❌ Email failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('⚠️ Email service error:', error);

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