import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  openAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  signInAnonymously: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.warn('Failed to retrieve Supabase auth session:', err);
      setIsLoading(false);
    });

    // 2. Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = () => setAuthModalOpen(true);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured. Please add your credentials in .env.' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { error: msg };
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<{ error: string | null; confirmationRequired?: boolean }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured. Please add your credentials in .env.' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        return { error: error.message };
      }
      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        return { error: null, confirmationRequired: false };
      }
      return { error: null, confirmationRequired: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      return { error: msg };
    }
  };

  const signInAnonymously = async (): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Supabase is not configured' };
    }
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        return { error: error.message };
      }
      setUser(data.user);
      setSession(data.session);
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Anonymous sign in failed';
      return { error: msg };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        authModalOpen,
        setAuthModalOpen,
        openAuthModal,
        signInWithEmail,
        signUpWithEmail,
        signInAnonymously,
        signOut
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
