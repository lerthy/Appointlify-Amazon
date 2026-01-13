// Script to ingest sample knowledge into MCP knowledge base
// Run with: node ingest-sample-knowledge.js

import dotenv from 'dotenv';

dotenv.config();

const sampleKnowledge = [
  {
    source: "business-policies",
    content: "We accept most major insurance plans including Blue Cross Blue Shield, Aetna, and Cigna. Please bring your insurance card to your appointment.",
    metadata: { category: "insurance", priority: "high" }
  },
  {
    source: "appointment-guidelines",
    content: "Please arrive 15 minutes early for your appointment. Bring a valid ID and any relevant medical records. Late arrivals may result in rescheduling.",
    metadata: { category: "appointment", priority: "high" }
  },
  {
    source: "cancellation-policy",
    content: "Appointments can be cancelled up to 24 hours in advance without penalty. Same-day cancellations may incur a $25 fee.",
    metadata: { category: "cancellation", priority: "medium" }
  },
  {
    source: "business-hours",
    content: "We are open Monday through Friday 8:00 AM to 6:00 PM, Saturday 9:00 AM to 3:00 PM. We are closed on Sundays and major holidays.",
    metadata: { category: "hours", priority: "high" }
  },
  {
    source: "services-overview",
    content: "We offer comprehensive healthcare services including general consultations, specialized treatments, preventive care, and follow-up visits. Each service is tailored to your specific needs.",
    metadata: { category: "services", priority: "high" }
  },
  {
    source: "payment-options",
    content: "We accept cash, credit cards, debit cards, and HSA/FSA cards. Payment is due at the time of service unless other arrangements have been made.",
    metadata: { category: "payment", priority: "medium" }
  },
  {
    source: "emergency-procedures",
    content: "For medical emergencies, please call 911 or go to your nearest emergency room. For urgent but non-emergency concerns, call our office during business hours.",
    metadata: { category: "emergency", priority: "high" }
  },
  {
    source: "follow-up-care",
    content: "Follow-up appointments are typically scheduled 1-2 weeks after your initial visit. We will contact you to schedule if needed, or you can call our office.",
    metadata: { category: "follow-up", priority: "medium" }
  }
];

async function ingestKnowledge() {
  try {


    const mcpUrl = 'https://appointly-ks.netlify.app/mcp';

    let successCount = 0;
    let errorCount = 0;

    for (const item of sampleKnowledge) {


      const mcpRequest = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "ingest-text",
          arguments: {
            source: item.source,
            content: item.content,
            metadata: item.metadata
          }
        }
      };

      try {
        const response = await fetch(mcpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcpRequest)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.result) {

            successCount++;
          } else {

            errorCount++;
          }
        } else {

          errorCount++;
        }
      } catch (error) {

        errorCount++;
      }

      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
    }






    if (successCount > 0) {






    }

  } catch (error) {
    console.error('❌ Ingest failed:', error.message);

  }
}

ingestKnowledge();
