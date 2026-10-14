import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getPageById, resolvePageAsync, savePage, savePageLocally, createNewBirthdayPage, areConfigsEqual } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { BasicDetailsTab } from '../components/editor/BasicDetailsTab';
import { JourneyTimelineTab } from '../components/editor/JourneyTimelineTab';
import { MediaManagerTab } from '../components/editor/MediaManagerTab';
import { ThemeCustomizerTab } from '../components/editor/ThemeCustomizerTab';
import { SectionManagerTab } from '../components/editor/SectionManagerTab';
import { PublishShareTab } from '../components/editor/PublishShareTab';
import { LivePreviewFrame } from '../components/editor/LivePreviewFrame';
import { ShareModal } from '../components/surprise/ShareModal';
import { PaymentUnlockModal } from '../components/editor/PaymentUnlockModal';
import { getStoredEditToken, storeEditToken, verifyTokenWithServer } from '../lib/paymentService';
import { 
  User, Image, Palette, Layers, Globe, Eye, Edit3, Save, 
  Sparkles, Check, ExternalLink, AlertCircle, RefreshCw, CheckCircle2,
  Lock, Copy, KeyRound, PlusCircle, ArrowLeft, ShieldCheck, Clock
} from 'lucide-react';

type TabKey = 'details' | 'journey' | 'media' | 'theme' | 'sections' | 'publish';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin, authToken } = useAuth();
  const [config, setConfig] = useState<BirthdayPageConfig>(DEFAULT_DEMO_CONFIG);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Access Control & Payment States
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tokenVerificationStatus, setTokenVerificationStatus] = useState<'checking' | 'valid' | 'invalid' | 'none'>('checking');
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [copiedSecretLink, setCopiedSecretLink] = useState(false);
  const [dismissSecretBanner, setDismissSecretBanner] = useState(false);
  
  // View mode state: on mobile default to 'editor-only', desktop default to 'split'
  const [viewMode, setViewMode] = useState<'split' | 'editor-only' | 'preview-only'>('split');
  const isSavingRef = useRef<boolean>(false);
  const isCloudPersistedRef = useRef<boolean>(false);
  const lastSavedConfigRef = useRef<BirthdayPageConfig>(config);
  const latestConfigRef = useRef<BirthdayPageConfig>(config);
  const userRef = useRef(user);
  userRef.current = user;

  // URL token or local stored token
  const urlToken = searchParams.get('token');
  const currentToken = urlToken || (id ? getStoredEditToken(id) : null);

  // Load configuration by ID with payment & edit token authorization
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      // 1. If visiting /editor with no ID, immediately initialize a new unique birthday page
      if (!id) {
        const created = createNewBirthdayPage('Best Friend');
        created.isPaid = false;
        if (userRef.current) created.userId = userRef.current.id;
        if (isMounted) {
          isCloudPersistedRef.current = false;
          setConfig(created);
          lastSavedConfigRef.current = created;
          latestConfigRef.current = created;
          setIsLoading(false);
          navigate(`/editor/${created.id}`, { replace: true });
        }
        return;
      }

      // 2. If visiting /editor with the default demo ID, fork it into a unique page so demo is never overwritten
      if (id === DEFAULT_DEMO_CONFIG.id) {
        const forked: BirthdayPageConfig = {
          ...DEFAULT_DEMO_CONFIG,
          id: `bday-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          slug: `celebration-${Math.floor(1000 + Math.random() * 9000)}`,
          isPublished: false,
          isPaid: false,
          userId: userRef.current?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        savePageLocally(forked);
        if (isMounted) {
          isCloudPersistedRef.current = false;
          setConfig(forked);
          lastSavedConfigRef.current = forked;
          latestConfigRef.current = forked;
          setIsLoading(false);
          navigate(`/editor/${forked.id}`, { replace: true });
        }
        return;
      }

      setIsLoading(true);

      // Fast sync local load
      const initial = getPageById(id);
      if (initial && isMounted) {
        setConfig(initial);
        lastSavedConfigRef.current = initial;
        latestConfigRef.current = initial;
      }

      // Full async resolution
      const resolved = await resolvePageAsync(id, { allowLocalFallback: true });
      let currentLoaded = resolved || initial;

      if (!currentLoaded && isMounted) {
        const created = createNewBirthdayPage('Best Friend');
        created.isPaid = false;
        if (userRef.current) created.userId = userRef.current.id;
        savePageLocally(created);
        currentLoaded = created;
      }

      if (isMounted && currentLoaded) {
        isCloudPersistedRef.current = isSupabaseConfigured && Boolean(currentLoaded.id);
        setConfig(currentLoaded);
        lastSavedConfigRef.current = currentLoaded;
        latestConfigRef.current = currentLoaded;

        // =========================================================================
        // AUTHORIZATION & PAYMENT CHECK
        // =========================================================================
        // Administrator always gets free, instant access
        if (isAdmin) {
          setIsAccessGranted(true);
          setShowPaymentModal(false);
          setTokenVerificationStatus('valid');
          setIsLoading(false);
          return;
        }

        const effectiveToken = urlToken || getStoredEditToken(currentLoaded.id) || currentLoaded.editToken;

        // If page is marked paid in database/local:
        if (currentLoaded.isPaid) {
          if (effectiveToken) {
            setTokenVerificationStatus('checking');
            const check = await verifyTokenWithServer(currentLoaded.id, effectiveToken, authToken);
            if (check.valid || check.isAdmin) {
              setIsAccessGranted(true);
              setShowPaymentModal(false);
              setTokenVerificationStatus('valid');
              storeEditToken(currentLoaded.id, effectiveToken);
              // Ensure token is synced into current config
              currentLoaded.editToken = effectiveToken;
              if (!urlToken) {
                setSearchParams({ token: effectiveToken }, { replace: true });
              }
            } else {
              setIsAccessGranted(false);
              setShowPaymentModal(false);
              setTokenVerificationStatus('invalid');
            }
          } else {
            setIsAccessGranted(false);
            setShowPaymentModal(false);
            setTokenVerificationStatus('none');
          }
        } else {
          // Unpaid page -> must pay ₹40 before editing
          setIsAccessGranted(false);
          setShowPaymentModal(true);
          setTokenVerificationStatus('none');
        }

        setIsLoading(false);
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [id, navigate, isAdmin, authToken, urlToken, setSearchParams]);

  // Handle successful ₹40 payment verification
  const handlePaymentSuccess = (result: { surpriseId: string; editToken: string; editUrl: string }) => {
    storeEditToken(result.surpriseId, result.editToken);
    setSearchParams({ token: result.editToken }, { replace: true });

    const updatedConfig: BirthdayPageConfig = {
      ...config,
      id: result.surpriseId,
      isPaid: true,
      editToken: result.editToken
    };

    setConfig(updatedConfig);
    latestConfigRef.current = updatedConfig;
    lastSavedConfigRef.current = updatedConfig;
    savePageLocally(updatedConfig);

    setShowPaymentModal(false);
    setIsAccessGranted(true);
    setTokenVerificationStatus('valid');

    // Trigger initial save to cloud
    savePage(updatedConfig, result.editToken).catch((err) => {
      console.warn('Initial post-payment cloud sync:', err);
    });
  };

  // Admin complimentary free unlock
  const handleAdminFreeUnlock = () => {
    const updatedConfig: BirthdayPageConfig = {
      ...config,
      isPaid: true
    };
    setConfig(updatedConfig);
    latestConfigRef.current = updatedConfig;
    savePageLocally(updatedConfig);
    setShowPaymentModal(false);
    setIsAccessGranted(true);
    setTokenVerificationStatus('valid');
  };

  // Creator manual token submission (if opening editor on a new browser without the full link)
  const handleUnlockWithManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;

    setTokenError(null);
    setTokenVerificationStatus('checking');

    const cleanToken = inputToken.trim();
    const check = await verifyTokenWithServer(config.id, cleanToken, authToken);

    if (check.valid || check.isAdmin) {
      storeEditToken(config.id, cleanToken);
      setSearchParams({ token: cleanToken }, { replace: true });
      const updated = { ...config, isPaid: true, editToken: cleanToken };
      setConfig(updated);
      latestConfigRef.current = updated;
      setIsAccessGranted(true);
      setShowPaymentModal(false);
      setTokenVerificationStatus('valid');
    } else {
      setTokenVerificationStatus('invalid');
      setTokenError('The edit token you entered is invalid for this birthday surprise.');
    }
  };

  // Copy secret edit link
  const secretEditLink = typeof window !== 'undefined'
    ? `${window.location.origin}/editor/${config.id}?token=${currentToken || config.editToken || ''}`
    : '';

  const handleCopySecretEditLink = () => {
    if (!secretEditLink) return;
    navigator.clipboard.writeText(secretEditLink);
    setCopiedSecretLink(true);
    setTimeout(() => setCopiedSecretLink(false), 2500);
  };

  // Explicit save action: persists data to Supabase ONLY on user manual action
  const executeSavePipeline = useCallback(async (customConfig?: BirthdayPageConfig) => {
    if (customConfig) {
      latestConfigRef.current = customConfig;
    }

    if (isSavingRef.current) {
      return;
    }

    const target = latestConfigRef.current;
    const effectiveToken = currentToken || target.editToken || null;

    if (isCloudPersistedRef.current && lastSavedConfigRef.current && areConfigsEqual(target, lastSavedConfigRef.current)) {
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setSaveMessage('Saved successfully!');
      setTimeout(() => {
        setSaveStatus((s) => s === 'saved' ? 'idle' : s);
        setSaveMessage(null);
      }, 2500);
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    setSaveMessage(null);

    try {
      const configToSave: BirthdayPageConfig = {
        ...target,
        isPaid: true,
        editToken: effectiveToken || undefined,
        updatedAt: new Date().toISOString()
      };

      const res = await savePage(configToSave, effectiveToken);
      if (res.success) {
        isCloudPersistedRef.current = isSupabaseConfigured;
        const savedConfig = res.config || configToSave;
        lastSavedConfigRef.current = savedConfig;
        latestConfigRef.current = savedConfig;
        setConfig(savedConfig);

        if (savedConfig.id !== id) {
          const newUrl = effectiveToken
            ? `/editor/${savedConfig.id}?token=${effectiveToken}`
            : `/editor/${savedConfig.id}`;
          navigate(newUrl, { replace: true });
        }

        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setSaveMessage('Saved successfully!');
        setTimeout(() => {
          setSaveStatus((s) => s === 'saved' ? 'idle' : s);
          setSaveMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        setSaveMessage(res.error || 'Failed to save changes. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Save error:', err);
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error during save';
      setSaveMessage(msg);
    } finally {
      isSavingRef.current = false;
    }
  }, [id, navigate, currentToken]);

  const handleExplicitSave = useCallback((customConfig?: BirthdayPageConfig) => {
    if (isSavingRef.current) return;
    executeSavePipeline(customConfig);
  }, [executeSavePipeline]);

  const handleUpdateConfig = useCallback((updated: Partial<BirthdayPageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated };
      latestConfigRef.current = merged;

      const hasActualChanges = !areConfigsEqual(merged, lastSavedConfigRef.current);
      setHasUnsavedChanges(hasActualChanges);

      savePageLocally(merged);
      return merged;
    });
  }, []);

  // Safe local backup on tab close or refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (latestConfigRef.current) {
        savePageLocally(latestConfigRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const tabs: { key: TabKey; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Basic Details', shortLabel: 'Details', icon: <User className="w-4 h-4 shrink-0" /> },
    { key: 'journey', label: 'Chapters of Our Journey', shortLabel: 'Journey', icon: <Clock className="w-4 h-4 shrink-0 text-[#E8C982]" /> },
    { key: 'media', label: 'Media & Audio', shortLabel: 'Media', icon: <Image className="w-4 h-4 shrink-0" /> },
    { key: 'theme', label: 'Themes & Styles', shortLabel: 'Themes', icon: <Palette className="w-4 h-4 shrink-0" /> },
    { key: 'sections', label: 'Section Manager', shortLabel: 'Sections', icon: <Layers className="w-4 h-4 shrink-0" /> },
    { key: 'publish', label: 'Publish & Share', shortLabel: 'Publish', icon: <Globe className="w-4 h-4 shrink-0" /> }
  ];

  const publicUrl = `${window.location.origin}/b/${config.slug || config.id}`;

  // =========================================================================
  // RENDER: Loading State
  // =========================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#160D1F] flex flex-col items-center justify-center text-[#E8C982] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#E8C982] border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">Loading Birthday Magic Studio…</span>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Payment Required Modal Screen
  // =========================================================================
  if (showPaymentModal && !isAccessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar config={config} isEditor={false} />
        <PaymentUnlockModal
          initialRecipientName={config.recipientName}
          surpriseId={config.id}
          slug={config.slug}
          initialConfig={config}
          isOpen={true}
          onSuccess={handlePaymentSuccess}
          onAdminFreeUnlock={handleAdminFreeUnlock}
        />
      </div>
    );
  }

  // =========================================================================
  // RENDER: Restricted Access Screen (Paid surprise, but edit token missing or invalid)
  // =========================================================================
  if (!isAccessGranted && !isAdmin) {
    if (showPaymentModal) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
          <Navbar config={config} isEditor={false} />
          <PaymentUnlockModal
            isOpen={true}
            surpriseId={config.id}
            slug={config.slug}
            initialConfig={config}
            initialRecipientName={config.recipientName}
            onSuccess={handlePaymentSuccess}
            onAdminFreeUnlock={handleAdminFreeUnlock}
            onUnlockWithToken={(token) => {
              setInputToken(token);
              verifyTokenWithServer(config.id, token, authToken).then((check) => {
                if (check.valid || check.isAdmin) {
                  storeEditToken(config.id, token);
                  setSearchParams({ token }, { replace: true });
                  const updated = { ...config, isPaid: true, editToken: token };
                  setConfig(updated);
                  latestConfigRef.current = updated;
                  setIsAccessGranted(true);
                  setShowPaymentModal(false);
                  setTokenVerificationStatus('valid');
                } else {
                  alert('The edit token you entered is invalid for this birthday surprise.');
                }
              });
            }}
            onClose={() => navigate('/')}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar config={config} isEditor={false} />
        
        <div className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 flex flex-col justify-center my-auto">
          <div className="bg-gradient-to-b from-slate-900 to-[#160D1F] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Creator Edit Access Required
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                This birthday surprise is protected from unauthorized changes. If you are the creator, enter your secret edit token below or open your bookmarked Secret Edit Link.
              </p>
            </div>

            {/* Clear Pricing & Edit Rule Callout */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#E8C982] shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-300 text-[13px]">
                  ₹40 per birthday surprise. Once purchased, you can edit that surprise again without paying.
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  If you previously created this surprise, you do not need to pay again—simply enter your secret edit token.
                </p>
              </div>
            </div>

            {/* Manual Token Unlock Form */}
            <form onSubmit={handleUnlockWithManualToken} className="space-y-3 pt-1 text-left">
              <label className="block text-xs font-semibold text-slate-300">
                Enter your Secret Edit Token
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="bday_edit_..."
                  className="w-full bg-slate-950 border border-white/20 focus:border-pink-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 font-mono outline-none"
                />
              </div>

              {tokenError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={tokenVerificationStatus === 'checking'}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-pink-500 hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {tokenVerificationStatus === 'checking' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Token…</span>
                  </>
                ) : (
                  <span>Unlock Creator Studio</span>
                )}
              </button>
            </form>

            {/* New Surprise Notice & Temporary Payment Unavailability */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-left">
                <p className="font-bold">Want to create a separate birthday surprise?</p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Payments are temporarily unavailable. Please try again later.
                </p>
              </div>

              <button
                type="button"
                disabled={true}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-400 bg-white/5 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2 opacity-75"
                title="Payments are temporarily unavailable. Please try again later."
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Create a New Surprise (₹40 - Temporarily Unavailable)</span>
              </button>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <Link to="/" className="hover:text-white transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Website</span>
                </Link>
                <Link to="/admin" className="text-amber-300/80 hover:text-amber-300 transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Full Unlocked Creator Studio
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        config={config}
        isEditor={true}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Secret Creator Edit Link Banner (Requirement 3: Creator retention & recovery) */}
      {!dismissSecretBanner && currentToken && (
        <div className="bg-gradient-to-r from-amber-500/15 via-pink-500/15 to-purple-500/15 border-b border-white/10 px-3 sm:px-6 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-lg bg-[#E8C982]/20 text-[#E8C982] shrink-0 font-bold">🔒 Private Link</span>
              <span className="text-slate-200 truncate">
                <strong>Your Secret Edit Link:</strong> Bookmark this link to edit this surprise in the future without paying again!
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopySecretEditLink}
                className="px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow"
                title="Copy secret edit link to clipboard"
              >
                {copiedSecretLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSecretLink ? 'Copied Secret Link!' : 'Copy Secret Edit Link'}</span>
              </button>
              <button
                onClick={() => setDismissSecretBanner(true)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Sub-Header Toolbar */}
      <div className="bg-slate-900/95 border-b border-white/10 px-3 sm:px-6 py-2.5 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Recipient Name & Save Status */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#E8C982] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                Editing: <span className="text-[#E8C982]">{config.recipientName || 'Friend'}</span>
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            {/* Save Status Badge */}
            <div className="flex items-center gap-1.5 text-xs shrink-0 font-medium" aria-live="polite">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400 animate-pulse font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold animate-in fade-in px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saved successfully</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30" title={saveMessage || 'Save failed'}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Save failed</span>
                </span>
              )}
              {saveStatus === 'idle' && (
                hasUnsavedChanges ? (
                  <span className="text-amber-300 font-semibold text-xs flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>Unsaved changes</span>
                  </span>
                ) : (
                  <span className="text-emerald-400/80 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>All changes saved</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right: Primary Save Button & Responsive View Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Explicit Save Changes Button */}
            <button
              onClick={() => handleExplicitSave()}
              disabled={saveStatus === 'saving'}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white ring-2 ring-pink-500/40 shadow-pink-500/20 active:scale-95'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
              title="Save all changes permanently"
            >
              {saveStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved successfully!' : 'Save Changes'}
              </span>
            </button>

            {/* Mobile View Switcher */}
            <div className="flex lg:hidden items-center bg-slate-950 p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('editor-only')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode !== 'preview-only' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setViewMode('preview-only')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'preview-only' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Desktop View Mode Toggle */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'split' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split Studio
              </button>
              <button
                onClick={() => setViewMode('editor-only')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'editor-only' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Editor Only
              </button>
              <button
                onClick={() => setViewMode('preview-only')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'preview-only' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Preview
              </button>
            </div>

            {/* Quick Open Live Page or Publish */}
            {config.isPublished ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 sm:px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-pink-500/15 hover:bg-pink-500/25 border-pink-500/40 text-pink-300"
                title="Open live published page in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Live Link</span>
              </a>
            ) : (
              <button
                onClick={() => setActiveTab('publish')}
                className="px-3 sm:px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300"
                title="Draft Mode — Click to publish and generate your shareable birthday link"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Publish to Share</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Save Feedback Toast / Alert Banner */}
        {saveMessage && (
          <div className="max-w-7xl mx-auto mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              saveStatus === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{saveMessage}</span>
              </div>
              <button
                onClick={() => setSaveMessage(null)}
                className="text-xs opacity-70 hover:opacity-100 px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form Editor */}
          {viewMode !== 'preview-only' && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'} space-y-5 w-full min-w-0`}>
              {/* Horizontally Scrollable Tab Navigation Strip */}
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar scroll-smooth">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none touch-target ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 font-bold scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span className="whitespace-nowrap sm:inline hidden">{tab.label}</span>
                    <span className="whitespace-nowrap sm:hidden inline">{tab.shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Panel */}
              <div className="animate-in fade-in duration-200">
                {activeTab === 'details' && (
                  <BasicDetailsTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'journey' && (
                  <JourneyTimelineTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'media' && (
                  <MediaManagerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'theme' && (
                  <ThemeCustomizerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'sections' && (
                  <SectionManagerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'publish' && (
                  <PublishShareTab
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    onPublishSuccess={(publishedConfig) => {
                      isCloudPersistedRef.current = true;
                      lastSavedConfigRef.current = publishedConfig;
                      latestConfigRef.current = publishedConfig;
                      setConfig(publishedConfig);
                      setHasUnsavedChanges(false);
                      setSaveStatus('saved');
                      setSaveMessage('Surprise published successfully to cloud!');
                      setTimeout(() => {
                        setSaveStatus((s) => s === 'saved' ? 'idle' : s);
                        setSaveMessage(null);
                      }, 3000);
                      if (publishedConfig.id !== id) {
                        const newUrl = currentToken
                          ? `/editor/${publishedConfig.id}?token=${currentToken}`
                          : `/editor/${publishedConfig.id}`;
                        navigate(newUrl, { replace: true });
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Right Column: Interactive Live Device Preview */}
          {(viewMode === 'preview-only' || (viewMode === 'split' && window.innerWidth >= 1024)) && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5 lg:sticky lg:top-32' : 'col-span-12'} w-full`}>
              <LivePreviewFrame config={config} />
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        config={config}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicUrl={publicUrl}
        onPublishSuccess={(publishedConfig) => {
          isCloudPersistedRef.current = true;
          lastSavedConfigRef.current = publishedConfig;
          latestConfigRef.current = publishedConfig;
          setConfig(publishedConfig);
          setHasUnsavedChanges(false);
          setSaveStatus('saved');
          setSaveMessage('Surprise published successfully to cloud!');
          setTimeout(() => {
            setSaveStatus((s) => s === 'saved' ? 'idle' : s);
            setSaveMessage(null);
          }, 3000);
          if (publishedConfig.id !== id) {
            const newUrl = currentToken
              ? `/editor/${publishedConfig.id}?token=${currentToken}`
              : `/editor/${publishedConfig.id}`;
            navigate(newUrl, { replace: true });
          }
        }}
      />
    </div>
  );
};
