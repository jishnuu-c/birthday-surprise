import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Heart, ArrowRight } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { GIFT_BOX_STYLES } from '../../constants/presets';
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

  const styleKey = config.theme.giftBoxStyle || 'rose-blush';
  const boxStyle = GIFT_BOX_STYLES[styleKey] || GIFT_BOX_STYLES['rose-blush'];

  const handleOpen = () => {
    if (isOpening) return;
    setIsOpening(true);

    // Play sounds & start music
    audioEngine.playGiftPop();
    if (config.theme.enableSoundEffects) {
      setTimeout(() => {
        audioEngine.play(config.bgMusicTrackId, config.customAudioUrl);
      }, 400);
    }

    // Fire confetti cannon
    fireConfettiCannon();

    // Trigger reveal transition
    setTimeout(() => {
      onOpenSurprise();
    }, 1500);
  };

  const recipientDisplayName = config.recipientName || 'Someone Special';

  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 py-12 text-center select-none overflow-hidden">
      {/* Top Greeting Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-panel-glow border border-pink-500/30 text-pink-300 font-medium text-sm tracking-wide shadow-lg shadow-pink-500/10 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{config.landingGreeting || `A Little Surprise for ${recipientDisplayName}`}</span>
          <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 animate-pulse" />
        </div>
      </motion.div>

      {/* Main 3D Gift Box Interactive Area */}
      <div 
        className="relative perspective-1000 my-6 cursor-pointer group"
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Ambient Glow Aura */}
        <div 
          className="absolute -inset-10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"
          style={{ background: boxStyle.glowColor }}
        />

        {/* Gift Tag */}
        <motion.div
          animate={{
            rotate: isHovered ? [0, -5, 5, 0] : 0,
            y: isHovered ? -5 : 0
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-10 -right-6 sm:-right-10 z-30 bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-lg shadow-xl font-handwriting text-base font-bold rotate-6 flex items-center gap-1.5 pointer-events-none"
        >
          <span>For: {recipientDisplayName}</span>
          <span className="text-red-500">❤️</span>
        </motion.div>

        {/* 3D Box Container */}
        <motion.div
          className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto preserve-3d"
          animate={{
            scale: isOpening ? [1, 1.15, 1.3] : isHovered ? 1.05 : [1, 1.02, 1],
            rotateY: isOpening ? 20 : isHovered ? 8 : 0,
            y: isOpening ? -20 : 0
          }}
          transition={{
            duration: isOpening ? 1.2 : 3,
            repeat: isOpening ? 0 : Infinity,
            ease: 'easeInOut'
          }}
        >
          {/* Animated Lid & Bow */}
          <motion.div
            className="absolute top-0 left-[-4%] w-[108%] h-14 rounded-xl z-20 shadow-2xl flex items-center justify-center preserve-3d"
            style={{ background: boxStyle.lidColor }}
            animate={
              isOpening
                ? {
                    y: -140,
                    rotateX: -45,
                    rotateZ: 25,
                    opacity: 0,
                    scale: 0.8
                  }
                : {
                    y: isHovered ? -6 : 0
                  }
            }
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Horizontal Ribbon on Lid */}
            <div 
              className="absolute inset-x-0 h-4 top-1/2 -translate-y-1/2 shadow-inner"
              style={{ background: boxStyle.ribbonColor }}
            />
            {/* Vertical Ribbon on Lid */}
            <div 
              className="absolute inset-y-0 w-6 left-1/2 -translate-x-1/2 shadow-inner"
              style={{ background: boxStyle.ribbonColor }}
            />

            {/* Realistic 3D Bow Knot */}
            <motion.div
              className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center"
              animate={isOpening ? { opacity: 0, scale: 0 } : { scale: isHovered ? 1.15 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                {/* Left loop */}
                <div 
                  className="w-8 h-8 rounded-full border-4 shadow-lg transform -rotate-45 -translate-x-3"
                  style={{ borderColor: boxStyle.bowColor, background: boxStyle.ribbonColor }}
                />
                {/* Right loop */}
                <div 
                  className="w-8 h-8 rounded-full border-4 shadow-lg transform rotate-45 translate-x-3 -mt-8"
                  style={{ borderColor: boxStyle.bowColor, background: boxStyle.ribbonColor }}
                />
                {/* Center Knot */}
                <div 
                  className="w-5 h-5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-md"
                  style={{ background: boxStyle.bowColor }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Main Box Body */}
          <div 
            className="absolute bottom-0 inset-x-0 h-48 sm:h-52 rounded-2xl shadow-2xl overflow-hidden border border-white/20"
            style={{ background: boxStyle.boxColor }}
          >
            {/* Horizontal Ribbon on Box Body */}
            <div 
              className="absolute inset-x-0 h-6 top-1/2 -translate-y-1/2 shadow-md z-10"
              style={{ background: boxStyle.ribbonColor }}
            />
            {/* Vertical Ribbon on Box Body */}
            <div 
              className="absolute inset-y-0 w-7 left-1/2 -translate-x-1/2 shadow-md z-10"
              style={{ background: boxStyle.ribbonColor }}
            />

            {/* Glowing sparkle inside reveal */}
            <AnimatePresence>
              {isOpening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 2.5 }}
                  className="absolute inset-0 flex items-center justify-center bg-radial from-amber-200 via-pink-400 to-transparent z-20"
                >
                  <Sparkles className="w-16 h-16 text-yellow-100 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Floating instruction hint */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-6 text-xs sm:text-sm font-medium text-pink-200/80 tracking-wider uppercase flex items-center justify-center gap-1.5"
        >
          <span>Tap or Click Gift Box to Open</span>
        </motion.p>
      </div>

      {/* Action Button & Skip Option */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mt-6 flex flex-col sm:flex-row items-center gap-4 z-20"
      >
        <button
          onClick={handleOpen}
          disabled={isOpening}
          className="px-8 py-4 rounded-full font-bold text-base sm:text-lg text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer group"
          style={{
            background: `linear-gradient(135deg, ${config.theme.primaryColor || '#ec4899'}, ${config.theme.accentColor || '#f43f5e'})`,
            boxShadow: `0 10px 30px -5px ${boxStyle.glowColor}`
          }}
        >
          <Gift className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>{isOpening ? 'Opening Your Surprise...' : 'Open Your Gift'}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={onOpenSurprise}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-3 underline underline-offset-4 cursor-pointer"
        >
          Skip animation
        </button>
      </motion.div>
    </div>
  );
};
