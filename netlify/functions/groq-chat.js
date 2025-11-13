const Groq = require("groq-sdk");

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    headers: new Map(Object.entries(event.headers)),
    json: async () => JSON.parse(event.body || "{}"),
    url: `https://${event.headers.host}${event.path}`
  };
  const securityHeaders = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return { statusCode: 200, headers: securityHeaders, body: "" };
  }

  if (req.method === "GET") {
    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify({ 
        status: "groq-chat function is running",
        method: "POST",
        expectedBody: { question: "string", businessId: "optional" },
        envCheck: {
          groqKey: !!process.env.GROQ_API_KEY_BUSINESS || !!process.env.GROQ_CHAT_API_KEY || !!process.env.GROQ_API_KEY,
          supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      })
    };
  }

  if (req.method !== "POST") {
    return {
      statusCode: 405,
      headers: securityHeaders,
      body: JSON.stringify({ error: "Method not allowed. Use POST with JSON body or GET for status." })
    };
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify({ error: "Invalid or empty JSON body" })
      };
    }
    const { question, businessId } = body;
    if (!question || typeof question !== "string") {
      return {
        statusCode: 400,
        headers: securityHeaders,
        body: JSON.stringify({ error: "Missing 'question' in body" })
      };
    }

    const groqApiKey = process.env.GROQ_API_KEY_BUSINESS || process.env.GROQ_CHAT_API_KEY || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return {
        statusCode: 500,
        headers: securityHeaders,
        body: JSON.stringify({ error: "GROQ_API_KEY not configured" })
      };
    }

    // Ask the data function for structured info relevant to the question
    const dataFnUrl = new URL("/.netlify/functions/business-data", req.url);
    const dataRes = await fetch(dataFnUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, businessId }),
    });

    let dataPayload = null;
    if (dataRes.ok) {
      dataPayload = await dataRes.json();
    }

    const systemPrompt = `You are a helpful business analytics assistant. 
You answer concisely in plain language based on provided structured business data.
If needed, summarize trends and provide a short takeaway. If there is no relevant data, be honest.`;

    const groq = new Groq({ apiKey: groqApiKey });

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          question,
          structuredData: dataPayload,
        }),
      },
    ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_BUSINESS_MODEL || process.env.GROQ_CHAT_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages,
      temperature: 0.2,
      max_tokens: 400,
    });

    const text = completion.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    return {
      statusCode: 200,
      headers: securityHeaders,
      body: JSON.stringify({ answer: text, data: dataPayload })
    };
  } catch (err) {
    console.error("groq-chat error", err);
    return {
      statusCode: 500,
      headers: securityHeaders,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};


