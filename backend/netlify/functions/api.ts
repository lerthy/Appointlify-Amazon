import serverless from 'serverless-http';
import app from './app.js';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
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

  const response = await serverlessHandler(event, context) as {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  };

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


