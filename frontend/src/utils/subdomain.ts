/**
 * Utility functions for subdomain handling and cross-domain navigation.
 */

const MAIN_DOMAIN = 'appointly-ks.com';

/**
 * Extract subdomain from the current hostname.
 * Handles:
 *   - mybusiness.appointly-ks.com       → "mybusiness"
 *   - mybusiness.localhost (local dev)   → "mybusiness"
 *   - appointly-ks.com / localhost       → null
 *   - www.appointly-ks.com              → null
 */
export function getSubdomain(): string | null {
  const host = window.location.hostname;
  const parts = host.split('.');

  // localhost with subdomain: mybusiness.localhost → 2 parts
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    if (['www', 'app', 'api'].includes(sub)) return null;
    return sub;
  }

  // Production: mybusiness.appointly-ks.com → 3+ parts
  if (parts.length >= 3) {
    const sub = parts[0];
    // Skip common infra subdomains
    if (['www', 'app', 'api', 'appointly-ks'].includes(sub)) return null;
    return sub;
  }

  // Case for local testing with custom etc/hosts: something.appointly-ks.com on 127.0.0.1
  if (host.includes(MAIN_DOMAIN)) {
    const sub = host.replace(`.${MAIN_DOMAIN}`, '');
    if (sub === host || ['www', 'app', 'api', MAIN_DOMAIN].includes(sub)) return null;
    return sub;
  }

  return null;
}

/**
 * Generate a URL pointing back to the main domain.
 * Ensures the correct protocol and port (for dev).
 */
export function getMainDomainUrl(path: string = '/'): string {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
  const protocol = window.location.protocol;
  
  if (isLocal) {
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//localhost${port}${path.startsWith('/') ? path : `/${path}`}`;
  }
  
  return `${protocol}//${MAIN_DOMAIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Check if the current context is a subdomain context.
 */
export function isSubdomainContext(): boolean {
  return getSubdomain() !== null;
}
