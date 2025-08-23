// OpenAI GPT Integration for Smart Chatbot
export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'gpt-3.5-turbo'
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      console.log('🤖 Calling OpenAI GPT...');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 500,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      
      return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  async getSmartBookingAssistance(
    userMessage: string,
    context: {
      businessName?: string;
      services?: Array<{ id: string; name: string; price: number; duration: number; description?: string }>;
      availableTimes?: string[];
      businessHours?: any;
      customerData?: any;
    }
  ): Promise<string> {
    const { businessName, services, availableTimes, businessHours } = context;

    const systemPrompt = `You are an intelligent booking assistant for ${businessName || 'our business'}. You are smart, helpful, and can handle complex conversations.

AVAILABLE SERVICES:
${services?.map(s => `- ${s.name}: $${s.price} (${s.duration} min) ${s.description ? '- ' + s.description : ''}`).join('\n') || 'Loading services...'}

AVAILABLE TIMES TODAY:
${availableTimes?.join(', ') || 'Checking availability...'}

BUSINESS HOURS:
${businessHours ? JSON.stringify(businessHours, null, 2) : 'Standard business hours'}

CAPABILITIES:
- Book appointments intelligently
- Answer questions about services, pricing, availability  
- Handle complex scheduling requests
- Provide recommendations based on customer needs
- Handle cancellations and rescheduling
- Remember context throughout the conversation

PERSONALITY:
- Professional but friendly
- Proactive and helpful
- Smart enough to understand context and intentions
- Can handle multiple requests in one message
- Provides clear, actionable responses

Current customer message: "${userMessage}"

Provide a smart, helpful response. If they want to book something, guide them through the process intelligently. If they ask questions, provide comprehensive answers.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage }
    ];

    return await this.chatCompletion(messages);
  }

  async analyzeCustomerIntent(message: string): Promise<{
    intent: 'booking' | 'question' | 'cancellation' | 'pricing' | 'availability' | 'general';
    confidence: number;
    extractedInfo: {
      serviceRequested?: string;
      timePreference?: string;
      datePreference?: string;
      customerName?: string;
      contactInfo?: string;
    };
  }> {
    try {
      const analysisPrompt = `Analyze this customer message and extract their intent and any relevant information:

"${message}"

Respond with a JSON object containing:
- intent: one of 'booking', 'question', 'cancellation', 'pricing', 'availability', 'general'
- confidence: 0-1 
- extractedInfo: object with any detected service, time, date, name, contact info

Example response:
{
  "intent": "booking",
  "confidence": 0.9,
  "extractedInfo": {
    "serviceRequested": "haircut",
    "timePreference": "2 PM",
    "datePreference": "tomorrow"
  }
}`;

      const response = await this.chatCompletion([
        { role: 'system', content: 'You are an expert at analyzing customer intent. Always respond with valid JSON only.' },
        { role: 'user', content: analysisPrompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        extractedInfo: {}
      };
    }
  }
}

export const openaiService = new OpenAIService();
