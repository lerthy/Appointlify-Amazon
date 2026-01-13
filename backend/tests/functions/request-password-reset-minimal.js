

let supabaseClient, crypto, nodemailer;
let loadingErrors = [];

// Test module loading
try {

  const supabase = require('@supabase/supabase-js');
  supabaseClient = supabase.createClient;

} catch (error) {
  console.error('❌ Supabase loading failed:', error.message);
  loadingErrors.push(`Supabase: ${error.message}`);
}

try {

  crypto = require('crypto');

} catch (error) {
  console.error('❌ Crypto loading failed:', error.message);
  loadingErrors.push(`Crypto: ${error.message}`);
}

try {

  nodemailer = require('nodemailer');

} catch (error) {
  console.error('❌ Nodemailer loading failed:', error.message);
  loadingErrors.push(`Nodemailer: ${error.message}`);
}



exports.handler = async (event) => {


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


    // Environment check
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
    };



    // Module availability check
    const moduleCheck = {
      supabase: !!supabaseClient,
      crypto: !!crypto,
      nodemailer: !!nodemailer,
    };



    const response = {
      ok: true,
      message: 'Diagnostic complete',
      environment: envCheck,
      modules: moduleCheck,
      loadingErrors: loadingErrors,
      nodeVersion: process.version,
      platform: process.platform
    };



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
