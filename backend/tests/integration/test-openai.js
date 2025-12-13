// Test script to verify OpenAI integration
// Run with: node test-openai.js

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenAI() {
  try {
    if (!process.env.OPENAI_API_KEY) {


      return;
    }




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





  } catch (error) {


    if (error.status === 401) {

    } else if (error.status === 429) {

    } else {

    }
  }
}

testOpenAI();
