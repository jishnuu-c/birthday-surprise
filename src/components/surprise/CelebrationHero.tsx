import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, ChevronDown, Calendar, Cake } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { THEME_PRESETS } from '../../constants/presets';

interface CelebrationHeroProps {
  config: BirthdayPageConfig;
  onScrollToNext?: () => void;
}

export const CelebrationHero: React.FC<CelebrationHeroProps> = ({
  config,
  onScrollToNext
}) => {
  const currentPreset = THEME_PRESETS[config.theme.preset] || THEME_PRESETS['romantic-rose'];
  const recipient = config.recipientName || 'Beautiful Soul';

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-16 overflow-hidden">
      {/* Floating Decorative Balloons & Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-12 left-6 sm:left-24 text-4xl sm:text-6xl opacity-80"
        >
          🎈
        </motion.div>
        <motion.div
          animate={{ y: [0, -40, 0], x: [0, -20, 0], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-20 right-8 sm:right-28 text-4xl sm:text-6xl opacity-80"
        >
          💖
        </motion.div>
        <motion.div
          animate={{ y: [0, -25, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-24 left-10 sm:left-32 text-3xl sm:text-5xl opacity-75"
        >
          ✨
        </motion.div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto flex flex-col items-center space-y-8 z-10">
        {/* Subtitle Pill / Milestone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold tracking-wider uppercase text-pink-300 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>A Day Dedicated Entirely to You</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>

          {config.showAgeCountdown && config.targetAge && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-md">
              <Cake className="w-3.5 h-3.5 text-amber-400" />
              <span>Celebrating Year {config.targetAge}!</span>
            </div>
          )}
        </motion.div>

        {/* Large Animated Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight"
          style={{ fontFamily: currentPreset.headingFont }}
        >
          <span className="block text-slate-100">HAPPY BIRTHDAY,</span>
          <span 
            className="shimmer-text block mt-1"
            style={{
              textShadow: `0 0 40px ${config.theme.primaryColor || currentPreset.primaryColor}80`
            }}
          >
            {recipient.toUpperCase()}!
          </span>
        </motion.h1>

        {/* Hero Photo with 3D Tilt Card & Glowing Aura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
          className="relative group my-4"
        >
          {/* Ambient Rotating Rim Glow */}
          <div 
            className="absolute -inset-2 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-500"
            style={{
              background: `linear-gradient(135deg, ${config.theme.primaryColor || currentPreset.primaryColor}, ${config.theme.accentColor || currentPreset.accentColor})`
            }}
          />

          {/* Card Frame */}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden p-2 bg-slate-900/80 backdrop-blur-md border border-white/25 shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]">
            {config.profilePhotoUrl ? (
              <img
                src={config.profilePhotoUrl}
                alt={recipient}
                className="w-full h-full object-cover rounded-2xl"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 flex flex-col items-center justify-center p-6 text-center">
                <Heart className="w-16 h-16 text-pink-400 animate-bounce mb-2" />
                <p className="text-sm font-semibold text-pink-200">The Guest of Honor</p>
                <p className="text-xs text-slate-400 mt-1">{recipient}</p>
              </div>
            )}

            {/* Nickname overlay tag */}
            {config.nickname && (
              <div className="absolute bottom-4 inset-x-4 mx-auto w-max px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white font-medium text-xs sm:text-sm shadow-lg flex items-center gap-1.5">
                <span>✨ {config.nickname}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Personalized Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-base sm:text-xl text-slate-300 max-w-2xl font-normal leading-relaxed"
        >
          {config.heroSubtitle || 'Today the entire universe pauses to celebrate the most incredible person in our lives.'}
        </motion.p>

        {/* Birthdate Tag if available */}
        {config.birthDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-2 text-xs sm:text-sm text-pink-300/90 font-medium"
          >
            <Calendar className="w-4 h-4 text-pink-400" />
            <span>
              {new Date(config.birthDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </motion.div>
        )}

        {/* Continue the Surprise Scroll Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="pt-6"
        >
          <button
            onClick={onScrollToNext || (() => {
              window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
            })}
            className="px-6 py-3 rounded-full glass-panel hover:bg-white/15 border border-white/20 text-white text-sm font-semibold flex items-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Continue the Surprise</span>
            <ChevronDown className="w-4 h-4 text-pink-400 animate-bounce" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
