# Troubleshooting Guide for AI Chatbot

## Issues Fixed ✅

### 1. 404 Error on API Calls
**Problem**: Frontend was calling `/api/chat` instead of `http://localhost:3001/api/chat`

**Solution**: Updated `AIChatbot.tsx` to use full backend URL:
```javascript
const response = await fetch('http://localhost:3001/api/chat', {
```

### 2. OpenAI Quota Exceeded
**Problem**: The provided OpenAI API key has exceeded its quota limit.

**Solution**: Implemented mock AI service as fallback:
- Added `USE_OPENAI=false` to `.env` file
- Created intelligent mock responses in `server.js`
- Backend automatically falls back to mock service when OpenAI fails

## Current Status 🎯

✅ **Backend**: Enhanced with mock AI fallback  
✅ **Frontend**: Updated with correct API URLs  
✅ **Fallback**: Mock AI service works without OpenAI  
✅ **Error Handling**: Graceful fallbacks implemented  

## How to Test Right Now

1. **Start Backend** (if not already running):
   ```bash
   npm run server
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   npm run dev
   ```

3. **Test the Chatbot**:
   - Go to any page (e.g., `http://localhost:5173`)
   - Click the blue chat bubble in bottom-right corner
   - Try these test messages:
     - "Hello"
     - "What services do you offer?"
     - "I want to book an appointment"
     - "I'm John, I need a haircut tomorrow at 2 PM"

## Expected Behavior

The chatbot will:
- ✅ Respond intelligently using mock AI service
- ✅ Collect booking information (name, service, date, time)
- ✅ Show "BOOKING_READY" when all info is collected
- ✅ Process mock bookings through backend API

## Mock AI Features

The mock AI service can handle:
- **Greetings**: "Hello", "Hi", "Good morning"
- **Service Inquiries**: "What services do you offer?"
- **Booking Requests**: "I want to book an appointment"
- **Information Collection**: Extracts names, services, dates, times
- **Smart Responses**: Context-aware booking assistance

## Switching to Real OpenAI

When you have a working OpenAI API key:

1. **Update .env**:
   ```env
   OPENAI_API_KEY=your_new_working_api_key
   USE_OPENAI=true
   ```

2. **Restart Backend**:
   ```bash
   npm run server
   ```

3. **Test OpenAI**:
   ```bash
   node test-openai.js
   ```

## Demo Page

Visit `http://localhost:5173/ai-demo` for a comprehensive demo showcasing:
- Sample business services
- Available time slots
- Interactive chatbot
- Feature explanations

## API Endpoints

### Chat Endpoint
- **URL**: `POST http://localhost:3001/api/chat`
- **Body**: `{ messages: [], context: {} }`
- **Response**: `{ success: true, message: "AI response", provider: "mock" }`

### Booking Endpoint
- **URL**: `POST http://localhost:3001/api/book-appointment`
- **Body**: `{ name, service, date, time, email, phone }`
- **Response**: `{ success: true, bookingId: "apt_123", message: "Booked!" }`

## Browser Console

Check browser console for helpful debugging info:
- AI provider being used (mock vs openai)
- API response details
- Error messages if any

## Common Issues & Solutions

### Backend Not Starting
```bash
# Check if port 3001 is free
lsof -ti:3001
# Kill any process using the port
kill -9 $(lsof -ti:3001)
# Restart
npm run server
```

### Frontend Can't Connect
- Ensure backend is running on port 3001
- Check browser console for CORS errors
- Verify API URLs in AIChatbot.tsx

### Chatbot Not Appearing
- Check browser console for JavaScript errors
- Ensure all imports are correct
- Try refreshing the page

## Success Indicators

✅ Backend starts without errors  
✅ Frontend loads at http://localhost:5173  
✅ Chat bubble appears in bottom-right  
✅ Chat window opens when clicked  
✅ AI responds to messages  
✅ Booking flow works end-to-end  

---

**The chatbot is now fully functional with mock AI service!** 🚀

You can test it immediately while working on getting a new OpenAI API key for production use.
