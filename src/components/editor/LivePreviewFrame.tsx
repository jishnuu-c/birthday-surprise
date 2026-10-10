import React, { useState } from 'react';
import { BirthdayPageConfig } from '../../types';
import { ThemeBackground } from '../common/ThemeBackground';
import { FloatingMusicPlayer } from '../common/FloatingMusicPlayer';
import { GiftBoxLanding } from '../surprise/GiftBoxLanding';
import { CelebrationHero } from '../surprise/CelebrationHero';
import { PhotoGallery } from '../surprise/PhotoGallery';
import { VideoSurprise } from '../surprise/VideoSurprise';
import { PersonalLetter } from '../surprise/PersonalLetter';
import { MemoryTimeline } from '../surprise/MemoryTimeline';
import { BirthdayCake } from '../surprise/BirthdayCake';
import { SpecialReasons } from '../surprise/SpecialReasons';
import { ScratchSurprise } from '../surprise/ScratchSurprise';
import { FinalCelebration } from '../surprise/FinalCelebration';
import { Smartphone, Tablet, Monitor, RotateCcw } from 'lucide-react';

interface LivePreviewFrameProps {
  config: BirthdayPageConfig;
}

export const LivePreviewFrame: React.FC<LivePreviewFrameProps> = ({ config }) => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [hasOpenedGift, setHasOpenedGift] = useState(false);

  const sections = config.sections;

  // Responsive device styling classes
  const deviceWidthClasses = {
    mobile: 'w-full max-w-full sm:max-w-[390px] h-[640px] sm:h-[780px] rounded-2xl sm:rounded-[44px] sm:border-[10px] sm:border-slate-800 border border-white/20 shadow-2xl overflow-y-auto relative',
    tablet: 'w-full max-w-full sm:max-w-[720px] h-[680px] sm:h-[820px] rounded-2xl sm:rounded-[36px] sm:border-[10px] sm:border-slate-800 border border-white/20 shadow-2xl overflow-y-auto relative',
    desktop: 'w-full h-[700px] sm:h-[850px] rounded-2xl border border-white/20 shadow-2xl overflow-y-auto relative'
  };

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      {/* Device switcher bar */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-2xl mb-3 sm:mb-4 bg-slate-900/90 border border-white/10 p-1.5 sm:p-2 rounded-2xl gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDevice('mobile')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              device === 'mobile' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Mobile</span>
          </button>

          <button
            onClick={() => setDevice('tablet')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              device === 'tablet' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Tablet</span>
          </button>

          <button
            onClick={() => setDevice('desktop')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              device === 'desktop' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Desktop</span>
          </button>
        </div>

        <button
          onClick={() => setHasOpenedGift(false)}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-pink-300 flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
          title="Re-play the gift opening animation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Box</span>
        </button>
      </div>

      {/* Frame Container */}
      <div className={`${deviceWidthClasses[device]} bg-slate-950 text-slate-100 transition-all duration-300`}>
        {/* Dynamic Background */}
        <ThemeBackground theme={config.theme} />

        {/* Floating Music Player */}
        <FloatingMusicPlayer
          trackId={config.bgMusicTrackId}
          customAudioUrl={config.customAudioUrl}
          accentColor={config.theme.accentColor}
        />

        {/* Interactive Content Stream */}
        <div className="relative z-10 min-h-full pb-20">
          {sections.giftLanding && !hasOpenedGift ? (
            <GiftBoxLanding
              config={config}
              onOpenSurprise={() => setHasOpenedGift(true)}
            />
          ) : (
            <div className="animate-in fade-in duration-700">
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
                  onOpenShareModal={() => alert('Share modal opens on the live page!')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
