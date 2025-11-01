const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

exports.handler = async (event) => {
  // Set security headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    if (!supabase) {
      console.error('Supabase client not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const nowIso = new Date().toISOString();
    
    // Clean up expired tokens (older than current time)
    const { data: deletedTokens, error: deleteError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', nowIso)
      .select('token');

    if (deleteError) {
      console.error('Error cleaning up expired tokens:', deleteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to cleanup expired tokens' })
      };
    }

    // Also clean up tokens that are older than 24 hours regardless of status
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: oldTokens, error: oldTokenError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('created_at', twentyFourHoursAgo)
      .select('token');

    if (oldTokenError) {
      console.error('Error cleaning up old tokens:', oldTokenError);
      // Don't fail the request for this
    }

    const expiredCount = deletedTokens ? deletedTokens.length : 0;
    const oldCount = oldTokens ? oldTokens.length : 0;
    const totalCleaned = expiredCount + oldCount;

    console.log(`Cleaned up ${totalCleaned} tokens (${expiredCount} expired, ${oldCount} old)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true, 
        cleaned: totalCleaned,
        expired: expiredCount,
        old: oldCount,
        message: `Successfully cleaned up ${totalCleaned} expired password reset tokens`
      })
    };

  } catch (error) {
    console.error('Token cleanup error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error during cleanup' })
    };
  }
};
