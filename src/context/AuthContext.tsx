import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  authToken: string | null;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  adminSignOut: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function parseAdminEmails(envValue?: string | null): string[] {
  if (!envValue) return [];
  return envValue
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'));
}

export function getClientAdminEmails(): string[] {
  const emails = [
    ...parseAdminEmails(import.meta.env.VITE_ADMIN_EMAIL),
    ...parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS)
  ];
  if (emails.length > 0) {
    return Array.from(new Set(emails));
  }
  return ['admin@gmail.com'];
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = async (
    currentUser: User | null,
    accessToken?: string | null
  ): Promise<{ authorized: boolean; reason?: string }> => {
    if (!currentUser || !currentUser.email) {
      return { authorized: false, reason: 'No authenticated user session found.' };
    }

    const userEmail = currentUser.email.trim().toLowerCase();
    const adminEmails = getClientAdminEmails();

    // 1. Check configured admin email allowlist
    if (adminEmails.includes(userEmail)) {
      return { authorized: true };
    }

    // 2. Check Supabase app_metadata role (tamper-proof, set via Supabase Dashboard / SQL)
    const appRole = String(currentUser.app_metadata?.role || '').trim().toLowerCase();
    if (appRole === 'admin' || currentUser.app_metadata?.is_admin === true) {
      return { authorized: true };
    }

    // 3. Check public.admin_users table in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: rowById } = await supabase
          .from('admin_users')
          .select('id, email')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (rowById && rowById.id) {
          return { authorized: true };
        }

        // Also check by email in case row was inserted with email
        const { data: rowByEmail } = await supabase
          .from('admin_users')
          .select('id, email')
          .ilike('email', userEmail)
          .maybeSingle();

        if (rowByEmail && rowByEmail.id) {
          return { authorized: true };
        }
      } catch (dbErr) {
        console.warn('admin_users database check notice:', dbErr);
      }
    }

    // 4. Backend verification fallback via /api/admin
    if (accessToken && typeof fetch !== 'undefined') {
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ action: 'verify' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.authorized) {
            return { authorized: true };
          }
        }
      } catch {
        // ignore network error
      }
    }

    return {
      authorized: false,
      reason: `Access denied: Signed in as "${currentUser.email}", but this email is not in the authorized administrator allowlist (VITE_ADMIN_EMAIL), nor found in the admin_users database table, nor assigned an admin role in Supabase.`
    };
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Fetch current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      const admin = await checkAdminStatus(currentUser, session?.access_token);
      setIsAdmin(admin.authorized);
      setIsLoading(false);
    }).catch((err) => {
      console.warn('Failed to retrieve Supabase auth session:', err);
      setIsLoading(false);
    });

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      const admin = await checkAdminStatus(currentUser, session?.access_token);
      setIsAdmin(admin.authorized);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const adminSignIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured. Please add your credentials in .env.' };
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { error: 'Please enter your administrator email.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        return { error: `Authentication failed: ${error.message}` };
      }

      if (!data.user) {
        return { error: 'Authentication failed: No user returned by Supabase.' };
      }

      const authCheck = await checkAdminStatus(data.user, data.session?.access_token);
      if (!authCheck.authorized) {
        // Sign out if not an authorized administrator
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        return {
          error: authCheck.reason || 'Access denied: Only authorized administrators may log in.'
        };
      }

      setUser(data.user);
      setSession(data.session);
      setIsAdmin(true);
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin login failed';
      return { error: msg };
    }
  };

  const adminSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  const authToken = session?.access_token || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        authToken,
        adminSignIn,
        adminSignOut,
        signOut: adminSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
