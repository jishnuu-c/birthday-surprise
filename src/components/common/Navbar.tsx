import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Edit3, Share2, Eye, LogOut, ShieldCheck, Plus } from 'lucide-react';
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
  const { user, isAdmin, adminSignOut } = useAuth();
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
          {/* Create Surprise CTA Button for Public Visitors */}
          {!isEditor && (
            <Link
              to="/editor"
              className="px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white flex items-center gap-1.5 shadow-md shadow-pink-500/25 active:scale-95 transition-all cursor-pointer"
              title="Create a new interactive Birthday Surprise (₹40)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Surprise <span className="text-[#E8C982] font-black">(₹40)</span></span>
            </Link>
          )}

          {/* Recipient View vs Editor Studio Toggle */}
          {isEditor ? (
            <Link
              to={`/b/${currentSlug}`}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                config.isPublished
                  ? 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border-pink-500/40'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
              }`}
              title={config.isPublished ? "Preview Live Page" : "Preview Draft Link"}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">{config.isPublished ? 'Live View' : 'Draft View'}</span>
            </Link>
          ) : (
            <Link
              to={`/editor/${config.id}`}
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Customize & Edit"
            >
              <Edit3 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span className="hidden xs:inline">Edit Surprise</span>
            </Link>
          )}

          {/* Share Modal Trigger */}
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1.5 border border-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Share</span>
            </button>
          )}

          {/* Admin Dashboard & Status (Only visible if administrator is logged in) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 border-l border-white/15">
              <Link
                to="/admin"
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                  location.pathname === '/admin' || location.pathname === '/dashboard'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-300 hover:bg-white/10'
                }`}
                title="Admin Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <button
                onClick={() => adminSignOut()}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Admin Log Out"
                aria-label="Admin Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
