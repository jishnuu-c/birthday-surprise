import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Edit3, Share2, Eye, LayoutGrid } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';

interface NavbarProps {
  config: BirthdayPageConfig;
  onOpenShareModal?: () => void;
  isEditor?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  onOpenShareModal,
  isEditor = false
}) => {
  const location = useLocation();
  const currentSlug = config.slug || config.id;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/70 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-amber-200 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-white tracking-wide flex items-center gap-1">
              <span>Birthday Magic</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-pink-500/20 text-pink-300 rounded font-semibold border border-pink-500/30">PRO</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block">Interactive Birthday Experience</span>
          </div>
        </Link>

        {/* Right Navigation & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* My Pages Link */}
          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              location.pathname === '/dashboard'
                ? 'bg-white/20 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All Birthdays</span>
          </Link>

          {/* Recipient View vs Editor Studio Toggle */}
          {isEditor ? (
            <Link
              to={`/b/${currentSlug}`}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-500/40 flex items-center gap-1.5 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Live Page</span>
            </Link>
          ) : (
            <Link
              to={`/editor/${config.id}`}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-pink-400" />
              <span>Customize / Edit</span>
            </Link>
          )}

          {/* Share Modal Trigger */}
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
