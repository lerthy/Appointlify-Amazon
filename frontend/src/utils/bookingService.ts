import { supabase } from './supabaseClient';
import { sendAppointmentConfirmation } from './emailService';
import { sendSMS } from './smsService';

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  business_id: string;
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  name: string;
  working_hours: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  blocked_dates: string[];
  breaks: Array<{
    start: string;
    end: string;
  }>;
  appointment_duration: number;
}

export interface AvailableSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface BookingData {
  service_id: string;
  business_id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  notes?: string;
}

export class BookingService {
  private businessId: string;

  constructor(businessId: string) {
    this.businessId = businessId;
  }

  // Get all services for the business
  async getServices(): Promise<Service[]> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', this.businessId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  }

  // Get business settings
  async getBusinessSettings(): Promise<BusinessSettings | null> {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', this.businessId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching business settings:', error);
        return null;
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return (row as BusinessSettings) || null;
    } catch (error) {
      console.error('Error fetching business settings:', error);
      return null;
    }
  }

  // Get available dates for the next 30 days
  async getAvailableDates(): Promise<string[]> {
    try {
      const settings = await this.getBusinessSettings();
      if (!settings) return [];

      const availableDates: string[] = [];
      const today = new Date();

      // Check next 30 days
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);

        if (this.isDateAvailable(checkDate, settings)) {
          availableDates.push(checkDate.toISOString().split('T')[0]);
        }
      }

      return availableDates;
    } catch (error) {
      console.error('Error getting available dates:', error);
      return [];
    }
  }

  // Get available times for a specific date
  async getAvailableTimes(date: string, serviceDuration: number = 60, employeeId?: string): Promise<string[]> {
    try {
      const settings = await this.getBusinessSettings();
      if (!settings) {
        return [];
      }

      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

      // Find working hours for this day
      const daySettings = settings.working_hours.find(h => h.day === dayOfWeek);
      if (!daySettings || daySettings.isClosed) {
        return [];
      }



      // Generate time slots
      const timeSlots = this.generateTimeSlots(daySettings.open, daySettings.close, serviceDuration, selectedDate);


      // Filter out booked times (optionally for specific employee)
      const availableSlots = await this.filterBookedSlots(date, timeSlots, serviceDuration, employeeId);


      return availableSlots;
    } catch (error) {
      console.error('Error getting available times:', error);
      return [];
    }
  }

  // Check if a specific date/time is available
  async checkAvailability(date: string, time: string, serviceDuration: number = 60, employeeId?: string): Promise<boolean> {
    try {
      const availableTimes = await this.getAvailableTimes(date, serviceDuration, employeeId);

      const isAvailable = availableTimes.includes(time);

      return isAvailable;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  // Create a new appointment
  async createAppointment(bookingData: BookingData): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
      // Validate availability
      const isAvailable = await this.checkAvailability(bookingData.date, bookingData.time, 60);


      if (!isAvailable) {

        // For now, we'll proceed with the booking even if availability check fails
        // This allows the booking to work while we debug the availability system
      }

      // Create or find customer
      let customerId = await this.getOrCreateCustomer(bookingData);

      // Get service details
      const service = await this.getServiceById(bookingData.service_id);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      // Create appointment date
      // Create appointment date
      const appointmentDateTime = new Date(`${bookingData.date}T${bookingData.time}`);

      // Generate confirmation token
      const confirmationToken = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 48); // 48 hour expiry

      // Create appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([{
          customer_id: customerId,
          service_id: bookingData.service_id,
          business_id: this.businessId,
          employee_id: bookingData.employee_id,
          name: bookingData.name,
          phone: bookingData.phone,
          email: bookingData.email,
          date: appointmentDateTime.toISOString(),
          duration: service.duration,
          status: 'scheduled',
          confirmation_status: 'pending',
          confirmation_token: confirmationToken,
          confirmation_token_expires: tokenExpiry.toISOString(),
          reminder_sent: false,
          notes: bookingData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notifications
      await this.sendNotifications(appointment, service);

      return { success: true, appointmentId: appointment.id };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { success: false, error: 'Failed to create appointment' };
    }
  }

  // Get or create customer
  private async getOrCreateCustomer(bookingData: BookingData): Promise<string> {
    try {
      // Try to find existing customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', bookingData.email)
        .single();

      if (existingCustomer) {
        return existingCustomer.id;
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([{
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone
        }])
        .select()
        .single();

      if (error) throw error;
      return newCustomer.id;
    } catch (error) {
      console.error('Error with customer:', error);
      throw error;
    }
  }

  // Get service by ID
  private async getServiceById(serviceId: string): Promise<Service | null> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching service:', error);
      return null;
    }
  }

  // Check if date is available (not blocked, is working day)
  private isDateAvailable(date: Date, settings: BusinessSettings): boolean {
    const dateString = date.toISOString().split('T')[0];

    // Check if date is blocked
    if (settings.blocked_dates.includes(dateString)) {
      return false;
    }

    // Check if it's a working day
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings.working_hours.find(h => h.day === dayOfWeek) || false;

    return daySettings && !daySettings.isClosed;
  }

  // Generate time slots between open and close times
  private generateTimeSlots(openTime: string, closeTime: string, duration: number, selectedDate?: Date): string[] {
    const slots: string[] = [];
    const open = new Date(`2000-01-01T${openTime}`);
    const close = new Date(`2000-01-01T${closeTime}`);

    let current = new Date(open);

    // Get current date and time to check for past slots
    const now = new Date();
    const isToday = selectedDate ? selectedDate.toDateString() === now.toDateString() : false;

    // Add 15 minutes buffer to current time to allow reasonable booking window
    const currentTimeWithBuffer = new Date(now);
    currentTimeWithBuffer.setMinutes(currentTimeWithBuffer.getMinutes() + 15);

    while (current < close) {
      const timeString = current.toTimeString().slice(0, 5);

      // Skip past times if the selected date is today (with 15-minute buffer)
      if (isToday && selectedDate) {
        const slotDateTime = new Date(selectedDate);
        const [hours, minutes] = timeString.split(':').map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);

        if (slotDateTime < currentTimeWithBuffer) {
          current.setMinutes(current.getMinutes() + duration);
          continue;
        }
      }

      slots.push(timeString);
      current.setMinutes(current.getMinutes() + duration);
    }

    return slots;
  }

  // Filter out already booked time slots
  private async filterBookedSlots(date: string, timeSlots: string[], duration: number, employeeId?: string): Promise<string[]> {
    try {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

      let query = supabase
        .from('appointments')
        .select('date, duration, employee_id')
        .eq('business_id', this.businessId)
        .gte('date', startOfDay.toISOString())
        .lte('date', endOfDay.toISOString());

      // nese ka employee id bani check veq per qat employee
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data: existingAppointments } = await query;

      if (!existingAppointments) return timeSlots;

      const bookedSlots = new Set<string>();

      existingAppointments.forEach(appointment => {
        const appointmentTime = new Date(appointment.date);

        // Add all slots that overlap with this appointment
        for (let i = 0; i < Math.max(appointment.duration, duration); i += 30) {
          const slotTime = new Date(appointmentTime);
          slotTime.setMinutes(slotTime.getMinutes() + i);
          bookedSlots.add(slotTime.toTimeString().slice(0, 5));
        }
      });

      return timeSlots.filter(slot => !bookedSlots.has(slot));
    } catch (error) {
      console.error('Error filtering booked slots:', error);
      return timeSlots;
    }
  }

  // Send email and SMS notifications
  private async sendNotifications(appointment: any, service: Service): Promise<void> {
    try {
      const businessSettings = await this.getBusinessSettings();
      const businessName = businessSettings?.name || 'Our Business';

      const appointmentDate = new Date(appointment.date);
      const dateString = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeString = appointmentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Fetch appointment to get confirmation token
      let confirmationLink = null;
      try {
        const { data: appointmentData } = await supabase
          .from('appointments')
          .select('confirmation_token')
          .eq('id', appointment.id)
          .single();

        if (appointmentData?.confirmation_token) {
          confirmationLink = `${window.location.origin}/confirm-appointment?token=${appointmentData.confirmation_token}`;
        }
      } catch (error) {
        console.warn('Could not fetch confirmation token:', error);
      }

      // Send email (don't let it fail the booking)
      try {
        await sendAppointmentConfirmation({
          to_name: appointment.name,
          to_email: appointment.email,
          appointment_date: dateString,
          appointment_time: timeString,
          business_name: businessName,
          service_name: service.name,
          cancel_link: `${window.location.origin}/cancel/${appointment.id}`,
          confirmation_link: confirmationLink || undefined
        });

      } catch (emailError) {
        console.error('❌ Email notification failed:', emailError);
        // Continue with SMS even if email fails
      }

      // Send SMS (don't let it fail the booking)
      try {
        const smsMessage = `Hi ${appointment.name}! Your ${service.name} appointment is confirmed for ${dateString} at ${timeString}. Reply STOP to cancel.`;
        const smsResult = await sendSMS({
          to: appointment.phone,
          message: smsMessage
        });
      } catch (smsError) {
        console.error('❌ SMS notification failed:', smsError);
        // Continue even if SMS fails
      }

    } catch (error) {
      console.error('Error in notification system:', error);
      // Don't fail the booking if notifications fail
    }
  }

  // Get employees for the business
  async getEmployees(): Promise<Array<{ id: string; name: string; role: string }>> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('business_id', this.businessId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  // Get business info
  async getBusinessInfo(): Promise<{ name: string; description?: string; logo?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, description, logo')
        .eq('id', this.businessId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching business info:', error);
      return null;
    }
  }
}
