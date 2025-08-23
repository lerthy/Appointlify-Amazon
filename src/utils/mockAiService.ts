// Mock AI Service for testing without OpenAI API
// This simulates intelligent responses for booking scenarios

interface MockAIServiceOptions {
  businessName?: string;
  services?: Array<{ id: string; name: string; price: number; duration: number; description?: string }>;
  availableTimes?: string[];
}

export class MockAIService {
  private businessName: string;
  private services: any[];
  private availableTimes: string[];
  private conversationState: any = {};

  constructor(options: MockAIServiceOptions = {}) {
    this.businessName = options.businessName || 'our business';
    this.services = options.services || [];
    this.availableTimes = options.availableTimes || [];
  }

  async generateResponse(userMessage: string, conversationHistory: any[] = []): Promise<string> {
    const message = userMessage.toLowerCase();
    
    // Analyze what information we have
    const hasName = this.extractName(conversationHistory, userMessage);
    const hasService = this.extractService(conversationHistory, userMessage);
    const hasDate = this.extractDate(conversationHistory, userMessage);
    const hasTime = this.extractTime(conversationHistory, userMessage);

    // Greeting responses
    if (this.isGreeting(message)) {
      return `Hello! Welcome to ${this.businessName}. I'm here to help you book an appointment. What service would you like to schedule today?`;
    }

    // Service inquiry
    if (this.isServiceInquiry(message)) {
      const serviceList = this.services.map(s => `• ${s.name} - $${s.price} (${s.duration} min)`).join('\n');
      return `Here are our available services:\n\n${serviceList}\n\nWhich service interests you?`;
    }

    // Pricing inquiry
    if (this.isPricingInquiry(message)) {
      return `Our services range from $${Math.min(...this.services.map(s => s.price))} to $${Math.max(...this.services.map(s => s.price))}. Would you like me to tell you about a specific service?`;
    }

    // Availability inquiry
    if (this.isAvailabilityInquiry(message)) {
      const times = this.availableTimes.slice(0, 6).join(', ');
      return `We have availability today at: ${times}. What time works best for you?`;
    }

    // Booking intent detected
    if (this.isBookingIntent(message)) {
      return this.generateBookingResponse(userMessage, conversationHistory);
    }

    // Check if we have all booking information
    if (hasName && hasService && hasDate && hasTime) {
      return `BOOKING_READY: {"name": "${hasName}", "service": "${hasService}", "date": "${hasDate}", "time": "${hasTime}"}`;
    }

    // Ask for missing information
    return this.askForMissingInfo(hasName, hasService, hasDate, hasTime, message);
  }

  private isGreeting(message: string): boolean {
    return /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(message);
  }

  private isServiceInquiry(message: string): boolean {
    return /\b(services|what do you offer|what can you do|menu|options)\b/.test(message);
  }

  private isPricingInquiry(message: string): boolean {
    return /\b(price|cost|how much|pricing|rates|fees)\b/.test(message);
  }

  private isAvailabilityInquiry(message: string): boolean {
    return /\b(available|availability|when|schedule|open|times)\b/.test(message);
  }

  private isBookingIntent(message: string): boolean {
    return /\b(book|appointment|schedule|reserve|want|need|like to)\b/.test(message);
  }

  private extractName(history: any[], current: string): string | null {
    // Look for "I'm [name]" or "My name is [name]"
    const namePatterns = [
      /(?:i'm|my name is|i am|call me)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
      /(?:name|called)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i
    ];

    for (const pattern of namePatterns) {
      const match = current.match(pattern);
      if (match) return match[1];
    }

    // Check conversation history
    for (const msg of history) {
      if (msg.sender === 'user') {
        for (const pattern of namePatterns) {
          const match = msg.content.match(pattern);
          if (match) return match[1];
        }
      }
    }

    return null;
  }

  private extractService(history: any[], current: string): string | null {
    const allMessages = [...history.map(m => m.content), current].join(' ').toLowerCase();
    
    for (const service of this.services) {
      if (allMessages.includes(service.name.toLowerCase())) {
        return service.name;
      }
    }

    // Common service keywords
    const serviceKeywords = {
      'haircut': 'Haircut',
      'hair cut': 'Haircut',
      'color': 'Hair Color',
      'consultation': 'Consultation',
      'massage': 'Massage',
      'facial': 'Facial'
    };

    for (const [keyword, service] of Object.entries(serviceKeywords)) {
      if (allMessages.includes(keyword)) {
        return service;
      }
    }

    return null;
  }

  private extractDate(history: any[], current: string): string | null {
    const allMessages = [...history.map(m => m.content), current].join(' ').toLowerCase();
    
    // Simple date extraction
    if (allMessages.includes('today')) return new Date().toISOString().split('T')[0];
    if (allMessages.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Look for date patterns like "March 15" or "3/15"
    const datePattern = /(\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/;
    const match = allMessages.match(datePattern);
    if (match) {
      // For demo purposes, use a future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      return futureDate.toISOString().split('T')[0];
    }

    return null;
  }

  private extractTime(history: any[], current: string): string | null {
    const allMessages = [...history.map(m => m.content), current].join(' ').toLowerCase();
    
    // Time patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/,
      /(\d{1,2})\s*(am|pm)/,
      /(\d{1,2})\s*o'?clock/
    ];

    for (const pattern of timePatterns) {
      const match = allMessages.match(pattern);
      if (match) {
        if (match[3]) { // Has AM/PM
          return `${match[1]}:${match[2] || '00'} ${match[3].toUpperCase()}`;
        } else if (match[2]) { // Has AM/PM but no minutes
          return `${match[1]}:00 ${match[2].toUpperCase()}`;
        } else { // O'clock format
          return `${match[1]}:00 PM`; // Default to PM
        }
      }
    }

    return null;
  }

  private generateBookingResponse(message: string, history: any[]): string {
    const responses = [
      "I'd be happy to help you book an appointment! Let me get some details from you.",
      "Great! I can definitely help you schedule that. Let me collect some information.",
      "Perfect! I'll help you book an appointment. I just need a few details.",
      "Excellent! Let's get you scheduled. I'll need some information first."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private askForMissingInfo(hasName: string | null, hasService: string | null, hasDate: string | null, hasTime: string | null, message: string): string {
    if (!hasName) {
      return "I'd be happy to help you book an appointment! Could you please tell me your name?";
    }
    
    if (!hasService) {
      const serviceList = this.services.slice(0, 3).map(s => s.name).join(', ');
      return `Thanks ${hasName}! What service would you like to book? We offer ${serviceList}, and more.`;
    }
    
    if (!hasDate) {
      return `Great choice on the ${hasService}, ${hasName}! What date would you prefer? You can say "today", "tomorrow", or a specific date.`;
    }
    
    if (!hasTime) {
      const times = this.availableTimes.slice(0, 4).join(', ');
      return `Perfect! For ${hasDate}, we have availability at: ${times}. What time works best for you?`;
    }

    return "I understand you'd like to book an appointment. Could you please provide your name, preferred service, date, and time?";
  }
}

export const mockAiService = new MockAIService();
