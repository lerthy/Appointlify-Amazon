import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for MCP function"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Free embeddings using Hugging Face Inference API
async function getFreeEmbeddings(text) {
  try {
    // Use Hugging Face's free inference API for embeddings
    const response = await fetch("https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY || 'hf_demo'}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      }),
    });

    if (!response.ok) {
      // Fallback to a simple hash-based embedding if Hugging Face fails
      console.log("Hugging Face API failed, using fallback embedding");
      return getFallbackEmbedding(text);
    }

    const result = await response.json();
    
    // Handle different response formats
    if (Array.isArray(result)) {
      return result[0];
    } else if (result.embeddings) {
      return result.embeddings[0];
    } else if (Array.isArray(result[0])) {
      return result[0];
    }
    
    throw new Error("Unexpected response format from Hugging Face");
  } catch (error) {
    console.log("Hugging Face embedding failed, using fallback:", error.message);
    return getFallbackEmbedding(text);
  }
}

// Simple fallback embedding using text hashing (for when APIs fail)
function getFallbackEmbedding(text) {
  // Create a simple 384-dimensional embedding using text characteristics
  const embedding = new Array(384).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  // Simple hash-based embedding
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = word.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const index = Math.abs(hash) % 384;
    embedding[index] += 1 / (i + 1); // Weight by position
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

function getServer() {
  const server = new McpServer(
    { name: "supabase-mcp", version: "1.0.0" },
    { capabilities: { logging: {} } }
  );

  // Tool: fetch rows (read-only)
  server.tool(
    "fetch-table",
    "Select rows from a Supabase table with optional filters.",
    {
      table: z.string().min(1),
      select: z.string().default("*"),
      limit: z.number().int().positive().max(1000).default(100),
      eq: z.record(z.string()).optional(),
      ilike: z.record(z.string()).optional(),
      orderBy: z.string().optional(),
      ascending: z.boolean().default(true),
    },
    async ({ table, select, limit, eq, ilike, orderBy, ascending }) => {
      const supabase = getSupabaseServerClient();
      let query = supabase.from(table).select(select).limit(limit);
      if (eq) {
        for (const [col, val] of Object.entries(eq)) query = query.eq(col, val);
      }
      if (ilike) {
        for (const [col, val] of Object.entries(ilike))
          query = query.ilike(col, val);
      }
      if (orderBy) query = query.order(orderBy, { ascending });
      const { data, error } = await query;
      if (error) throw error;
      return { content: [{ type: "json", json: data ?? [] }] };
    }
  );

  // Tool: upsert row(s) (write)
  server.tool(
    "upsert-rows",
    "Upsert JSON rows into a table. Requires proper RLS/policies.",
    {
      table: z.string().min(1),
      rows: z.array(z.record(z.any())).min(1),
      onConflict: z.string().optional(),
    },
    async ({ table, rows, onConflict }) => {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from(table)
        .upsert(rows, onConflict ? { onConflict } : undefined)
        .select("*");
      if (error) throw error;
      return { content: [{ type: "json", json: data ?? [] }] };
    }
  );

  // RAG: ingest plain text into knowledge with embeddings
  server.tool(
    "ingest-text",
    "Embed and store text into the knowledge table for retrieval.",
    {
      source: z.string().min(1),
      content: z.string().min(1),
      metadata: z.record(z.any()).optional(),
    },
    async ({ source, content, metadata }) => {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
      const emb = await openai.embeddings.create({ model: embeddingModel, input: content });
      const vector = emb.data?.[0]?.embedding;
      if (!Array.isArray(vector)) throw new Error("Failed to create embedding");

      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("knowledge")
        .insert([{ source, content, metadata: metadata || {}, embedding: vector }])
        .select("id, source");
      if (error) throw error;
      return { content: [{ type: "json", json: data?.[0] || null }] };
    }
  );

  // RAG: query knowledge by semantic similarity
  server.tool(
    "query-knowledge",
    "Return top matching knowledge chunks for a question.",
    {
      question: z.string().min(1),
      matchCount: z.number().int().positive().max(10).default(5),
      minSimilarity: z.number().min(0).max(1).default(0)
    },
    async ({ question, matchCount, minSimilarity }) => {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
      const emb = await openai.embeddings.create({ model: embeddingModel, input: question });
      const vector = emb.data?.[0]?.embedding;
      if (!Array.isArray(vector)) throw new Error("Failed to create embedding");

      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.rpc("match_knowledge", {
        query_embedding: vector,
        match_count: matchCount,
        min_similarity: minSimilarity
      });
      if (error) throw error;
      return { content: [{ type: "json", json: data ?? [] }] };
    }
  );

  // Resource: project info
  server.resource(
    "project-info",
    "supabase://project-info",
    { mimeType: "application/json" },
    async () => {
      return {
        contents: [
          {
            uri: "supabase://project-info",
            text: JSON.stringify(
              {
                urlSet: Boolean(process.env.SUPABASE_URL),
                canWrite: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

// Handler functions for MCP tools
async function handleFetchTable(args) {
  const { table, select = "*", limit = 100, eq, ilike, orderBy, ascending = true } = args;
  const supabase = getSupabaseServerClient();
  let query = supabase.from(table).select(select).limit(limit);
  if (eq) {
    for (const [col, val] of Object.entries(eq)) query = query.eq(col, val);
  }
  if (ilike) {
    for (const [col, val] of Object.entries(ilike))
      query = query.ilike(col, val);
  }
  if (orderBy) query = query.order(orderBy, { ascending });
  const { data, error } = await query;
  if (error) throw error;
  return { content: [{ type: "json", json: data ?? [] }] };
}

async function handleUpsertRows(args) {
  const { table, rows, onConflict } = args;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, onConflict ? { onConflict } : undefined)
    .select("*");
  if (error) throw error;
  return { content: [{ type: "json", json: data ?? [] }] };
}

async function handleIngestText(args) {
  const { source, content, metadata } = args;
  
  try {
    console.log("Creating free embedding for:", source);
    const vector = await getFreeEmbeddings(content);
    
    if (!Array.isArray(vector)) {
      throw new Error("Failed to create embedding");
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("knowledge")
      .insert([{ source, content, metadata: metadata || {}, embedding: vector }])
      .select("id, source");
    if (error) throw error;
    
    console.log("Successfully ingested knowledge:", source);
    return { content: [{ type: "json", json: data?.[0] || null }] };
  } catch (error) {
    console.error("Error ingesting text:", error);
    throw new Error(`Failed to ingest knowledge: ${error.message}`);
  }
}

async function handleQueryKnowledge(args) {
  const { question, matchCount = 5, minSimilarity = 0 } = args;
  
  try {
    console.log("Creating free embedding for query:", question);
    const vector = await getFreeEmbeddings(question);
    
    if (!Array.isArray(vector)) {
      throw new Error("Failed to create embedding");
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("match_knowledge", {
      query_embedding: vector,
      match_count: matchCount,
      min_similarity: minSimilarity
    });
    if (error) throw error;
    
    console.log("Found", data?.length || 0, "knowledge matches");
    return { content: [{ type: "json", json: data ?? [] }] };
  } catch (error) {
    console.error("Error querying knowledge:", error);
    // Return empty results instead of throwing error
    return { content: [{ type: "json", json: [] }] };
  }
}

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const server = getServer();
    
    // Handle the MCP request directly
    if (body.method === "tools/call") {
      const { name, arguments: args } = body.params;
      
      try {
        let result;
        
        switch (name) {
          case "fetch-table":
            result = await handleFetchTable(args);
            break;
          case "upsert-rows":
            result = await handleUpsertRows(args);
            break;
          case "ingest-text":
            result = await handleIngestText(args);
            break;
          case "query-knowledge":
            result = await handleQueryKnowledge(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", result, id: body.id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Tool execution error:", error);
        return new Response(
          JSON.stringify({ 
            jsonrpc: "2.0", 
            error: { code: -32603, message: error.message }, 
            id: body.id 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: body.id }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("MCP error:", error);
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: "" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = { path: "/mcp" };
