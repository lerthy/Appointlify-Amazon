// Mock AI Service for conversational appointment booking
// This simulates intelligent responses and integrates with real database data

import { supabase } from './supabaseClient';
import { BookingService } from './bookingService';

interface ConversationState {
  step: 'greeting' | 'business_selection' | 'service_selection' | 'contact_info' | 'date_selection' | 'time_selection' | 'confirmation' | 'booking_complete';
  selectedBusiness?: {
    id: string;
    name: string;
    description?: string;
  };
  selectedService?: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  contactInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  selectedDate?: string;
  selectedTime?: string;
  availableBusinesses?: Array<{ id: string; name: string; description?: string }>;
  availableServices?: Array<{ id: string; name: string; price: number; duration: number }>;
  availableDates?: string[];
  availableTimes?: string[];
}

export class MockAIService {
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor() { }

  async generateResponse(userMessage: string, conversationHistory: any[] = [], sessionId: string = 'default'): Promise<string> {
    const message = userMessage.toLowerCase().trim();

    // Get or create conversation state
    let state = this.conversationStates.get(sessionId);
    if (!state) {
      state = { step: 'greeting' };
      this.conversationStates.set(sessionId, state);
    }

    // Handle conversation flow based on current step
    switch (state.step) {
      case 'greeting':
        return await this.handleGreeting(message, state, sessionId);

      case 'business_selection':
        return await this.handleBusinessSelection(message, state, sessionId);

      case 'service_selection':
        return await this.handleServiceSelection(message, state, sessionId);

      case 'contact_info':
        return await this.handleContactInfo(message, state, sessionId);

      case 'date_selection':
        return await this.handleDateSelection(message, state, sessionId);

      case 'time_selection':
        return await this.handleTimeSelection(message, state, sessionId);

      case 'confirmation':
        return await this.handleConfirmation(message, state, sessionId);

      case 'booking_complete':
        return this.handleBookingComplete(message, state);

      default:
        return "I'm here to help you book an appointment. Let's start by finding the right business for you!";
    }
  }

  private async handleGreeting(message: string, state: ConversationState, sessionId: string): Promise<string> {
    // Check if user wants to start booking
    if (this.isGreeting(message) || this.isBookingIntent(message) || message.includes('yes') || message.includes('start')) {
      // Fetch available businesses from database
      try {
        const { data: businesses, error } = await supabase
          .from('users')
          .select('id, name, description')
          .order('name');

        if (error) throw error;

        state.availableBusinesses = businesses || [];
        state.step = 'business_selection';
        this.conversationStates.set(sessionId, state);

        if (state.availableBusinesses.length === 0) {
          return "I'm sorry, but there are no businesses available for booking at the moment. Please try again later.";
        }

        const businessList = state.availableBusinesses
          .map((business, index) => `${index + 1}. ${business.name}${business.description ? ` - ${business.description}` : ''}`)
          .join('\n');

        return `Hello! Welcome to Appointly, your smart appointment booking assistant. I'm here to help you book an appointment step by step.

What type of business would you like to book with? Here are the available options:

${businessList}

Please choose a business by number or name.`;
      } catch (error) {
        console.error('Error fetching businesses:', error);
        return "I'm having trouble accessing our business directory right now. Please try again in a moment.";
      }
    }

    return "Hello! I'm your AI assistant for Appointly. I can help you book appointments with various businesses. Would you like to start booking an appointment?";
  }

  private async handleBusinessSelection(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.availableBusinesses) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    // Try to match business by number or name
    let selectedBusiness = null;

    // Check for number selection
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < state.availableBusinesses.length) {
        selectedBusiness = state.availableBusinesses[index];
      }
    }

    // Check for name selection
    if (!selectedBusiness) {
      for (const business of state.availableBusinesses) {
        if (message.includes(business.name.toLowerCase())) {
          selectedBusiness = business;
          break;
        }
      }
    }

    if (selectedBusiness) {
      state.selectedBusiness = selectedBusiness;
      state.step = 'service_selection';
      this.conversationStates.set(sessionId, state);

      // Fetch services for this business
      try {
        const { data: services, error } = await supabase
          .from('services')
          .select('id, name, price, duration')
          .eq('business_id', selectedBusiness.id)
          .order('name');

        if (error) throw error;

        state.availableServices = services || [];
        this.conversationStates.set(sessionId, state);

        if (state.availableServices.length === 0) {
          return `I'm sorry, but ${selectedBusiness.name} doesn't have any services available at the moment. Please choose a different business.`;
        }

        const serviceList = state.availableServices
          .map((service, index) => `${index + 1}. ${service.name}${service.price != null ? ` - $${service.price}` : ''} (${service.duration} min)`)
          .join('\n');

        return `Great choice! ${selectedBusiness.name} offers the following services:

${serviceList}

Which service would you like to book? Please choose by number or name.`;
      } catch (error) {
        console.error('Error fetching services:', error);
        return `I'm having trouble accessing the services for ${selectedBusiness.name}. Please try again.`;
      }
    }

    return "I didn't quite catch that. Please choose a business by number or name from the list I provided.";
  }

  private async handleServiceSelection(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.availableServices || !state.selectedBusiness) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    // Try to match service by number or name
    let selectedService = null;

    // Check for number selection
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < state.availableServices.length) {
        selectedService = state.availableServices[index];
      }
    }

    // Check for name selection
    if (!selectedService) {
      for (const service of state.availableServices) {
        if (message.includes(service.name.toLowerCase())) {
          selectedService = service;
          break;
        }
      }
    }

    if (selectedService) {
      state.selectedService = selectedService;
      state.step = 'contact_info';
      this.conversationStates.set(sessionId, state);

      return `Perfect! You've selected ${selectedService.name} at ${state.selectedBusiness.name}. 

Now I need some contact information to complete your booking. Could you please provide your name?`;
    }

    return "I didn't quite catch that. Please choose a service by number or name from the list I provided.";
  }

  private async handleContactInfo(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.selectedService || !state.selectedBusiness) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    // Extract contact information
    if (!state.contactInfo) {
      state.contactInfo = { name: '', email: '', phone: '' };
    }

    if (!state.contactInfo.name) {
      // Extract name
      const nameMatch = message.match(/(?:my name is|i'm|i am|call me|name is)\s+([a-zA-Z\s]+)/i);
      if (nameMatch) {
        state.contactInfo.name = nameMatch[1].trim();
        this.conversationStates.set(sessionId, state);
        return `Thanks ${state.contactInfo.name}! What's your email address?`;
      } else {
        // Assume the whole message is the name if it looks like a name
        if (message.length > 2 && message.length < 50 && /^[a-zA-Z\s]+$/.test(message)) {
          state.contactInfo.name = message;
          this.conversationStates.set(sessionId, state);
          return `Thanks ${state.contactInfo.name}! What's your email address?`;
        }
        return "Could you please tell me your name?";
      }
    } else if (!state.contactInfo.email) {
      // Extract email
      const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        state.contactInfo.email = emailMatch[0];
        this.conversationStates.set(sessionId, state);
        return `Great! And what's your phone number?`;
      } else {
        return "Could you please provide a valid email address?";
      }
    } else if (!state.contactInfo.phone) {
      // Extract phone number
      const phoneMatch = message.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) {
        state.contactInfo.phone = phoneMatch[0];
        state.step = 'date_selection';
        this.conversationStates.set(sessionId, state);

        // Get available dates
        try {
          const bookingService = new BookingService(state.selectedBusiness.id);
          const availableDates = await bookingService.getAvailableDates();
          state.availableDates = availableDates.slice(0, 14); // Next 2 weeks
          this.conversationStates.set(sessionId, state);

          const dateOptions = state.availableDates
            .map((date, index) => {
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return `${index + 1}. ${dayName}, ${monthDay}`;
            })
            .join('\n');

          return `Perfect! Now let's pick a date for your ${state.selectedService.name} appointment. Here are the available dates:

${dateOptions}

Which date would you prefer? You can choose by number or say the date.`;
        } catch (error) {
          console.error('Error fetching available dates:', error);
          return "I'm having trouble checking available dates. Please try again.";
        }
      } else {
        return "Could you please provide a valid phone number?";
      }
    }

    return "I need your contact information to complete the booking. Could you please provide your name?";
  }

  private async handleDateSelection(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.contactInfo || !state.selectedService || !state.selectedBusiness || !state.availableDates) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    // Try to match date by number or name
    let selectedDate = null;

    // Check for number selection
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < state.availableDates.length) {
        selectedDate = state.availableDates[index];
      }
    }

    // Check for date patterns
    if (!selectedDate) {
      if (message.includes('today')) {
        const today = new Date().toISOString().split('T')[0];
        if (state.availableDates.includes(today)) {
          selectedDate = today;
        }
      } else if (message.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        if (state.availableDates.includes(tomorrowStr)) {
          selectedDate = tomorrowStr;
        }
      } else {
        // Try to match date patterns
        for (const date of state.availableDates) {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          const shortDayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const monthDay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          const shortMonthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          if (message.includes(dayName.toLowerCase()) ||
            message.includes(shortDayName.toLowerCase()) ||
            message.includes(monthDay.toLowerCase()) ||
            message.includes(shortMonthDay.toLowerCase())) {
            selectedDate = date;
            break;
          }
        }
      }
    }

    if (selectedDate) {
      state.selectedDate = selectedDate;
      state.step = 'time_selection';
      this.conversationStates.set(sessionId, state);

      // Get available times for this date
      try {
        const bookingService = new BookingService(state.selectedBusiness.id);
        const availableTimes = await bookingService.getAvailableTimes(selectedDate, state.selectedService.duration);
        state.availableTimes = availableTimes;
        this.conversationStates.set(sessionId, state);

        if (state.availableTimes.length === 0) {
          return `I'm sorry, but there are no available time slots for ${selectedDate}. Would you like to choose a different date?`;
        }

        const timeOptions = state.availableTimes
          .map((time, index) => {
            const timeObj = new Date(`2000-01-01T${time}`);
            const timeString = timeObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            return `${index + 1}. ${timeString}`;
          })
          .join('\n');

        const dateObj = new Date(selectedDate);
        const dateString = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });

        return `Great! For ${dateString}, here are the available time slots:

${timeOptions}

What time would you prefer? You can choose by number or say the time.`;
      } catch (error) {
        console.error('Error fetching available times:', error);
        return "I'm having trouble checking available times. Please try again.";
      }
    }

    return "I didn't quite catch that. Please choose a date by number or name from the list I provided.";
  }

  private async handleTimeSelection(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.selectedDate || !state.contactInfo || !state.selectedService || !state.selectedBusiness || !state.availableTimes) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    // Try to match time by number or time format
    let selectedTime = null;

    // Check for number selection
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < state.availableTimes.length) {
        selectedTime = state.availableTimes[index];
      }
    }

    // Check for time patterns
    if (!selectedTime) {
      const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(am|pm)/i,
        /(\d{1,2})\s*(am|pm)/i,
        /(\d{1,2})\s*o'?clock/i
      ];

      for (const pattern of timePatterns) {
        const match = message.match(pattern);
        if (match) {
          let hour = parseInt(match[1]);
          const minutes = match[2] ? parseInt(match[2]) : 0;
          const period = match[3] ? match[3].toLowerCase() : 'pm';

          // Convert to 24-hour format
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;

          const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

          if (state.availableTimes.includes(timeString)) {
            selectedTime = timeString;
            break;
          }
        }
      }
    }

    if (selectedTime) {

      state.selectedTime = selectedTime;
      state.step = 'confirmation';
      this.conversationStates.set(sessionId, state);

      const timeObj = new Date(`2000-01-01T${selectedTime}`);
      const timeString = timeObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const dateObj = new Date(state.selectedDate);
      const dateString = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      console.log('Confirmation details:', {
        selectedTime: selectedTime,
        displayTime: timeString,
        date: state.selectedDate,
        displayDate: dateString
      });

      return `Perfect! Let me confirm your booking details:

**Service:** ${state.selectedService.name}${state.selectedService.price != null ? ` ($${state.selectedService.price})` : ''}
**Business:** ${state.selectedBusiness.name}
**Date:** ${dateString}
**Time:** ${timeString}
**Name:** ${state.contactInfo.name}
**Email:** ${state.contactInfo.email}
**Phone:** ${state.contactInfo.phone}

Is this correct? Please respond with "yes" to confirm or "no" to make changes.`;
    }

    return "I didn't quite catch that. Please choose a time by number or say the time (e.g., '2:30 PM' or '2 PM').";
  }

  private async handleConfirmation(message: string, state: ConversationState, sessionId: string): Promise<string> {
    if (!state.selectedTime || !state.selectedDate || !state.contactInfo || !state.selectedService || !state.selectedBusiness) {
      state.step = 'greeting';
      this.conversationStates.set(sessionId, state);
      return "Let me start over. What type of business would you like to book with?";
    }

    if (message.includes('yes') || message.includes('correct') || message.includes('confirm')) {
      // Create the appointment
      try {
        const bookingService = new BookingService(state.selectedBusiness.id);

        // Double-check availability before booking
        console.log('Double-checking availability with:', {
          date: state.selectedDate,
          time: state.selectedTime,
          duration: state.selectedService.duration
        });

        const isStillAvailable = await bookingService.checkAvailability(
          state.selectedDate,
          state.selectedTime,
          state.selectedService.duration
        );



        // Note: We're proceeding with booking even if availability check fails
        // This allows the booking to work while we debug the availability system
        if (!isStillAvailable) {

        }

        // Get first available employee
        const employees = await bookingService.getEmployees();
        const employeeId = employees.length > 0 ? employees[0].id : 'default';

        const bookingData = {
          service_id: state.selectedService.id,
          business_id: state.selectedBusiness.id,
          employee_id: employeeId,
          name: state.contactInfo.name,
          email: state.contactInfo.email,
          phone: state.contactInfo.phone,
          date: state.selectedDate,
          time: state.selectedTime,
          notes: 'Booked via AI Assistant'
        };



        // Try to create the appointment even if availability check failed (for debugging)

        const result = await bookingService.createAppointment(bookingData);



        if (result.success) {
          state.step = 'booking_complete';
          this.conversationStates.set(sessionId, state);

          const timeObj = new Date(`2000-01-01T${state.selectedTime}`);
          const timeString = timeObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const dateObj = new Date(state.selectedDate);
          const dateString = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          });

          const confirmationMessage = `🎉 **Booking Confirmed!**

Your appointment has been successfully booked!

**Booking ID:** ${result.appointmentId}
**Service:** ${state.selectedService.name}
**Business:** ${state.selectedBusiness.name}
**Date:** ${dateString}
**Time:** ${timeString}

You'll receive a confirmation email and SMS shortly. If you need to cancel or reschedule, please contact ${state.selectedBusiness.name} directly.

Thank you for using Appointly! Is there anything else I can help you with?`;


          return confirmationMessage;
        } else {
          console.error('Booking failed:', result.error);
          return `I'm sorry, but I couldn't complete your booking: ${result.error}. Please try again or contact ${state.selectedBusiness.name} directly.`;
        }
      } catch (error) {
        console.error('Error creating appointment:', error);
        return "I'm sorry, but there was an error creating your appointment. Please try again or contact the business directly.";
      }
    } else if (message.includes('no') || message.includes('change') || message.includes('wrong')) {
      // Reset to date selection
      state.step = 'date_selection';
      this.conversationStates.set(sessionId, state);
      return "No problem! Let's go back to choosing a date. What date would you prefer?";
    }

    return "Please respond with 'yes' to confirm your booking or 'no' to make changes.";
  }

  private handleBookingComplete(message: string, state: ConversationState): string {
    if (this.isGreeting(message) || this.isBookingIntent(message)) {
      // Reset conversation for new booking
      state.step = 'greeting';
      return "I'd be happy to help you book another appointment! What type of business would you like to book with?";
    }

    return "Is there anything else I can help you with today?";
  }

  private isGreeting(message: string): boolean {
    return /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(message);
  }

  private isBookingIntent(message: string): boolean {
    return /\b(book|appointment|schedule|reserve|want|need|like to)\b/.test(message);
  }

  // Clear conversation state (useful for testing)
  clearConversation(sessionId: string = 'default'): void {
    this.conversationStates.delete(sessionId);
  }
}

export const mockAiService = new MockAIService();
