import serverless from 'serverless-http';
import app from './app.js';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Log all incoming requests
  console.log('=== API FUNCTION CALLED ===');
  console.log('api.ts: Function invoked at:', new Date().toISOString());
  console.log('api.ts: HTTP Method:', event.httpMethod);
  console.log('api.ts: Path:', event.path);
  console.log('api.ts: Raw path:', event.rawPath);
  console.log('api.ts: Body exists:', !!event.body);
  console.log('api.ts: Body type:', typeof event.body);
  if (event.path?.includes('chat')) {
    console.log('api.ts: Chat request detected');
    console.log('api.ts: Body length:', event.body?.length || 0);
    console.log('api.ts: Body sample:', typeof event.body === 'string' ? event.body.substring(0, 200) : JSON.stringify(event.body).substring(0, 200));
  }
  
  // Handle CORS preflight (OPTIONS) requests
  if (event.httpMethod === 'OPTIONS') {
    const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
    const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*')
      .split(',')
      .map(o => o.trim().replace(/\/$/, ''))
      .filter(Boolean);
    
    let allowedOrigin = '*';
    if (requestOrigin && allowedOrigins.length > 0) {
      const normalizedRequestOrigin = requestOrigin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.some(origin => {
        const normalizedOrigin = origin.replace(/\/$/, '');
        return normalizedOrigin === normalizedRequestOrigin || origin === '*';
      });
      if (isAllowed) {
        allowedOrigin = normalizedRequestOrigin;
      }
    } else if (process.env.FRONTEND_URL) {
      allowedOrigin = process.env.FRONTEND_URL.replace(/\/$/, '');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  let response;
  try {
    response = await serverlessHandler(event, context) as {
      statusCode?: number;
      headers?: Record<string, string>;
      body?: string;
    };
    console.log('api.ts: Serverless handler response status:', response?.statusCode);
  } catch (handlerError: any) {
    console.error('api.ts: Error in serverless handler:', {
      message: handlerError?.message,
      stack: handlerError?.stack
    });
    // Return error response
    const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': requestOrigin || '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: handlerError?.message || 'Unknown error'
      })
    };
  }

  const headers = response.headers || {};
  
  // Get the origin from the request event
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  
  // Determine the allowed origin
  let allowedOrigin = '*';
  if (requestOrigin && allowedOrigins.length > 0) {
    // Check if the request origin is in the allowed list
    const normalizedRequestOrigin = requestOrigin.replace(/\/$/, ''); // Remove trailing slash
    const isAllowed = allowedOrigins.some(origin => {
      const normalizedOrigin = origin.replace(/\/$/, ''); // Remove trailing slash
      return normalizedOrigin === normalizedRequestOrigin || origin === '*';
    });
    if (isAllowed) {
      allowedOrigin = normalizedRequestOrigin;
    }
  } else if (process.env.FRONTEND_URL) {
    allowedOrigin = process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  
  if (!headers['Access-Control-Allow-Origin']) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  if (!headers['Access-Control-Allow-Credentials']) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  if (!headers['Access-Control-Allow-Methods']) {
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  }
  if (!headers['Access-Control-Allow-Headers']) {
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  return {
    ...response,
    headers,
  };
};

export const config = { path: '/api/{proxy+}' };


