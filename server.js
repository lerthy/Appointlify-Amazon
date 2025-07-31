import express from 'express';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// SMS endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    // Format phone number to E.164 format
    const formattedPhone = to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`;
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone
    });
    
    res.json({ success: true, messageId: result.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); // Performance optimizations
// Performance optimizations
// Performance optimizations
