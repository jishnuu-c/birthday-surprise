import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Heart, ArrowRight, Star } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { GIFT_BOX_STYLES, THEME_PRESETS } from '../../constants/presets';
import { audioEngine } from '../../lib/audioService';
import { fireConfettiCannon } from '../../lib/confetti';

interface GiftBoxLandingProps {
  config: BirthdayPageConfig;
  onOpenSurprise: () => void;
}

export const GiftBoxLanding: React.FC<GiftBoxLandingProps> = ({
  config,
  onOpenSurprise
}) => {
  const [isOpening, setIsOpening] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const themePreset = THEME_PRESETS[config.theme.preset] || THEME_PRESETS['luxury-plum-gold'];
  const styleKey = config.theme.giftBoxStyle || 'luxury-plum-gold';
  const boxStyle = GIFT_BOX_STYLES[styleKey] || GIFT_BOX_STYLES['luxury-plum-gold'];

  const recipientDisplayName = config.recipientName || 'Someone Special';

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);

    // Audio triggers - start synchronously inside user touch handler so mobile browsers allow playback
    audioEngine.unlockAudio();
    audioEngine.playGiftPop();
    if (config.theme.enableSoundEffects) {
      audioEngine.play(config.bgMusicTrackId, config.customAudioUrl);
    }

    // Fire golden celebration confetti & sparkles
    fireConfettiCannon();

    // Cinematic transition timeout
    setTimeout(() => {
      onOpenSurprise();
    }, 1800);
  };

  return (
    <div className="relative min-h-[94vh] flex flex-col items-center justify-center px-4 py-10 sm:py-16 text-center select-none overflow-hidden">
      {/* Scene 1: Cinematic Ambient Glows & Bokeh Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Soft Radial Ambient Plum / Burgundy Gradients */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-radial from-[#C72C55]/20 via-[#4A1028]/15 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#E8C982]/15 via-[#4A1028]/25 to-transparent blur-3xl opacity-75" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-[#160D1F] via-[#4A1028]/20 to-transparent blur-3xl" />

        {/* Floating Bokeh Dust & Tiny Stars */}
        <motion.div
          animate={{ y: [0, -35, 0], opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 left-[15%] w-3 h-3 rounded-full bg-[#E8C982]/50 blur-[1px]"
        />
        <motion.div
          animate={{ y: [0, -45, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.25, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/3 right-[18%] w-4 h-4 rounded-full bg-[#F7DCE5]/40 blur-[2px]"
        />
        <motion.div
          animate={{ y: [0, -25, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 left-[22%] w-2 h-2 rounded-full bg-[#E8C982]/60"
        />
        <motion.div
          animate={{ rotate: [0, 360], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute top-28 right-[28%] text-[#E8C982]/40 text-xl"
        >
          ✦
        </motion.div>
        <motion.div
          animate={{ rotate: [360, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear', delay: 1 }}
          className="absolute bottom-32 right-[15%] text-[#F7DCE5]/30 text-lg"
        >
          ✧
        </motion.div>
      </div>

      {/* Scene 1: Top Greeting Header with Luxury Badge */}
      <motion.div
        initial={{ opacity: 0, y: -25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 sm:mb-8 space-y-3 z-10 max-w-xl"
      >
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-luxury border border-[#E8C982]/30 text-[#FFF8F0] font-medium text-xs sm:text-sm tracking-widest uppercase shadow-xl backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#E8C982] animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[#E8C982] font-semibold tracking-wider">A Special Surprise Invitation</span>
          <Heart className="w-3.5 h-3.5 fill-[#C72C55] text-[#C72C55] animate-pulse" />
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#FFF8F0] drop-shadow-md"
          style={{ fontFamily: themePreset.headingFont }}
        >
          {config.landingGreeting || `A Gift Crafted with Love for ${recipientDisplayName}`}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="text-xs sm:text-sm text-[#F7DCE5]/80 font-light tracking-wide max-w-md mx-auto"
        >
          Touch the luxury gift box below to unwrap your personalized birthday experience.
        </motion.p>
      </motion.div>

      {/* Scene 2 & 3: 3D Luxury Floating Gift Box Interactive Area */}
      <div
        className="relative perspective-1000 my-4 sm:my-6 cursor-pointer group"
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        aria-label="Open Birthday Gift Box"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        {/* Ambient Radial Floor Shadow & Glow Aura */}
        <motion.div
          animate={{
            scale: isOpening ? [1, 1.4, 0] : isHovered ? 1.15 : [1, 1.06, 1],
            opacity: isOpening ? 0 : isHovered ? 0.85 : 0.55
          }}
          transition={{ duration: 3, repeat: isOpening ? 0 : Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 sm:w-72 h-12 bg-black/60 rounded-[100%] blur-xl pointer-events-none"
        />

        {/* Pulsing Colored Light Aura */}
        <div
          className="absolute -inset-10 rounded-full blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${boxStyle.glowColor} 0%, rgba(74, 16, 40, 0.4) 60%, transparent 80%)`
          }}
        />

        {/* Luxury Hanging Gift Tag */}
        <motion.div
          animate={{
            rotate: isHovered ? [0, -6, 6, 0] : 0,
            y: isHovered ? -6 : [0, -3, 0]
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-8 -right-4 sm:-right-8 z-30 pointer-events-none"
        >
          {/* Tag Ribbon String */}
          <div className="w-0.5 h-6 bg-[#E8C982]/80 mx-auto -mb-1 shadow-sm" />
          <div className="bg-gradient-to-br from-[#FFF8F0] via-[#F7DCE5] to-[#E8C982] text-[#160D1F] border border-[#E8C982] px-3.5 py-1.5 rounded-lg shadow-2xl font-serif text-xs sm:text-sm font-bold rotate-6 flex items-center gap-1.5 ring-1 ring-black/10">
            <Sparkles className="w-3 h-3 text-[#C72C55]" />
            <span>To: {recipientDisplayName}</span>
            <span className="text-[#C72C55]">✨</span>
          </div>
        </motion.div>

        {/* 3D Box Levitation Container */}
        <motion.div
          className="relative w-48 h-48 xs:w-56 xs:h-56 sm:w-64 sm:h-64 mx-auto preserve-3d"
          animate={{
            scale: isOpening ? [1, 1.15, 1.25] : isHovered ? 1.05 : [1, 1.025, 1],
            rotateY: isOpening ? 20 : isHovered ? 8 : [0, 2, -2, 0],
            rotateX: isHovered ? 4 : 0,
            y: isOpening ? -25 : [0, -8, 0]
          }}
          transition={{
            duration: isOpening ? 1.4 : 4,
            repeat: isOpening ? 0 : Infinity,
            ease: 'easeInOut'
          }}
        >
          {/* Animated 3D Lid & Bow Knot */}
          <motion.div
            className="absolute top-0 left-[-4%] w-[108%] h-14 sm:h-16 rounded-2xl z-20 shadow-2xl flex items-center justify-center preserve-3d border border-[#E8C982]/40"
            style={{
              background: boxStyle.lidColor,
              boxShadow: '0 15px 30px -5px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)'
            }}
            animate={
              isOpening
                ? {
                    y: -180,
                    rotateX: -45,
                    rotateZ: 20,
                    opacity: 0,
                    scale: 0.85
                  }
                : {
                    y: isHovered ? -8 : 0
                  }
            }
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Bevel highlight */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-white/40 rounded-t-2xl" />

            {/* Horizontal Ribbon on Lid */}
            <motion.div
              className="absolute inset-x-0 h-4 sm:h-5 top-1/2 -translate-y-1/2 shadow-inner border-y border-[#E8C982]/30"
              style={{
                background: boxStyle.ribbonColor,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 5px rgba(0,0,0,0.3)'
              }}
              animate={isOpening ? { scaleX: 0, opacity: 0 } : {}}
              transition={{ duration: 0.4 }}
            />
            {/* Vertical Ribbon on Lid */}
            <motion.div
              className="absolute inset-y-0 w-6 sm:w-7 left-1/2 -translate-x-1/2 shadow-inner border-x border-[#E8C982]/30"
              style={{
                background: boxStyle.ribbonColor,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 5px rgba(0,0,0,0.3)'
              }}
              animate={isOpening ? { scaleY: 0, opacity: 0 } : {}}
              transition={{ duration: 0.4 }}
            />

            {/* Realistic 3D Satin Bow with Multi-Loops and Cascading Ribbon Tails */}
            <motion.div
              className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center pointer-events-none"
              animate={
                isOpening
                  ? { opacity: 0, scale: 0, y: -40 }
                  : { scale: isHovered ? 1.15 : 1, rotate: isHovered ? 3 : 0 }
              }
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="relative">
                {/* Left Loop */}
                <div
                  className="w-8 h-9 sm:w-10 sm:h-11 rounded-full border-2 border-[#FFF8F0]/60 shadow-xl transform -rotate-45 -translate-x-3.5"
                  style={{
                    background: boxStyle.ribbonColor,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.6)'
                  }}
                />
                {/* Right Loop */}
                <div
                  className="w-8 h-9 sm:w-10 sm:h-11 rounded-full border-2 border-[#FFF8F0]/60 shadow-xl transform rotate-45 translate-x-3.5 -mt-9 sm:-mt-11"
                  style={{
                    background: boxStyle.ribbonColor,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.6)'
                  }}
                />
                {/* Cascading Ribbon Tail Left */}
                <div
                  className="w-3 h-7 rounded-b-md shadow-md absolute -bottom-4 left-0 -rotate-25 transform origin-top"
                  style={{ background: boxStyle.ribbonColor }}
                />
                {/* Cascading Ribbon Tail Right */}
                <div
                  className="w-3 h-7 rounded-b-md shadow-md absolute -bottom-4 right-0 rotate-25 transform origin-top"
                  style={{ background: boxStyle.ribbonColor }}
                />
                {/* Center Knot Gem / Knot */}
                <div
                  className="w-6 h-6 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xl border border-[#FFF8F0]/70 flex items-center justify-center"
                  style={{
                    background: boxStyle.bowColor,
                    boxShadow: '0 0 15px rgba(232, 201, 130, 0.8), inset 0 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  <Star className="w-2.5 h-2.5 text-[#4A1028] fill-[#4A1028]" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Main Box Body with Satin / Velvet Textures */}
          <div
            className="absolute bottom-0 inset-x-0 h-44 sm:h-52 rounded-2xl shadow-2xl overflow-hidden border border-[#E8C982]/30"
            style={{
              background: boxStyle.boxColor,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), inset 0 2px 6px rgba(255,255,255,0.15)'
            }}
          >
            {/* Subtle Metallic Velvet Sheen Gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />

            {/* Horizontal Ribbon on Box Body */}
            <motion.div
              className="absolute inset-x-0 h-6 sm:h-7 top-1/2 -translate-y-1/2 shadow-md z-10 border-y border-[#E8C982]/30"
              style={{
                background: boxStyle.ribbonColor,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.3)'
              }}
              animate={isOpening ? { scaleX: 0, opacity: 0 } : {}}
              transition={{ duration: 0.4 }}
            />
            {/* Vertical Ribbon on Box Body */}
            <motion.div
              className="absolute inset-y-0 w-7 sm:w-8 left-1/2 -translate-x-1/2 shadow-md z-10 border-x border-[#E8C982]/30"
              style={{
                background: boxStyle.ribbonColor,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.3)'
              }}
              animate={isOpening ? { scaleY: 0, opacity: 0 } : {}}
              transition={{ duration: 0.4 }}
            />

            {/* Scene 3: Warm Golden Light Eruption & Magical Inside Flare */}
            <AnimatePresence>
              {isOpening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 3.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-0 flex items-center justify-center bg-radial from-[#FFF8F0] via-[#E8C982] to-[#C72C55]/60 z-20"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="relative"
                  >
                    <Sparkles className="w-24 h-24 text-[#FFF8F0] drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Floating Tap Prompt / Hint */}
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7], y: [0, -2, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="mt-6 text-xs sm:text-sm font-semibold text-[#E8C982] tracking-widest uppercase flex items-center justify-center gap-2 drop-shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8C982]" />
          <span>Tap or Click Gift Box to Open</span>
          <Sparkles className="w-3.5 h-3.5 text-[#E8C982]" />
        </motion.p>
      </div>

      {/* Scene 4: Interactive Luxury CTA Button & Skip Option */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-4 z-20"
      >
        <button
          onClick={handleOpen}
          disabled={isOpening}
          className="relative w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg text-[#160D1F] shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 sm:gap-3 cursor-pointer group overflow-hidden border border-[#FFF8F0]/40"
          style={{
            background: 'linear-gradient(135deg, #FFF8F0 0%, #E8C982 50%, #C99E47 100%)',
            boxShadow: '0 12px 35px -5px rgba(232, 201, 130, 0.5)'
          }}
        >
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          <Gift className="w-4 sm:w-5 h-4 sm:h-5 text-[#4A1028] group-hover:rotate-12 transition-transform shrink-0" />
          <span className="font-extrabold tracking-wide">
            {isOpening ? 'Unwrapping Magical Surprise...' : 'Open Your Birthday Gift'}
          </span>
          <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 text-[#4A1028] group-hover:translate-x-1.5 transition-transform shrink-0" />
        </button>

        <button
          onClick={onOpenSurprise}
          className="text-xs text-[#F7DCE5]/60 hover:text-[#FFF8F0] transition-colors py-2 px-3 underline underline-offset-4 cursor-pointer"
        >
          Skip animation
        </button>
      </motion.div>
    </div>
  );
};
