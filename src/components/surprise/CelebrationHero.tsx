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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-luxury border border-[#E8C982]/30 text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E8C982] shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#E8C982]" />
            <span>A Day Dedicated Entirely to You</span>
            <Sparkles className="w-3.5 h-3.5 text-[#E8C982]" />
          </div>

          {config.showAgeCountdown && config.targetAge && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4A1028]/80 border border-[#E8C982]/40 text-[#FFF8F0] text-xs font-bold shadow-md">
              <Cake className="w-3.5 h-3.5 text-[#E8C982]" />
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
          <span className="block text-[#FFF8F0]">HAPPY BIRTHDAY,</span>
          <span 
            className="shimmer-gold block mt-1"
            style={{
              textShadow: '0 0 45px rgba(232, 201, 130, 0.5)'
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
              background: 'linear-gradient(135deg, rgba(232, 201, 130, 0.6), rgba(199, 44, 85, 0.6))'
            }}
          />

          {/* Card Frame */}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden p-2 bg-[#160D1F]/90 backdrop-blur-md border border-[#E8C982]/35 shadow-2xl transition-transform duration-500 group-hover:scale-[1.03] transform-gpu">
            {config.profilePhotoUrl ? (
              <img
                src={config.profilePhotoUrl}
                alt={recipient}
                className="w-full h-full object-cover rounded-2xl"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#C72C55]/20 to-[#4A1028]/40 flex flex-col items-center justify-center p-6 text-center">
                <Heart className="w-16 h-16 text-[#E8C982] animate-bounce mb-2" />
                <p className="text-sm font-semibold text-[#FFF8F0]">The Guest of Honor</p>
                <p className="text-xs text-[#F7DCE5]/70 mt-1">{recipient}</p>
              </div>
            )}

            {/* Nickname overlay tag */}
            {config.nickname && (
              <div className="absolute bottom-4 inset-x-4 mx-auto w-max px-4 py-1.5 rounded-full bg-[#160D1F]/85 backdrop-blur-md border border-[#E8C982]/40 text-[#FFF8F0] font-medium text-xs sm:text-sm shadow-lg flex items-center gap-1.5">
                <span className="text-[#E8C982]">✨</span>
                <span>{config.nickname}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Personalized Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-base sm:text-xl text-[#FFF8F0]/90 max-w-2xl font-normal leading-relaxed"
        >
          {config.heroSubtitle || 'Today the entire universe pauses to celebrate the most incredible person in our lives.'}
        </motion.p>

        {/* Birthdate Tag if available */}
        {config.birthDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-2 text-xs sm:text-sm text-[#E8C982] font-medium"
          >
            <Calendar className="w-4 h-4 text-[#E8C982]" />
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
            className="px-6 py-3 rounded-full glass-luxury hover:bg-[#4A1028]/60 border border-[#E8C982]/40 text-[#FFF8F0] text-sm font-semibold flex items-center gap-2 shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Continue the Surprise</span>
            <ChevronDown className="w-4 h-4 text-[#E8C982] animate-bounce" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
