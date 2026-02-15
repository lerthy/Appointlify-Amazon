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
  business_logo_url?: string;
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
    
    // Check if we're in development mode without local server
    const isDevelopment = import.meta.env.DEV;
    const isLocalhost = window.location.hostname === 'localhost';
    
    // In local development (not netlify dev), use Express server endpoint
    if (isDevelopment && isLocalhost && window.location.port !== '8888') {
      const logoBlock = params.business_logo_url
        ? `<div style="text-align: center; padding: 24px 20px 16px;"><img src="${params.business_logo_url}" alt="${params.business_name}" style="max-width: 180px; max-height: 80px; object-fit: contain;" /></div>`
        : '';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1e3a5f; color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            ${logoBlock}
            <h1 style="margin: 0; font-size: 1.25rem; color: white;">Appointment Confirmation – ${params.business_name}</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
            <p>Hi ${params.to_name},</p>
            <p>Your appointment has been successfully booked.</p>
            <div style="background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #1e3a5f; border-radius: 4px;">
              <p style="margin: 6px 0;"><strong>Business:</strong> ${params.business_name}</p>
              ${params.service_name ? `<p style="margin: 6px 0;"><strong>Service:</strong> ${params.service_name}</p>` : ''}
              <p style="margin: 6px 0;"><strong>Date:</strong> ${params.appointment_date}</p>
              <p style="margin: 6px 0;"><strong>Time:</strong> ${params.appointment_time}</p>
            </div>
            ${params.confirmation_link ? `
            <p style="text-align: center; margin: 24px 0 8px; font-weight: bold; color: #333;">Please confirm your appointment to secure your booking:</p>
            <p style="text-align: center; margin: 0 0 16px;"><a href="${params.confirmation_link}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Appointment</a></p>
            <p style="color: #666; font-size: 14px; text-align: center; margin: 0 0 24px;">This link expires in 48 hours.</p>
            ` : ''}
            ${params.cancel_link ? `
            <p style="margin-top: 16px; color: #666;">To cancel or manage your appointment:</p>
            <p style="text-align: center;"><a href="${params.cancel_link}" style="display: inline-block; background: #4b5563; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Manage Appointment</a></p>
            ` : ''}
            <p style="margin-top: 24px;">We look forward to seeing you!</p>
            <p>Best regards,<br><strong>${params.business_name}</strong></p>
          </div>
          <p style="text-align: center; padding: 16px; color: #999; font-size: 12px;">Sent via Appointly booking system.</p>
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
      console.log('Email response:', data);
      
      if (data.success) {
        console.log('✅ Email sent successfully!');
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
      console.log('📝 Email details that would be sent:', params);
      return false;
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
    console.error('⚠️ Email service error:', error);
    console.log('📝 Email details that would be sent:', params);
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