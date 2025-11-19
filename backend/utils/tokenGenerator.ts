import crypto from 'crypto';

/**
 * Generates a secure random token for email/appointment verification
 * @param length - Length of the token (default: 32 bytes = 64 hex characters)
 * @returns Secure random token string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a token expiration timestamp
 * @param hoursFromNow - Number of hours from now (default: 24 hours)
 * @returns ISO timestamp string
 */
export function generateTokenExpiry(hoursFromNow: number = 24): string {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry.toISOString();
}

/**
 * Checks if a token has expired
 * @param expiryDate - ISO timestamp string
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

/**
 * Generates a short numeric code for SMS verification
 * @param length - Number of digits (default: 6)
 * @returns Numeric verification code
 */
export function generateNumericCode(length: number = 6): string {
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code.toString();
}

/**
 * Hashes a token for secure storage (optional additional security)
 * @param token - Plain token string
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

