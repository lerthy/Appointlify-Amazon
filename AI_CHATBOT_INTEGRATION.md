# AI Chatbot Integration with OpenAI

This document provides setup instructions for the OpenAI-powered AI chatbot that has been integrated into your appointment booking project.

## 🚀 Features

- **Natural Conversation**: Chat naturally with the AI assistant using OpenAI's GPT-3.5 Turbo
- **Smart Booking**: AI collects customer information (name, service, date, time) conversationally
- **Real-time Chat**: Instant responses with typing indicators and smooth animations
- **Responsive Design**: Beautiful chat bubble and window built with React + Tailwind CSS
- **Secure Backend**: OpenAI API calls handled securely through your Node.js backend
- **Context Aware**: AI understands your business services and available time slots

## 📋 Prerequisites

1. OpenAI API account with free trial credits
2. Node.js and npm installed
3. Your existing React + Node.js appointment booking project

## 🔧 Setup Instructions

### 1. Environment Configuration

Create a `.env` file in your project root with the following variables:

```env
# Twilio SMS Configuration (existing)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# OpenAI Configuration for AI Chatbot
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
```

### 2. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

> **Note**: OpenAI provides $5 in free trial credits for new accounts, which is perfect for testing!

### 3. Install Dependencies

The required dependencies have already been installed:

```bash
npm install openai
```

### 4. Start the Application

Start both the backend server and frontend:

```bash
# Terminal 1 - Start the backend server
npm run server

# Terminal 2 - Start the frontend development server
npm run dev
```

## 🎯 How to Use

### For End Users

1. **Chat Bubble**: Look for the blue chat bubble in the bottom-right corner of any page
2. **Start Conversation**: Click the bubble to open the chat window
3. **Natural Booking**: Type naturally like "I'd like to book a haircut for tomorrow at 2 PM"
4. **Follow AI Guidance**: The AI will ask for any missing information (name, service, date, time)
5. **Confirm Booking**: Once all info is collected, the AI will process the booking

### Demo Page

Visit `/ai-demo` to see a dedicated demo page showcasing the AI chatbot with sample services and time slots.

## 🛠 Technical Implementation

### Frontend Components

- **AIChatbot.tsx**: Main chat widget component with bubble and chat window
- **AIChatbotDemoPage.tsx**: Demo page showcasing the chatbot functionality

### Backend API Endpoints

- **POST /api/chat**: Processes chat messages through OpenAI API
- **POST /api/book-appointment**: Handles appointment booking (mock implementation)

### Key Features

1. **Message Flow**: User message → Backend API → OpenAI API → AI response → User
2. **Booking Detection**: AI responds with "BOOKING_READY" when all info is collected
3. **Context Awareness**: AI knows your business services and available times
4. **Error Handling**: Graceful fallbacks for API failures

## 🔄 Integration with Your Existing System

### Service Integration

The AI chatbot automatically adapts to your existing services. To integrate with your actual services:

1. Pass your real services to the `AIChatbot` component:

```tsx
<AIChatbot
  businessName="Your Business Name"
  services={yourServices} // Array of service objects
  availableTimes={yourAvailableTimes} // Array of time strings
  onBookingReady={handleBooking} // Custom booking handler
/>
```

### Booking Integration

Replace the mock booking endpoint in `server.js` with your actual booking logic:

```javascript
app.post('/api/book-appointment', async (req, res) => {
  // Replace this with your actual booking system integration
  const result = await yourBookingSystem.createAppointment(req.body);
  res.json(result);
});
```

## 🎨 Customization

### Styling

The chatbot uses Tailwind CSS classes. You can customize:

- Colors: Change `bg-blue-600` to your brand colors
- Size: Modify `w-96 h-[500px]` for different dimensions
- Position: Adjust `bottom-6 right-6` for different placement

### AI Personality

Modify the system prompt in `/api/chat` endpoint to change the AI's personality:

```javascript
const systemPrompt = `You are [your custom personality description]...`;
```

## 📱 Mobile Responsiveness

The chatbot is fully responsive and works on:

- Desktop browsers
- Mobile devices
- Tablets

## 🔐 Security Considerations

- ✅ OpenAI API key stored securely in backend environment variables
- ✅ No API keys exposed to frontend
- ✅ CORS properly configured
- ✅ Input validation on backend endpoints

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check your `.env` file has `OPENAI_API_KEY`
   - Restart your server after adding the key

2. **Chat bubble not appearing**
   - Check browser console for JavaScript errors
   - Ensure all components are properly imported

3. **AI not responding**
   - Check server logs for API errors
   - Verify OpenAI API key is valid and has credits

4. **CORS errors**
   - Ensure backend server is running on port 3001
   - Check CORS configuration in server.js

### Testing

1. Visit `/ai-demo` to test the full functionality
2. Try various booking scenarios:
   - "I want a haircut"
   - "Book me for tomorrow at 2 PM"
   - "What services do you offer?"

## 💡 Next Steps

1. **Collect Contact Info**: Enhance the AI to collect email/phone numbers
2. **Calendar Integration**: Connect with your calendar system
3. **SMS Notifications**: Integrate with existing Twilio SMS for confirmations
4. **Analytics**: Track popular services and booking patterns
5. **Multi-language**: Add support for multiple languages

## 📞 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Review server logs for backend errors
3. Verify your OpenAI API key and credits
4. Test with the demo page first

---

**Powered by OpenAI GPT-3.5 Turbo** 🤖
