import serverless from 'serverless-http';
import app from '../server.js';

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  const response = await serverlessHandler(event, context);

  const headers = response.headers || {};
  if (!headers['Access-Control-Allow-Origin']) {
    headers['Access-Control-Allow-Origin'] = process.env.FRONTEND_URL || '*';
  }
  if (!headers['Access-Control-Allow-Credentials']) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return {
    ...response,
    headers,
  };
};

export const config = { path: '/api/{proxy+}' };

