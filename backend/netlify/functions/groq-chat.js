import Groq from "groq-sdk";

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "*";

export default async (req) => {
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
    return new Response(null, { status: 200, headers: securityHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: securityHeaders }
    );
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid or empty JSON body" }),
        { status: 400, headers: securityHeaders }
      );
    }
    const { question, businessId } = body;

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'question' in body" }),
        { status: 400, headers: securityHeaders }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY_BUSINESS || process.env.GROQ_CHAT_API_KEY || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: securityHeaders }
      );
    }

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
        content: JSON.stringify({ question, structuredData: dataPayload }),
      },
    ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_BUSINESS_MODEL || process.env.GROQ_CHAT_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages,
      temperature: 0.2,
      max_tokens: 400,
    });

    const text = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ answer: text, data: dataPayload }),
      { status: 200, headers: securityHeaders }
    );
  } catch (err) {
    console.error("groq-chat error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: securityHeaders }
    );
  }
};

export const config = { path: "/groq-chat" };


