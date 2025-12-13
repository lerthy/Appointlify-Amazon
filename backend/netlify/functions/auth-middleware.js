// Authentication middleware for improved security
import crypto from 'crypto';

/**
 * Create signed request headers for secure API communication
 */
export function createSignedRequest(body, apiKey, secret) {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'x-timestamp': timestamp,
    'x-signature': signature
  };
}

/**
 * Validate signed request to prevent tampering and replay attacks
 */
export function validateSignedRequest(req, secret) {
  try {
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-timestamp');
    const apiKey = req.headers.get('x-api-key');

    if (!signature || !timestamp || !apiKey) {
      return { valid: false, error: 'Missing required headers' };
    }

    // Check for replay attacks (5 minute window)
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    if (now - requestTime > 300000) { // 5 minutes
      return { valid: false, error: 'Request expired' };
    }

    // Validate signature
    const body = req.body || '{}';
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return { valid: isValid, error: isValid ? null : 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Enhanced security headers for all responses
 */
export function getSecurityHeaders(origin = '*') {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-timestamp, x-signature'
  };
}

/**
 * Rate limiting with sliding window
 */
export class RateLimiter {
  constructor(maxRequests = 30, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(clientId) {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // Remove expired requests
    const validRequests = clientRequests.filter(
      time => now - time < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(clientId, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup(now);
    }

    return true;
  }

  cleanup(now) {
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        time => now - time < this.windowMs
      );
      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }
  }
}

/**
 * Security event logger
 */
export function logSecurityEvent(type, details, clientIp = 'unknown') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    clientIp,
    details,
    severity: getSeverity(type)
  };

} `);
  
  // In production, send critical events to monitoring
  if (logEntry.severity === 'HIGH') {
    // sendToMonitoring(logEntry);
  }
}

function getSeverity(eventType) {
  const highSeverity = [
    'UNAUTHORIZED_ACCESS',
    'SQL_INJECTION_ATTEMPT',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_SIGNATURE'
  ];
  
  return highSeverity.includes(eventType) ? 'HIGH' : 'MEDIUM';
}

/**
 * Input sanitization and validation
 */
export function sanitizeInput(input, type = 'string') {
  if (typeof input !== 'string') {
    return input;
  }
  
  switch (type) {
    case 'sql':
      // Remove SQL injection patterns
      return input.replace(/['"\\;]/g, '').trim();
    case 'email':
      return input.toLowerCase().trim();
    case 'name':
      return input.replace(/[<>'"&]/g, '').trim();
    default:
      return input.trim();
  }
}
