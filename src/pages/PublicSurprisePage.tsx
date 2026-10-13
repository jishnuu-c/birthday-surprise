import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { resolvePageAsync, getPageById } from '../lib/storage';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { ThemeBackground } from '../components/common/ThemeBackground';
import { FloatingMusicPlayer } from '../components/common/FloatingMusicPlayer';
import { GiftBoxLanding } from '../components/surprise/GiftBoxLanding';
import { CelebrationHero } from '../components/surprise/CelebrationHero';
import { PhotoGallery } from '../components/surprise/PhotoGallery';
import { VideoSurprise } from '../components/surprise/VideoSurprise';
import { PersonalLetter } from '../components/surprise/PersonalLetter';
import { MemoryTimeline } from '../components/surprise/MemoryTimeline';
import { BirthdayCake } from '../components/surprise/BirthdayCake';
import { SpecialReasons } from '../components/surprise/SpecialReasons';
import { ScratchSurprise } from '../components/surprise/ScratchSurprise';
import { FinalCelebration } from '../components/surprise/FinalCelebration';
import { ShareModal } from '../components/surprise/ShareModal';
import { Sparkles, Heart, Gift, Lock, ArrowRight, HelpCircle } from 'lucide-react';

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

    // For public share links, NEVER initialize with DEFAULT_DEMO_CONFIG or localStorage!
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => !isHomepageDemo && !config);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [hasOpenedGift, setHasOpenedGift] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [passcodeEntered, setPasscodeEntered] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Root landing page without slug -> render demo sample
      if (!slug) {
        if (isMounted) {
          setConfig(DEFAULT_DEMO_CONFIG);
          document.title = DEFAULT_DEMO_CONFIG.pageTitle;
          setLoading(false);
          setNotFound(false);
        }
        return;
      }

      setLoading(true);
      setNotFound(false);

      // 2. Target slug or ID specified: fetch strictly from Supabase cloud database
      // allowLocalFallback: false ensures visitors never see DEFAULT_DEMO_CONFIG or stale localStorage
      try {
        const resolved = await resolvePageAsync(slug, { allowLocalFallback: false });
        if (isMounted) {
          if (resolved) {
            setConfig(resolved);
            document.title = resolved.pageTitle || `Happy Birthday, ${resolved.recipientName}! ✨`;
            setNotFound(false);
            if (!resolved.passcode) {
              setIsPasscodeUnlocked(true);
            }
          } else {
            // Page does not exist or is not published in Supabase
            setConfig(null);
            setNotFound(true);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Load data error:', err);
        if (isMounted) {
          setConfig(null);
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

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

  if (loading) {
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

  // Unavailable or Not Found Screen
  if (notFound || !config) {
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
            The birthday surprise for <code className="text-[#E8C982] bg-white/5 px-2 py-0.5 rounded font-mono">/b/{slug}</code> could not be found. It may be an unpublished draft or the link may have a typo.
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
          <div className="animate-in fade-in duration-1000">
            {sections.celebrationHero && <CelebrationHero config={config} />}
            {sections.photoGallery && <PhotoGallery config={config} />}
            {sections.birthdayVideo && <VideoSurprise config={config} />}
            {sections.personalLetter && <PersonalLetter config={config} />}
            {sections.memoryTimeline && <MemoryTimeline config={config} />}
            {sections.birthdayCake && <BirthdayCake config={config} />}
            {sections.reasonsSpecial && <SpecialReasons config={config} />}
            {sections.scratchSurprise && <ScratchSurprise config={config} />}
            {sections.finalCelebration && (
              <FinalCelebration
                config={config}
                onOpenShareModal={() => setIsShareModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Share Modal */}
      <ShareModal
        config={config}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicUrl={publicUrl}
      />

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
