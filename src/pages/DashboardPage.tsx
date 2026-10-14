import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig, PaymentRecord } from '../types';
import { deletePage, createNewBirthdayPage } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Edit3, Eye, Copy, Trash2, Gift, Calendar, 
  Check, Search, RefreshCw, LogIn, LogOut, Sparkles, 
  ShieldCheck, Lock, AlertCircle, IndianRupee, CreditCard,
  Layers, Globe, CheckCircle2, ArrowLeft, ExternalLink
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, authToken, adminSignIn, adminSignOut } = useAuth();
  
  // Admin Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Admin Dashboard States
  const [activeTab, setActiveTab] = useState<'surprises' | 'payments'>('surprises');
  const [surprises, setSurprises] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalSurprises: 0,
    totalPublished: 0,
    totalPaid: 0,
    totalRevenue: 0
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Complimentary Surprise Modal
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [freeRecipientName, setFreeRecipientName] = useState('');
  const [isCreatingFree, setIsCreatingFree] = useState(false);

  // Fetch admin dashboard data from server API
  const fetchDashboardData = async () => {
    if (!isAdmin || !authToken) return;

    setIsLoadingData(true);
    try {
      const res = await fetch('/api/admin', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          setSurprises(data.surprises || []);
          setPayments(data.payments || []);
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin && authToken) {
      fetchDashboardData();
    }
  }, [isAdmin, authToken]);

  // Handle Admin Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);

    try {
      const { error } = await adminSignIn(loginEmail, loginPassword);
      if (error) {
        setLoginError(error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setLoginError(msg);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Create complimentary surprise as admin (Bypasses ₹40 fee via backend)
  const handleCreateComplimentary = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = freeRecipientName.trim() || 'Special Friend';
    setIsCreatingFree(true);

    try {
      const draft = createNewBirthdayPage(name);
      draft.isPaid = true;

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'create_free',
          recipientName: name,
          config: draft
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.surpriseId) {
        setShowFreeModal(false);
        setFreeRecipientName('');
        navigate(data.editUrl || `/editor/${data.surpriseId}`);
      } else {
        alert(data.error || 'Failed to create complimentary surprise.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating surprise';
      alert(msg);
    } finally {
      setIsCreatingFree(false);
    }
  };

  const handleDeleteSurprise = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await deletePage(id);
      await fetchDashboardData();
    }
  };

  const handleCopyLink = (slugOrId: string) => {
    const url = `${window.location.origin}/b/${slugOrId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slugOrId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // =========================================================================
  // VIEW 1: Loading
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center text-[#E8C982]">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8C982] border-t-transparent animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Admin Login Form (No public signup provided)
  // =========================================================================
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
        <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Public Website</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#160D1F] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-white">Administrator Portal</h1>
              <p className="text-xs text-slate-400">
                Authorized administrator login only. Public account creation is not available.
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full bg-slate-950 border border-white/20 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-white/20 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-[#E8C982] hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingLogin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Log In to Admin Dashboard</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-500">
              <span>Public visitors can browse and create surprises without logging in.</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: Protected Admin Dashboard
  // =========================================================================
  const filteredSurprises = surprises.filter((p) =>
    (p.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900/90 border-b border-white/10 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-slate-950 shadow-md font-black">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                <span>Birthday Magic</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Admin</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowFreeModal(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-[#E8C982] text-slate-950 hover:brightness-110 flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Free as Admin</span>
            </button>

            <button
              onClick={() => adminSignOut()}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Log Out of Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Total Surprises</span>
            <div className="text-2xl sm:text-3xl font-black text-white">{metrics.totalSurprises}</div>
            <span className="text-[10px] text-slate-500 block">Created across platform</span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Published Live</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{metrics.totalPublished}</div>
            <span className="text-[10px] text-slate-500 block">Accessible by recipients</span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Paid Orders</span>
            <div className="text-2xl sm:text-3xl font-black text-pink-400">{metrics.totalPaid}</div>
            <span className="text-[10px] text-slate-500 block">Verified ₹40 creations</span>
          </div>

          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent space-y-1">
            <span className="text-xs text-amber-300 font-medium">Total Revenue</span>
            <div className="text-2xl sm:text-3xl font-black text-[#E8C982]">₹{metrics.totalRevenue}</div>
            <span className="text-[10px] text-amber-300/70 block">Cryptographically verified</span>
          </div>
        </div>

        {/* Tab Controls: Surprises vs Payments */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-2xl border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab('surprises')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'surprises'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Surprises ({surprises.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Razorpay Payments ({payments.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient or slug..."
                className="w-full bg-slate-900 border border-white/10 focus:border-amber-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 outline-none"
              />
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={isLoadingData}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: Surprises Management Table */}
        {activeTab === 'surprises' && (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Public URL</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSurprises.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No birthday surprises found.
                      </td>
                    </tr>
                  ) : (
                    filteredSurprises.map((s) => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {s.recipient_name || 'Friend'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-pink-300">
                          /b/{s.slug || s.id}
                        </td>
                        <td className="py-3.5 px-4">
                          {s.is_admin_created ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Admin Free
                            </span>
                          ) : s.is_paid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Paid ₹40
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Unpaid Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.is_published
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {s.is_published ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Free Admin Edit Access */}
                            <Link
                              to={`/editor/${s.id}`}
                              className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-semibold flex items-center gap-1 transition-colors text-[11px]"
                              title="Edit as Admin (Free)"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </Link>

                            <a
                              href={`/b/${s.slug || s.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                              title="Open Live Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => handleCopyLink(s.slug || s.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Copy Public Link"
                            >
                              {copiedId === (s.slug || s.id) ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteSurprise(s.id, s.recipient_name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                              title="Delete Page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Razorpay Payment Transactions Table */}
        {activeTab === 'payments' && (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Surprise ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans text-xs">
                        No payment records found yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 text-slate-200">{p.razorpay_order_id}</td>
                        <td className="py-3.5 px-4 text-emerald-300">{p.razorpay_payment_id || '—'}</td>
                        <td className="py-3.5 px-4 text-pink-300">{p.surprise_id || '—'}</td>
                        <td className="py-3.5 px-4 font-sans font-bold text-white">
                          ₹{(p.amount || 4000) / 100}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                            p.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Admin Complimentary Surprise Modal */}
      {showFreeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateComplimentary}
            className="w-full max-w-md bg-gradient-to-b from-slate-900 to-[#160D1F] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create Complimentary Surprise</h3>
                <p className="text-xs text-slate-400">Administrator Free Creation (Bypasses ₹40 fee)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Recipient Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={freeRecipientName}
                onChange={(e) => setFreeRecipientName(e.target.value)}
                placeholder="e.g. VIP Guest, Best Friend, Sister"
                className="w-full bg-slate-950 border border-white/20 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFreeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingFree}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isCreatingFree ? 'Creating…' : 'Generate Free Surprise ✨'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
