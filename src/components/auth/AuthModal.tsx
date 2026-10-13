import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, Lock, Mail, Eye, EyeOff, Sparkles, UserPlus, 
  LogIn, AlertCircle, CheckCircle2, UserCheck, Shield
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    setAuthModalOpen, 
    signInWithEmail, 
    signUpWithEmail, 
    signInAnonymously,
    isConfigured
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await signInWithEmail(cleanEmail, password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Successfully signed in!');
          setTimeout(() => {
            setAuthModalOpen(false);
          }, 800);
        }
      } else {
        const res = await signUpWithEmail(cleanEmail, password);
        if (res.error) {
          setError(res.error);
        } else if (res.confirmationRequired) {
          setSuccessMessage('Account created! Please check your email to confirm your account, then log in.');
        } else {
          setSuccessMessage('Account created and signed in!');
          setTimeout(() => {
            setAuthModalOpen(false);
          }, 800);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGuestLoading(true);
    try {
      const res = await signInAnonymously();
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage('Guest creator session activated!');
        setTimeout(() => {
          setAuthModalOpen(false);
        }, 800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Guest sign in failed';
      setError(msg);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-8 shadow-2xl text-slate-100 overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(199, 44, 85, 0.25), 0 0 40px rgba(232, 201, 130, 0.1)'
        }}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-gradient-to-b from-[#C72C55]/30 to-[#E8C982]/10 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#C72C55] to-[#E8C982] text-white shadow-lg mb-3">
            <Sparkles className="w-6 h-6 text-[#160D1F]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-elegant text-white tracking-wide">
            {mode === 'signin' ? 'Welcome Back, Creator' : 'Create Creator Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {mode === 'signin'
              ? 'Sign in to access, edit, and publish your birthday surprises from any device.'
              : 'Save your surprises safely to your account and manage them anywhere.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              Supabase credentials not configured in environment. Local browser persistence is active. Add <code className="text-amber-300">VITE_SUPABASE_URL</code> and <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> to enable remote cloud accounts.
            </span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-white/5 mb-5">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signin' 
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup' 
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-slate-800/90 border border-white/10 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full bg-slate-800/90 border border-white/10 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full bg-slate-800/90 border border-white/10 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Studio</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Studio Account</span>
              </>
            )}
          </button>
        </form>

        {/* Anonymous Guest Option */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-slate-400 mb-2">
            Want to create without an email right now?
          </p>
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={guestLoading}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-[#E8C982]" />
            <span>{guestLoading ? 'Starting Guest Session...' : 'Continue as Guest Creator'}</span>
          </button>
          <span className="block text-[10px] text-slate-500 mt-1">
            Anonymous session secured with Supabase Row Level Security.
          </span>
        </div>
      </div>
    </div>
  );
};
