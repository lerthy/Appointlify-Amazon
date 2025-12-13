import { supabase } from '../supabaseClient.js';
import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '../config/googleConfig.js';

function ensureDb() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
}

/**
 * Create or get Supabase auth user from Google id_token
 * Returns the Supabase auth user object
 */
export async function getOrCreateSupabaseAuthUser(idToken, email, name, picture) {
  ensureDb();

  if (!idToken) {
    throw new Error('Google id_token required');
  }

  // Verify the Google id_token
  const client = new OAuth2Client(googleConfig.clientId);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: googleConfig.clientId,
    });
  } catch (error) {
    throw new Error(`Invalid Google id_token: ${error.message}`);
  }

  const payload = ticket.getPayload();
  const googleSub = payload.sub;
  const verifiedEmail = payload.email || email;

  if (!verifiedEmail) {
    throw new Error('Email is required from Google profile');
  }

  // First, try to find existing user by email
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError && existingUsers?.users) {
    const existingUser = existingUsers.users.find(u => u.email === verifiedEmail);
    if (existingUser) {

      // Update metadata to include Google info
      try {
        await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            provider: 'google',
            google_sub: googleSub,
            picture: picture || payload.picture || existingUser.user_metadata?.picture,
            name: name || payload.name || existingUser.user_metadata?.name,
          },
          app_metadata: {
            ...existingUser.app_metadata,
            provider: 'google',
            providers: Array.from(new Set([...(existingUser.app_metadata?.providers || []), 'google'])),
          },
        });
      } catch (updateErr) {
        console.warn('[getOrCreateSupabaseAuthUser] Failed to update user metadata:', updateErr.message);
        // Continue anyway - user exists and we can use them
      }
      return existingUser;
    }
  }

  // User doesn't exist, create new one
  try {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: verifiedEmail,
      email_confirm: true, // Auto-confirm since Google already verified
      user_metadata: {
        name: name || payload.name,
        picture: picture || payload.picture,
        provider: 'google',
        google_sub: googleSub,
      },
      app_metadata: {
        provider: 'google',
        providers: ['google'],
      },
    });

    if (createError) {
      // If creation fails, try one more time to find the user (race condition)
      if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
        const { data: retryUsers } = await supabase.auth.admin.listUsers();
        const retryUser = retryUsers?.users?.find(u => u.email === verifiedEmail);
        if (retryUser) {

          return retryUser;
        }
      }
      throw new Error(`Failed to create Supabase auth user: ${createError.message}`);
    }

    return newUser.user;
  } catch (err) {
    // Final fallback: try to get user one more time
    const { data: finalUsers } = await supabase.auth.admin.listUsers();
    const finalUser = finalUsers?.users?.find(u => u.email === verifiedEmail);
    if (finalUser) {

      return finalUser;
    }
    throw err;
  }
}

export async function getOrCreateUserProfile(authUser, overrides = {}) {
  ensureDb();
  if (!authUser?.id) {
    throw new Error('Supabase auth user missing');
  }

  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const payload = {
    auth_user_id: authUser.id,
    email: authUser.email,
    name: overrides.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Google User',
    signup_method: overrides.signupMethod || 'google',
  };

  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSignupMethod(userId, signupMethod) {
  ensureDb();
  const { error } = await supabase
    .from('users')
    .update({ signup_method: signupMethod })
    .eq('id', userId);
  if (error) throw error;
}

