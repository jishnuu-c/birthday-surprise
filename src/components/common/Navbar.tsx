import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Edit3, Share2, Eye, LayoutGrid, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
  const { user, openAuthModal, signOut, isConfigured } = useAuth();
  const currentSlug = config.slug || config.id;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#160D1F]/85 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-amber-200 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide flex items-center gap-1">
              <span>Birthday Magic</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 bg-[#E8C982]/20 text-[#E8C982] rounded font-bold border border-[#E8C982]/30">VIP</span>
            </span>
            <span className="text-[10px] text-slate-400 hidden md:block">Interactive Birthday Experience</span>
          </div>
        </Link>

        {/* Right Navigation & Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* My Pages Link */}
          <Link
            to="/dashboard"
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              location.pathname === '/dashboard'
                ? 'bg-white/20 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="All Birthdays Dashboard"
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Recipient View vs Editor Studio Toggle */}
          {isEditor ? (
            <Link
              to={`/b/${currentSlug}`}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/40 flex items-center gap-1.5 transition-all"
              title="Preview Live Page"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Live View</span>
            </Link>
          ) : (
            <Link
              to={`/editor/${config.id}`}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Customize & Edit"
            >
              <Edit3 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span className="hidden xs:inline">Edit Page</span>
            </Link>
          )}

          {/* Share Modal Trigger */}
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Share</span>
            </button>
          )}

          {/* User Auth Action Button */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 border-l border-white/10">
              <span 
                className="text-[11px] text-slate-300 font-medium hidden md:inline max-w-[120px] truncate"
                title={user.email || 'Guest User'}
              >
                {user.email ? user.email.split('@')[0] : 'Guest'}
              </span>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign In or Create Account"
            >
              <LogIn className="w-3.5 h-3.5 text-[#E8C982]" />
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
