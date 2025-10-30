import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = JSON.parse(event.body || '{}');
    const required = ['business_name', 'business_email', 'phone', 'business_address', 'category', 'owner_name'];
    for (const f of required) {
      if (!body[f]) return { statusCode: 400, headers, body: JSON.stringify({ error: `Missing ${f}` }) };
    }

    const insertRow = {
      id: randomUUID(),
      name: body.business_name,
      email: body.business_email,
      phone: body.phone,
      business_address: body.business_address,
      website: body.website || null,
      category: body.category,
      owner_name: body.owner_name,
      verification_status: 'pending',
      created_at: new Date().toISOString()
    };

    const { error } = await sb.from('users').insert([insertRow]);
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: insertRow.id }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}


