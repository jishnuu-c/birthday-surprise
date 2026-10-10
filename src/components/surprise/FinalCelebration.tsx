import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Share2, Flame } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { fireGrandFinale } from '../../lib/confetti';
import { audioEngine } from '../../lib/audioService';

interface FinalCelebrationProps {
  config: BirthdayPageConfig;
  onOpenShareModal: () => void;
}

export const FinalCelebration: React.FC<FinalCelebrationProps> = ({
  config,
  onOpenShareModal
}) => {
  const handlePopGrandFinale = () => {
    audioEngine.playCelebrationFanfare();
    fireGrandFinale();
  };

  return (
    <section className="py-24 px-4 max-w-4xl mx-auto relative z-10 text-center">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-radial from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="glass-panel-glow rounded-3xl p-8 sm:p-12 border border-pink-500/30 shadow-2xl relative overflow-hidden"
      >
        <div className="text-4xl sm:text-5xl mb-4 animate-bounce">
          🎉 🎂 🥂
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight font-elegant leading-tight">
          {config.finalSurpriseHeadline || 'Here is to Your Most Incredible Year Yet!'}
        </h2>

        <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {config.finalSurpriseMessage || 'Never forget how deeply you are loved, cherished, and celebrated today and every single day.'}
        </p>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handlePopGrandFinale}
            className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white text-base shadow-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <Flame className="w-5 h-5 text-yellow-200 group-hover:scale-125 transition-transform" />
            <span>{config.finalButtonText || 'Pop Massive Fireworks & Confetti! 🎆'}</span>
            <Sparkles className="w-5 h-5 text-amber-200" />
          </button>

          <button
            onClick={onOpenShareModal}
            className="w-full sm:w-auto px-6 py-4 rounded-full font-semibold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-pink-400" />
            <span>Share This Surprise Link</span>
          </button>
        </div>

        {/* Footer love note */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span className="flex items-center gap-1">
            <span>Created with infinite love for</span>
            <span className="font-semibold text-pink-400">{config.recipientName || 'You'}</span>
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 inline" />
          </span>

          <span className="text-slate-400">
            Powered by <strong className="text-slate-200">Birthday Magic</strong>
          </span>
        </div>
      </motion.div>
    </section>
  );
};
