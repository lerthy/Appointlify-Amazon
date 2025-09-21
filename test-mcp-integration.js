// Test script to verify MCP integration with chat function
// Run with: node test-mcp-integration.js

import dotenv from 'dotenv';

dotenv.config();

async function testMCPIntegration() {
  try {
    console.log('🧪 Testing MCP Integration with Chat Function...\n');

    // Test 1: Direct MCP function call
    console.log('1️⃣ Testing MCP function directly...');
    const mcpUrl = process.env.NETLIFY_URL ? 
      `${process.env.NETLIFY_URL}/.netlify/functions/mcp` : 
      'http://localhost:8888/.netlify/functions/mcp';

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
      console.log('✅ MCP function is accessible');
      console.log('📊 MCP Response:', JSON.stringify(mcpResult, null, 2));
    } else {
      console.log('❌ MCP function failed:', mcpResponse.status);
    }

    console.log('\n2️⃣ Testing Chat function with MCP integration...');
    
    // Test 2: Chat function with MCP integration
    const chatUrl = process.env.NETLIFY_URL ? 
      `${process.env.NETLIFY_URL}/.netlify/functions/chat` : 
      'http://localhost:8888/.netlify/functions/chat';

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
      console.log('✅ Chat function is working');
      console.log('🤖 AI Response:', chatResult.message);
      console.log('🔧 Provider:', chatResult.provider);
      console.log('📚 MCP Knowledge Used:', chatResult.mcpKnowledgeUsed || 0);
      console.log('📊 Context:', chatResult.context);
    } else {
      console.log('❌ Chat function failed:', chatResponse.status);
      const errorText = await chatResponse.text();
      console.log('Error details:', errorText);
    }

    console.log('\n3️⃣ Testing with different question types...');
    
    // Test 3: Different question types to trigger MCP knowledge queries
    const testQuestions = [
      'What are your business hours?',
      'How do I cancel an appointment?',
      'What should I bring to my appointment?',
      'Do you accept insurance?'
    ];

    for (const question of testQuestions) {
      console.log(`\n🔍 Testing: "${question}"`);
      
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
        console.log(`✅ Response: ${testResult.message.substring(0, 100)}...`);
        console.log(`📚 Knowledge used: ${testResult.mcpKnowledgeUsed || 0}`);
      } else {
        console.log(`❌ Failed: ${testResponse.status}`);
      }
    }

    console.log('\n🎉 MCP Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- MCP function provides RAG capabilities');
    console.log('- Chat function now queries MCP for relevant knowledge');
    console.log('- Responses include knowledge base information');
    console.log('- You can see MCP usage in the response metadata');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your Netlify site is deployed');
    console.log('2. Check that NETLIFY_URL is set in your environment');
    console.log('3. Verify MCP function is accessible');
    console.log('4. Check Netlify function logs for errors');
  }
}

testMCPIntegration();
