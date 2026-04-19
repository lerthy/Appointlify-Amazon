import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext<any>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('user');
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore sign-out errors (e.g. no Supabase session)
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const validateStoredUser = async () => {
      const stored = localStorage.getItem('user');
      if (!stored) {
        setLoading(false);
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(stored);
      } catch {
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      if (!parsed?.id) {
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(parsed.id)}`);
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.ok && data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else if (res.status === 404) {
          // Row removed from DB while client still had localStorage session
          await clearSession();
        } else {
          // Server error or transient failure — keep session (same as offline)
          setUser(parsed);
        }
      } catch {
        if (cancelled) return;
        // Offline or server unreachable: keep restored session so the app stays usable
        setUser(parsed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    validateStoredUser();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = (callback?: () => void) => {
    setUser(null);
    localStorage.removeItem('user');
    void supabase.auth.signOut().catch(() => {});
    if (callback) {
      callback();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return { user: null, login: () => {}, logout: () => {}, loading: true };
  }
  return context;
};
