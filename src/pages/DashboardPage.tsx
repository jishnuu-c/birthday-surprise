import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { 
  getAllPages, 
  getAllPagesAsync, 
  createNewBirthdayPage, 
  deletePage, 
  savePage 
} from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit3, Eye, Copy, Trash2, CopyPlus, Gift, Calendar, 
  Check, Search, Heart, RefreshCw,
  LogIn, LogOut, Sparkles, User
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isConfigured, openAuthModal, signOut } = useAuth();
  const [pages, setPages] = useState<BirthdayPageConfig[]>(getAllPages());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');

  const refreshPages = async () => {
    setIsLoading(true);
    try {
      const all = await getAllPagesAsync();
      setPages(all);
    } catch (err) {
      console.warn('Failed to refresh dashboard pages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPages();
  }, [user?.id]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRecipientName.trim() || 'My Best Friend';
    const created = createNewBirthdayPage(name);
    if (user) {
      created.userId = user.id;
    }
    // Sync to cloud if configured
    await savePage(created).catch(() => {});
    setShowNewModal(false);
    setNewRecipientName('');
    navigate(`/editor/${created.id}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the birthday page for "${name}"?`)) {
      await deletePage(id);
      await refreshPages();
    }
  };

  const handleClone = async (page: BirthdayPageConfig) => {
    const cloned: BirthdayPageConfig = {
      ...page,
      id: `bday-${Date.now().toString(36)}`,
      slug: `${page.slug}-copy-${Math.floor(100 + Math.random() * 900)}`,
      recipientName: `${page.recipientName} (Copy)`,
      userId: user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await savePage(cloned);
    await refreshPages();
  };

  const handleCopyLink = (slugOrId: string) => {
    const url = `${window.location.origin}/b/${slugOrId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slugOrId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPages = pages.filter((p) =>
    p.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-white/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-sm sm:text-base truncate">Birthday Magic Studio</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Connection Status Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]">
              {isConfigured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-medium">Supabase Cloud</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-300 font-medium">Local Storage</span>
                </>
              )}
            </div>

            {/* User Account Controls */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs">
                <User className="w-3.5 h-3.5 text-[#E8C982]" />
                <span className="text-slate-200 text-xs hidden sm:inline max-w-[120px] truncate">
                  {user.email || 'Guest User'}
                </span>
                <button
                  onClick={() => signOut()}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-[#E8C982]" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => setShowNewModal(true)}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Create New Surprise</span>
              <span className="xs:hidden inline">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {/* Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-elegant">
                Your Birthday Surprise Pages
              </h1>
              <button
                onClick={refreshPages}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh pages"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-pink-400' : ''}`} />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Create and manage personalized interactive experiences for everyone you cherish.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or slug..."
              className="w-full bg-slate-900 border border-white/10 focus:border-pink-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Informational Banner if Not Logged In */}
        {isConfigured && !user && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-[#E8C982]/10 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#E8C982] shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Cloud Sync Enabled</h4>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Sign in or start a guest session to save your surprises permanently to your account across all devices.
                </p>
              </div>
            </div>
            <button
              onClick={openAuthModal}
              className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
            >
              Sign In / Guest Session
            </button>
          </div>
        )}

        {/* Empty State */}
        {filteredPages.length === 0 && (
          <div className="rounded-3xl bg-slate-900/60 border border-white/10 p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No pages found</h3>
            <p className="text-xs text-slate-400 mb-5">
              {searchQuery ? 'No birthday surprises match your search query.' : 'You haven’t created any birthday surprises yet.'}
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-lg shadow-pink-500/25 cursor-pointer"
            >
              Create First Surprise ✨
            </button>
          </div>
        )}

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredPages.map((page) => {
            const publicUrl = `${window.location.origin}/b/${page.slug || page.id}`;

            return (
              <div
                key={page.id}
                className="rounded-3xl glass-panel border border-white/10 hover:border-pink-500/40 p-4 sm:p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shrink-0">
                        {page.profilePhotoUrl ? (
                          <img
                            src={page.profilePhotoUrl}
                            alt={page.recipientName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-pink-500/20 text-pink-300">
                            <Heart className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-pink-300 transition-colors truncate">
                          {page.recipientName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono truncate">/b/{page.slug || page.id}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                        page.isPublished
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {page.isPublished ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  {/* Date or details */}
                  <div className="space-y-1 text-xs text-slate-400 pb-4 border-b border-white/10">
                    {page.birthDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-pink-400" />
                        <span>Date: {page.birthDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>Updated: {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/editor/${page.id}`}
                      className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors touch-target"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors touch-target flex items-center justify-center"
                      title="Preview Page"
                    >
                      <Eye className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(page.slug || page.id)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer touch-target flex items-center justify-center"
                      title="Copy Public Link"
                    >
                      {copiedId === (page.slug || page.id) ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => handleClone(page)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer touch-target flex items-center justify-center"
                      title="Duplicate Page"
                    >
                      <CopyPlus className="w-4 h-4" />
                    </button>
                  </div>

                  {pages.length > 1 && (
                    <button
                      onClick={() => handleDelete(page.id, page.recipientName)}
                      className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer touch-target flex items-center justify-center"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Create New Birthday Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateNew}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create Birthday Surprise</h3>
                <p className="text-xs text-slate-400">Who are you celebrating today?</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Birthday Person's Name *
              </label>
              <input
                type="text"
                autoFocus
                required
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                placeholder="e.g. Emma, Liam, Mom, Alex"
                className="w-full bg-slate-950 border border-white/15 focus:border-pink-500 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all active:scale-95 cursor-pointer"
              >
                Start Customizing ✨
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
