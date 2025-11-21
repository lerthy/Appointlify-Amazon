import { supabase } from '../supabaseClient.js';

function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const alt = req.headers['x-supabase-access-token'];
  if (alt && typeof alt === 'string') return alt;
  return null;
}

export async function attachSupabaseUser(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token || !supabase?.auth) {
      return next();
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next();
    }

    req.supabaseUser = data.user;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (profile) {
      req.appUser = profile;
    }
  } catch (error) {
    console.error('[attachSupabaseUser] failed:', error.message);
  } finally {
    next();
  }
}

export async function requireSupabaseIdentity(req, res, next) {
  await attachSupabaseUser(req, res, () => {});
  if (!req.supabaseUser) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

export async function requireSupabaseUser(req, res, next) {
  await requireSupabaseIdentity(req, res, () => {});
  if (!req.appUser) {
    return res.status(404).json({ success: false, error: 'User profile missing' });
  }
  next();
}

