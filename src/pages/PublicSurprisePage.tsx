import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { resolvePageAsync } from '../lib/storage';
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
import { Sparkles, Heart, Gift } from 'lucide-react';

export const PublicSurprisePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<BirthdayPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOpenedGift, setHasOpenedGift] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const targetSlug = slug || 'sophia-25th';

      // Immediate fast resolution with a 3s max timeout to prevent mobile network hangs
      const resolvePromise = resolvePageAsync(targetSlug);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800));

      try {
        const page = await Promise.race([resolvePromise, timeoutPromise]);

        if (isMounted) {
          if (page) {
            setConfig(page);
            document.title = page.pageTitle || `Happy Birthday, ${page.recipientName}! ✨`;
          } else {
            // Check if local cache has it, or fall back to default
            const localFallback = await resolvePageAsync(targetSlug);
            const finalConfig = localFallback || DEFAULT_DEMO_CONFIG;
            setConfig(finalConfig);
            document.title = finalConfig.pageTitle || `Happy Birthday, ${finalConfig.recipientName}! ✨`;
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Load data error:', err);
        if (isMounted) {
          setConfig(DEFAULT_DEMO_CONFIG);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

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

  if (!config) return null;

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
