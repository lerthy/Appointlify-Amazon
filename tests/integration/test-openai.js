// Test script to verify OpenAI integration
// Run with: node test-openai.js

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenAI() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not found in .env file');
      console.log('Please add your OpenAI API key to the .env file');
      return;
    }

    console.log('🔑 OpenAI API Key found');
    console.log('🚀 Testing OpenAI connection...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful booking assistant. Respond briefly.'
        },
        {
          role: 'user',
          content: 'Hello, can you help me book an appointment?'
        }
      ],
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content;
    
    console.log('✅ OpenAI connection successful!');
    console.log('🤖 AI Response:', response);
    console.log('💰 Tokens used:', completion.usage);
    
  } catch (error) {
    console.log('❌ Error testing OpenAI:', error.message);
    
    if (error.status === 401) {
      console.log('🔑 Invalid API key. Please check your OPENAI_API_KEY in .env');
    } else if (error.status === 429) {
      console.log('💸 Rate limit or quota exceeded. Check your OpenAI account.');
    } else {
      console.log('🌐 Network or other error occurred.');
    }
  }
}

testOpenAI();
