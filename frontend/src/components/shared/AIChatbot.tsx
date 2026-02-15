import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { mockAiService } from '../../utils/mockAiService';
import { useTranslation } from 'react-i18next';

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

const AIChatbot: React.FC<AIChatbotProps> = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: t('chatWidget.welcomeMessage'),
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(`session_${Date.now()}`);

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
      // Prefer real Netlify function (Groq/OpenAI) and fall back to mock on failure
      const payload = {
        messages: [
          { role: 'system', content: 'You are a helpful booking assistant.' },
          ...messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })),
          { role: 'user', content: inputValue }
        ],
        context: {
          // Removed specific business context to allow AI to respond about all businesses
          availableTimes: undefined
        }
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Chat function error: ${res.status}`);
      }

      const data = await res.json();
      const aiText = data?.message || t('chatWidget.noResponse');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiText,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: t('chatWidget.errorMessage'),
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      // Fallback to mock so the user still gets a response
      try {
        const aiResponse = await mockAiService.generateResponse(
          inputValue,
          messages.map(msg => ({ sender: msg.sender, content: msg.content })),
          sessionId.current
        );
        
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: aiResponse,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (e) {
        // swallow
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clear the conversation when closing
    mockAiService.clearConversation(sessionId.current);
    sessionId.current = `session_${Date.now()}`;
  };

  return (
    <>
      {/* Chat Bubble */}
      {!isOpen && (
        <div
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 cursor-pointer transform transition-transform hover:scale-110"
          onClick={() => setIsOpen(true)}
        >
          <div className="bg-gradient-to-r from-[#6A3EE8] to-[#8A4EE8] text-white p-3 sm:p-4 rounded-full shadow-lg hover:from-[#5A2ED8] hover:to-[#7A3ED8] transition-all duration-300">
            <MessageCircle size={20} className="sm:hidden" />
            <MessageCircle size={24} className="hidden sm:block" />
          </div>
          {/* <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#6A3EE8] to-[#8A4EE8] text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            AI
          </div> */}
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-[90vw] max-w-sm h-[65vh] sm:w-96 sm:h-[500px] bg-white rounded-2xl shadow-2xl border-none flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#6A3EE8] to-[#8A4EE8] text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div>
              <h3 className="font-bold">{t('chatWidget.title')}</h3>
              <p className="text-sm opacity-90">{t('chatWidget.subtitle')}</p>
            </div>
            <button
              onClick={handleClose}
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
                      ? 'bg-gradient-to-r from-[#6A3EE8] to-[#8A4EE8] text-white rounded-br-none'
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
                    <span className="text-sm">{t('chatWidget.aiTyping')}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex justify-between">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatWidget.placeholder')}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent max-w-[85%]"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-[#6A3EE8] to-[#8A4EE8] text-white p-2 rounded-lg hover:from-[#5A2ED8] hover:to-[#7A3ED8] transition-all duration-300 disabled:opacity-50 disabled:cursor-default min-w-[13%] m-0"
                style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('chatWidget.poweredBy')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
