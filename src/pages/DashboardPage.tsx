import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getAllPages, createNewBirthdayPage, deletePage, savePageLocally } from '../lib/storage';
import { Plus, Edit3, Eye, Copy, Trash2, CopyPlus, Gift, Calendar, Check, Search, Heart } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<BirthdayPageConfig[]>(getAllPages());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');

  const refreshPages = () => {
    setPages(getAllPages());
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRecipientName.trim() || 'My Best Friend';
    const created = createNewBirthdayPage(name);
    setShowNewModal(false);
    setNewRecipientName('');
    navigate(`/editor/${created.id}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the birthday page for "${name}"?`)) {
      deletePage(id);
      refreshPages();
    }
  };

  const handleClone = (page: BirthdayPageConfig) => {
    const cloned: BirthdayPageConfig = {
      ...page,
      id: `bday-${Date.now().toString(36)}`,
      slug: `${page.slug}-copy-${Math.floor(100 + Math.random() * 900)}`,
      recipientName: `${page.recipientName} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    savePageLocally(cloned);
    refreshPages();
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900/80 border-b border-white/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-white shadow-md">
              <Gift className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-base">Birthday Magic Studio</span>
          </Link>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Birthday Surprise</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-elegant">
              Your Birthday Surprise Pages
            </h1>
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
              className="w-full bg-slate-900 border border-white/10 focus:border-pink-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => {
            const publicUrl = `${window.location.origin}/b/${page.slug || page.id}`;

            return (
              <div
                key={page.id}
                className="rounded-3xl glass-panel border border-white/10 hover:border-pink-500/40 p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shrink-0">
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
                      <div>
                        <h3 className="font-bold text-base text-slate-100 group-hover:text-pink-300 transition-colors">
                          {page.recipientName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">/b/{page.slug || page.id}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
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
                <div className="pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/editor/${page.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Preview Page"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(page.slug || page.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy Public Link"
                    >
                      {copiedId === (page.slug || page.id) ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleClone(page)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Duplicate Page"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pages.length > 1 && (
                    <button
                      onClick={() => handleDelete(page.id, page.recipientName)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNew}
            className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
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
