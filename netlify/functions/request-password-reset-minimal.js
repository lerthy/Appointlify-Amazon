console.log('Function loading...');

let supabaseClient, crypto, nodemailer;
let loadingErrors = [];

// Test module loading
try {
  console.log('Loading @supabase/supabase-js...');
  const supabase = require('@supabase/supabase-js');
  supabaseClient = supabase.createClient;
  console.log('✅ Supabase loaded');
} catch (error) {
  console.error('❌ Supabase loading failed:', error.message);
  loadingErrors.push(`Supabase: ${error.message}`);
}

try {
  console.log('Loading crypto...');
  crypto = require('crypto');
  console.log('✅ Crypto loaded');
} catch (error) {
  console.error('❌ Crypto loading failed:', error.message);
  loadingErrors.push(`Crypto: ${error.message}`);
}

try {
  console.log('Loading nodemailer...');
  nodemailer = require('nodemailer');
  console.log('✅ Nodemailer loaded');
} catch (error) {
  console.error('❌ Nodemailer loading failed:', error.message);
  loadingErrors.push(`Nodemailer: ${error.message}`);
}

console.log('All modules loaded, setting up handler...');

exports.handler = async (event) => {
  console.log('Handler called');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Processing request...');
    
    // Environment check
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
    };

    console.log('Environment check:', envCheck);

    // Module availability check
    const moduleCheck = {
      supabase: !!supabaseClient,
      crypto: !!crypto,
      nodemailer: !!nodemailer,
    };

    console.log('Module check:', moduleCheck);

    const response = {
      ok: true,
      message: 'Diagnostic complete',
      environment: envCheck,
      modules: moduleCheck,
      loadingErrors: loadingErrors,
      nodeVersion: process.version,
      platform: process.platform
    };

    console.log('Returning response:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Handler error:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Handler failed',
        message: error.message,
        stack: error.stack,
        loadingErrors: loadingErrors
      }, null, 2)
    };
  }
};
