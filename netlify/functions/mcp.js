import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

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
  } catch (error) {
    if (error.code === 'insufficient_quota' || error.status === 429) {
      console.log("OpenAI quota exceeded, cannot create embeddings");
      throw new Error("OpenAI quota exceeded. Please check your billing and add credits to use knowledge base features.");
    }
    throw error;
  }
}

async function handleQueryKnowledge(args) {
  const { question, matchCount = 5, minSimilarity = 0 } = args;
  
  try {
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
  } catch (error) {
    if (error.code === 'insufficient_quota' || error.status === 429) {
      console.log("OpenAI quota exceeded, returning empty knowledge results");
      return { content: [{ type: "json", json: [] }] };
    }
    throw error;
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
