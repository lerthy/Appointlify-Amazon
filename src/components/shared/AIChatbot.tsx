import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface AIChatbotProps {
  businessName?: string;
  services?: Array<{ id: string; name: string; price: number; duration: number; description?: string }>;
  availableTimes?: string[];
  onBookingReady?: (bookingData: any) => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ 
  businessName = 'Appointly',
  services = [],
  availableTimes = [],
  onBookingReady
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm your AI booking assistant for ${businessName}. I can help you schedule an appointment. What service are you interested in today?`,
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare context for the AI
      const context = {
        businessName,
        services: services.length > 0 ? services : [
          { id: '1', name: 'Consultation', price: 50, duration: 30, description: 'Initial consultation' },
          { id: '2', name: 'Basic Service', price: 75, duration: 45, description: 'Standard service' },
          { id: '3', name: 'Premium Service', price: 120, duration: 60, description: 'Comprehensive service' }
        ],
        availableTimes: availableTimes.length > 0 ? availableTimes : [
          '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'
        ]
      };

      // Prepare messages for API (exclude id and timestamp)
      const apiMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add the current user message
      apiMessages.push({
        role: 'user',
        content: inputValue
      });

      // Call backend API
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let assistantMessage = data.message;
        
        // Check if the AI indicates booking is ready
        if (assistantMessage.includes('BOOKING_READY:')) {
          try {
            const bookingDataMatch = assistantMessage.match(/BOOKING_READY:\s*({.*})/);
            if (bookingDataMatch) {
              const bookingData = JSON.parse(bookingDataMatch[1]);
              
              // Clean up the message to remove the booking data
              assistantMessage = assistantMessage.replace(/BOOKING_READY:.*/, 
                'Perfect! I have all the information needed. Let me book that appointment for you...');
              
              // Trigger booking
              if (onBookingReady) {
                onBookingReady(bookingData);
              } else {
                // Default booking flow
                setTimeout(() => {
                  handleBooking(bookingData);
                }, 1000);
              }
            }
          } catch (e) {
            console.error('Error parsing booking data:', e);
          }
        }

        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: assistantMessage,
          sender: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiResponse]);
        
        // Log AI provider for debugging
        if (data.provider) {
          console.log(`AI Response from: ${data.provider}`, data.note || '');
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again or contact us directly to book your appointment.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async (bookingData: any) => {
    try {
      // Simulate booking API call
      const response = await fetch('http://localhost:3001/api/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingData,
          email: 'customer@example.com', // You might want to collect this
          phone: '+1234567890' // You might want to collect this
        }),
      });

      const result = await response.json();

      const confirmationMessage: Message = {
        id: Date.now().toString(),
        content: result.success 
          ? `Great! Your appointment has been booked successfully. Booking ID: ${result.bookingId}. You should receive a confirmation email shortly.`
          : 'Sorry, there was an issue booking your appointment. Please try again or contact us directly.',
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, there was a technical issue with the booking. Please contact us directly to complete your appointment.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 cursor-pointer transform transition-transform hover:scale-110"
          onClick={() => setIsOpen(true)}
        >
          <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
            <MessageCircle size={24} />
          </div>
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            AI
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">AI Booking Assistant</h3>
              <p className="text-sm opacity-90">{businessName}</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by OpenAI GPT-3.5 Turbo
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
