import React from 'react';
import { MessageCircle, Zap, Brain, Clock } from 'lucide-react';
import AIChatbot from '../components/shared/AIChatbot';

const AIChatbotDemoPage: React.FC = () => {
  const sampleServices = [
    { 
      id: '1', 
      name: 'Hair Consultation', 
      price: 50, 
      duration: 30, 
      description: 'Professional hair analysis and styling advice' 
    },
    { 
      id: '2', 
      name: 'Hair Cut & Style', 
      price: 85, 
      duration: 60, 
      description: 'Complete haircut with professional styling' 
    },
    { 
      id: '3', 
      name: 'Color Treatment', 
      price: 150, 
      duration: 120, 
      description: 'Full hair coloring with premium products' 
    },
    { 
      id: '4', 
      name: 'Hair Extensions', 
      price: 200, 
      duration: 90, 
      description: 'High-quality hair extension installation' 
    }
  ];

  const availableTimes = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'
  ];

  const handleBookingReady = (bookingData: any) => {
    
    // You can handle the booking data here
    alert(`Booking ready for: ${bookingData.name} - ${bookingData.service} on ${bookingData.date} at ${bookingData.time}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">AI Chatbot Demo</h1>
              <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                Powered by OpenAI
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Salon & Spa Booking Assistant
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Experience AI-Powered Booking
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our intelligent chatbot uses OpenAI's GPT-3.5 Turbo to provide natural, conversational booking experiences. 
            Click the chat bubble to see it in action!
          </p>
          <div className="flex justify-center items-center space-x-8">
            <div className="flex items-center space-x-2 text-green-600">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Instant Responses</span>
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <Brain className="w-5 h-5" />
              <span className="font-medium">AI-Powered</span>
            </div>
            <div className="flex items-center space-x-2 text-primary">
              <Clock className="w-5 h-5" />
              <span className="font-medium">24/7 Available</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Natural Conversation</h3>
            <p className="text-gray-600">
              Chat naturally with our AI assistant. No complex forms or rigid interfaces - just talk like you would to a real person.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Understanding</h3>
            <p className="text-gray-600">
              Our AI understands context, remembers your preferences, and can handle complex booking requests with ease.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
            <p className="text-gray-600">
              Once you provide all the details, the AI can book your appointment immediately. No waiting, no delays.
            </p>
          </div>
        </div>

        {/* Services Preview */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Services</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {sampleServices.map((service) => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary/40 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{service.name}</h4>
                  <span className="text-lg font-bold text-primary">${service.price}</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                <span className="text-xs text-gray-500">{service.duration} minutes</span>
              </div>
            ))}
          </div>
        </div>

        {/* Available Times */}
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Time Slots</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {availableTimes.map((time) => (
              <div key={time} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-sm font-medium text-gray-700 hover:bg-primary/10 hover:border-primary/40 transition-colors">
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-primary to-primary-light rounded-xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Try It?</h3>
          <p className="text-xl mb-6 opacity-90">
            Click the chat bubble in the bottom-right corner to start a conversation with our AI assistant!
          </p>
          <div className="flex justify-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span>AI Assistant is online and ready to help</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chatbot Component */}
      <AIChatbot
        businessName="Elite Salon & Spa"
        services={sampleServices}
        availableTimes={availableTimes}
        onBookingReady={handleBookingReady}
      />
    </div>
  );
};

export default AIChatbotDemoPage;
