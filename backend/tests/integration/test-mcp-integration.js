// Test script to verify MCP integration with chat function
// Run with: node test-mcp-integration.js

import dotenv from 'dotenv';

dotenv.config();

async function testMCPIntegration() {
  try {


    // Test 1: Direct MCP function call

    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';

    const mcpRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "query-knowledge",
        arguments: {
          question: "appointment booking",
          matchCount: 3,
          minSimilarity: 0.1
        }
      }
    };

    const mcpResponse = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpRequest)
    });

    if (mcpResponse.ok) {
      const mcpResult = await mcpResponse.json();
      
      );
    } else {

    }



    // Test 2: Chat function with MCP integration
    const chatUrl = 'https://appointly-ks.netlify.app/.netlify/functions/chat';

    const chatRequest = {
      messages: [
        { role: 'user', content: 'Hello! I need help booking an appointment. What services do you offer?' }
      ],
      context: {
        businessName: 'Test Business',
        services: [
          { name: 'Consultation', price: 50, duration: 30 },
          { name: 'Treatment', price: 100, duration: 60 }
        ],
        availableTimes: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM']
      }
    };

    const chatResponse = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatRequest)
    });

    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();





    } else {

      const errorText = await chatResponse.text();

    }



    // Test 3: Different question types to trigger MCP knowledge queries
    const testQuestions = [
      'What are your business hours?',
      'How do I cancel an appointment?',
      'What should I bring to my appointment?',
      'Do you accept insurance?'
    ];

    for (const question of testQuestions) {


      const testRequest = {
        messages: [
          { role: 'user', content: question }
        ],
        context: {}
      };

      const testResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRequest)
      });

      if (testResponse.ok) {
        const testResult = await testResponse.json();
      }...`);
        
      } else {
        
      }
    }

    
    
    
    
    
    

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    
    
    
    
  }
}

testMCPIntegration();
