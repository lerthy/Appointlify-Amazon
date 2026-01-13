import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabaseClient.js';

// Extend Express Request type to include business
declare global {
  namespace Express {
    interface Request {
      business?: any;
    }
  }
}

// Helper to extract subdomain from host
function getSubdomain(host?: string): string | null {
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (["www", "app", "api", "appointly-ks"].includes(subdomain)) return null;
  return subdomain;
}

export const subdomainResolver = async (req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host;
  const subdomain = getSubdomain(host);
  if (!subdomain) {
    req.business = undefined;
    return next();
  }
  // Query business by subdomain
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
    if (error || !data) {
      req.business = undefined;
      return res.status(404).json({ error: 'Business not found' });
    }
    req.business = data;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error resolving business subdomain' });
  }
};
