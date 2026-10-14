import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { resolvePageDetailsAsync, resolvePageAsync, getPageById } from '../lib/storage';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { ThemeBackground } from '../components/common/ThemeBackground';
import { FloatingMusicPlayer } from '../components/common/FloatingMusicPlayer';
import { GiftBoxLanding } from '../components/surprise/GiftBoxLanding';
import { CelebrationHero } from '../components/surprise/CelebrationHero';
import { Sparkles, Heart, Gift, Lock, ArrowRight, HelpCircle, RefreshCw, AlertTriangle, Edit3 } from 'lucide-react';

// Lazy-load below-the-fold sections to ensure rapid first-screen load and 60 FPS gift opening transition
const PhotoGallery = lazy(() => import('../components/surprise/PhotoGallery').then(m => ({ default: m.PhotoGallery })));
const VideoSurprise = lazy(() => import('../components/surprise/VideoSurprise').then(m => ({ default: m.VideoSurprise })));
const PersonalLetter = lazy(() => import('../components/surprise/PersonalLetter').then(m => ({ default: m.PersonalLetter })));
const MemoryTimeline = lazy(() => import('../components/surprise/MemoryTimeline').then(m => ({ default: m.MemoryTimeline })));
const BirthdayCake = lazy(() => import('../components/surprise/BirthdayCake').then(m => ({ default: m.BirthdayCake })));
const SpecialReasons = lazy(() => import('../components/surprise/SpecialReasons').then(m => ({ default: m.SpecialReasons })));
const ScratchSurprise = lazy(() => import('../components/surprise/ScratchSurprise').then(m => ({ default: m.ScratchSurprise })));
const FinalCelebration = lazy(() => import('../components/surprise/FinalCelebration').then(m => ({ default: m.FinalCelebration })));
const ShareModal = lazy(() => import('../components/surprise/ShareModal').then(m => ({ default: m.ShareModal })));

type PageStatus = 'loading' | 'success' | 'unpublished' | 'not_found' | 'error' | 'invalid_slug';

export const PublicSurprisePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const isHomepageDemo = !slug;

  const [config, setConfig] = useState<BirthdayPageConfig | null>(() => {
    // If on homepage without slug, display the sample demo
    if (isHomepageDemo) return DEFAULT_DEMO_CONFIG;

    // Instant synchronous bootstrap ONLY if portable #data= hash is present in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.startsWith('#data=') || search.includes('data=')) {
        try {
          const payload = hash.startsWith('#data=')
            ? hash.replace('#data=', '')
            : new URLSearchParams(search).get('data') || '';
          if (payload) {
            const json = decodeURIComponent(escape(atob(payload)));
            const parsed = JSON.parse(json) as BirthdayPageConfig;
            if (parsed && parsed.recipientName) {
              return parsed;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // For public share links, NEVER initialize with DEFAULT_DEMO_CONFIG or stale localStorage!
    return null;
  });

  const [pageStatus, setPageStatus] = useState<PageStatus>(() => {
    if (isHomepageDemo) return 'success';
    if (config) return 'success';
    return 'loading';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasOpenedGift, setHasOpenedGift] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [passcodeEntered, setPasscodeEntered] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);

  const loadData = useCallback(async (forceFresh = false) => {
    // 1. Root landing page without slug -> render demo sample
    if (!slug) {
      setConfig(DEFAULT_DEMO_CONFIG);
      document.title = DEFAULT_DEMO_CONFIG.pageTitle;
      setPageStatus('success');
      setErrorMessage(null);
      return;
    }

    if (!slug.trim()) {
      setPageStatus('invalid_slug');
      setErrorMessage('Missing birthday link slug in URL');
      return;
    }

    setPageStatus('loading');
    setErrorMessage(null);

    // 2. Target slug or ID specified: fetch strictly from Supabase cloud database
    // allowLocalFallback: false ensures unauthenticated visitors never load stale draft content as published
    try {
      const result = await resolvePageDetailsAsync(slug, { allowLocalFallback: false, forceFresh });

      if (result.status === 'success' && result.config) {
        setConfig(result.config);
        document.title = result.config.pageTitle || `Happy Birthday, ${result.config.recipientName}! ✨`;
        setPageStatus('success');
        if (!result.config.passcode) {
          setIsPasscodeUnlocked(true);
        }
        return;
      }

      if (result.status === 'unpublished') {
        // Page exists in draft mode but has not been published yet
        setConfig(result.config);
        setPageStatus('unpublished');
        return;
      }

      if (result.status === 'error') {
        // Supabase network failure, HTTP 429 rate limit, or database error
        setConfig(null);
        setErrorMessage(result.error || 'Database connection error while loading birthday page');
        setPageStatus('error');
        return;
      }

      if (result.status === 'invalid_slug') {
        setConfig(null);
        setPageStatus('invalid_slug');
        return;
      }

      // Page genuinely does not exist in Supabase
      setConfig(null);
      setPageStatus('not_found');
    } catch (err: unknown) {
      console.warn('Load data unexpected error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to query database';
      setConfig(null);
      setErrorMessage(msg);
      setPageStatus('error');
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preload primary celebration media and below-the-fold code chunks while viewing Gift Landing
  useEffect(() => {
    if (!config) return;
    if (config.profilePhotoUrl && config.profilePhotoUrl.startsWith('http')) {
      const img = new Image();
      img.src = config.profilePhotoUrl;
    }

    // Preload below-the-fold modules in background after initial render during browser idle
    const preloadTimer = window.setTimeout(() => {
      const preloadChunks = () => {
        import('../components/surprise/PhotoGallery');
        import('../components/surprise/VideoSurprise');
        import('../components/surprise/PersonalLetter');
        import('../components/surprise/MemoryTimeline');
        import('../components/surprise/BirthdayCake');
        import('../components/surprise/SpecialReasons');
        import('../components/surprise/ScratchSurprise');
        import('../components/surprise/FinalCelebration');
      };
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadChunks);
      } else {
        preloadChunks();
      }
    }, 1000);

    return () => window.clearTimeout(preloadTimer);
  }, [config]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config?.passcode) return;
    if (passcodeEntered.trim() === config.passcode.trim()) {
      setIsPasscodeUnlocked(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  // 1. Loading screen
  if (pageStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#160D1F] flex flex-col items-center justify-center text-[#FFF8F0] p-4 select-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#C72C55] to-[#E8C982] flex items-center justify-center text-[#160D1F] shadow-2xl shadow-[#C72C55]/30 animate-bounce">
            <Gift className="w-8 h-8" />
          </div>
          <div className="absolute -inset-4 bg-[#E8C982]/20 rounded-full blur-xl animate-pulse" />
        </div>
        <p className="mt-6 text-xs sm:text-sm font-bold tracking-widest text-[#E8C982] uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E8C982] animate-spin" style={{ animationDuration: '4s' }} />
          <span>Unwrapping Birthday Surprise...</span>
        </p>
      </div>
    );
  }

  // 2. Invalid or missing slug in URL
  if (pageStatus === 'invalid_slug') {
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-pink-500/20 border border-white/15 flex items-center justify-center mx-auto mb-5 text-[#E8C982]">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-elegant text-white mb-2">
            Invalid Birthday Link
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            No birthday page address was specified in the link. Please check the URL or create a new celebration.
          </p>
          <div className="space-y-3">
            <Link
              to="/editor"
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create a Birthday Surprise</span>
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>View Sample Surprise</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Database or Network Error (Requirement 8: Do not show Not Found when problem is a database error)
  if (pageStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-rose-500/30 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-5 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-elegant text-white mb-2">
            Unable to Load Birthday Surprise
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-3 leading-relaxed">
            We encountered a database or network connection issue while retrieving this birthday celebration.
          </p>
          {errorMessage && (
            <p className="text-[11px] font-mono text-rose-300 bg-rose-950/40 border border-rose-500/20 rounded-xl p-2.5 mb-5 break-words">
              {errorMessage}
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => loadData(true)}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Loading</span>
            </button>
            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Unpublished Draft Screen (Requirement 8: Handle unpublished draft status separately)
  if (pageStatus === 'unpublished') {
    const creatorPageId = config?.id || slug;
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-amber-500/30 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 text-[#E8C982]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-elegant text-white mb-2">
            Birthday Surprise in Preparation 🎨
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-2 leading-relaxed">
            This birthday surprise for <span className="text-[#E8C982] font-semibold">{config?.recipientName || 'a special friend'}</span> is currently being created and has not been published yet.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            If you are the creator, open the editor and click <strong className="text-white">"Publish Surprise Page"</strong> in the Publish & Share tab to make it live for your recipient!
          </p>
          <div className="space-y-3">
            <Link
              to={`/editor/${creatorPageId}`}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Open in Creator Studio to Publish</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>View My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Genuinely Not Found Screen
  if (pageStatus === 'not_found' || !config) {
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center p-4 text-slate-100 selection:bg-pink-500 selection:text-white">
        <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-pink-500/20 border border-white/15 flex items-center justify-center mx-auto mb-5 text-[#E8C982]">
            <HelpCircle className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-elegant text-white mb-2">
            Birthday Surprise Not Found
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            The birthday surprise for <code className="text-[#E8C982] bg-white/5 px-2 py-0.5 rounded font-mono">/b/{slug}</code> could not be found. Please double-check the link for typos or create a new celebration.
          </p>

          <div className="space-y-3">
            <Link
              to="/editor"
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Your Own Birthday Surprise</span>
            </Link>

            <Link
              to="/"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>View Sample Surprise</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Passcode Protection Screen
  if (config.passcode && !isPasscodeUnlocked) {
    return (
      <div className="min-h-screen bg-[#160D1F] flex items-center justify-center p-4 text-slate-100">
        <ThemeBackground theme={config.theme} />
        <div className="relative z-10 max-w-sm w-full rounded-3xl bg-slate-900/90 border border-white/15 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#C72C55] to-[#E8C982] flex items-center justify-center mx-auto mb-4 text-[#160D1F] shadow-lg">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold font-elegant text-white mb-1">
            Secret Birthday Surprise
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            This celebration for <span className="text-[#E8C982] font-semibold">{config.recipientName}</span> is protected with a secret passcode.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-3">
            <input
              type="password"
              value={passcodeEntered}
              onChange={(e) => {
                setPasscodeEntered(e.target.value);
                setPasscodeError(false);
              }}
              placeholder="Enter secret passcode"
              className="w-full bg-slate-800 border border-white/15 focus:border-pink-500 rounded-xl px-4 py-2.5 text-center text-sm text-white placeholder-slate-500 outline-none"
              autoFocus
            />

            {passcodeError && (
              <p className="text-xs text-rose-400 font-semibold animate-shake">
                Incorrect passcode. Please try again!
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Unlock Surprise ✨
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sections = config.sections;
  const publicUrl = window.location.href.split('#')[0];

  return (
    <div className="min-h-screen relative text-slate-100 selection:bg-pink-500 selection:text-white">
      {/* Dynamic Themed Background Canvas */}
      <ThemeBackground theme={config.theme} />

      {/* Floating Music Player (Bottom Right) */}
      <FloatingMusicPlayer
        trackId={config.bgMusicTrackId}
        customAudioUrl={config.customAudioUrl}
        accentColor={config.theme.accentColor}
      />

      {/* Main Experience Stream */}
      <main className="relative z-10 w-full overflow-x-hidden">
        {sections.giftLanding && !hasOpenedGift ? (
          <GiftBoxLanding
            config={config}
            onOpenSurprise={() => {
              setHasOpenedGift(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="animate-in fade-in duration-700">
            {sections.celebrationHero && <CelebrationHero config={config} />}
            <Suspense fallback={null}>
              {sections.photoGallery && <div className="section-lazy-render"><PhotoGallery config={config} /></div>}
              {sections.birthdayVideo && <div className="section-lazy-render"><VideoSurprise config={config} /></div>}
              {sections.personalLetter && <div className="section-lazy-render"><PersonalLetter config={config} /></div>}
              {sections.memoryTimeline && <div className="section-lazy-render"><MemoryTimeline config={config} /></div>}
              {sections.birthdayCake && <div className="section-lazy-render"><BirthdayCake config={config} /></div>}
              {sections.reasonsSpecial && <div className="section-lazy-render"><SpecialReasons config={config} /></div>}
              {sections.scratchSurprise && <div className="section-lazy-render"><ScratchSurprise config={config} /></div>}
              {sections.finalCelebration && (
                <div className="section-lazy-render">
                  <FinalCelebration
                    config={config}
                    onOpenShareModal={() => setIsShareModalOpen(true)}
                  />
                </div>
              )}
            </Suspense>
          </div>
        )}
      </main>

      {/* Share Modal - dynamically loaded on demand */}
      {isShareModalOpen && (
        <Suspense fallback={null}>
          <ShareModal
            config={config}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            publicUrl={publicUrl}
          />
        </Suspense>
      )}

      {/* Subtle Bottom Floating Creator Watermark */}
      <div className="fixed bottom-3 left-3 sm:left-4 z-40">
        <Link
          to={`/editor/${config.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:text-white transition-all shadow-lg hover:scale-105"
        >
          <Sparkles className="w-3 h-3 text-[#E8C982]" />
          <span className="hidden sm:inline">Customize or Make Your Own Surprise</span>
          <span className="sm:hidden inline">Edit / Make Surprise</span>
          <Heart className="w-3 h-3 fill-[#C72C55] text-[#C72C55]" />
        </Link>
      </div>
    </div>
  );
};

