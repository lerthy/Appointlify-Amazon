import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { user_id, status, reason } = body;
    if (!user_id || !status) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_id and status required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Supabase env missing' }) };
    }

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const updates = {
      verification_status: status,
      verification_reason: reason || null,
      verified_at: status === 'verified' ? new Date().toISOString() : null
    };

    const { error } = await sb.from('users').update(updates).eq('id', user_id);
    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}


