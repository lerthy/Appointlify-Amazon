import { supabase } from '../supabaseClient.js';

function getSubdomain(host) {
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  const subdomain = parts[0];
  if (['www', 'app', 'api', 'appointly-ks'].includes(subdomain)) return null;
  return subdomain;
}

export const subdomainResolver = async (req, res, next) => {
  const host = req.headers.host;
  const subdomain = getSubdomain(host);
  if (!subdomain) {
    req.business = undefined;
    return next();
  }
  if (!supabase) {
    req.business = undefined;
    return next();
  }
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
