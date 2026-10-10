import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, Home, Sparkles } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center select-none">
      <div className="relative mb-6">
        <Gift className="w-20 h-20 text-pink-500 animate-bounce" />
        <div className="absolute -inset-4 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-elegant">
        Surprise Page Not Found
      </h1>
      <p className="mt-3 text-slate-400 text-sm max-w-md leading-relaxed">
        The birthday surprise link you entered may have expired, or the custom URL has been changed.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-pink-500/25 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>View Sample Surprise</span>
        </Link>

        <Link
          to="/dashboard"
          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>Go to Studio Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
