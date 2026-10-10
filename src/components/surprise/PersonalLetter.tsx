import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Heart, Sparkles, Eye, CheckCircle2 } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { audioEngine } from '../../lib/audioService';

interface PersonalLetterProps {
  config: BirthdayPageConfig;
}

export const PersonalLetter: React.FC<PersonalLetterProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const fullLetter = config.letterContent || 'Wishing you the happiest birthday ever!';

  // Typewriter effect
  useEffect(() => {
    if (!isOpen) {
      setDisplayedLength(0);
      setIsTypingComplete(false);
      return;
    }

    if (displayedLength >= fullLetter.length) {
      setIsTypingComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => Math.min(prev + 3, fullLetter.length));
    }, 20);

    return () => clearTimeout(timer);
  }, [isOpen, displayedLength, fullLetter.length]);

  const handleOpenEnvelope = () => {
    if (!isOpen) {
      audioEngine.playEnvelopeOpen();
      setIsOpen(true);
    }
  };

  const handleShowAll = () => {
    setDisplayedLength(fullLetter.length);
    setIsTypingComplete(true);
  };

  return (
    <section className="py-20 px-4 max-w-3xl mx-auto relative z-10">
      {/* Section Header */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Mail className="w-3.5 h-3.5" />
          <span>From The Heart</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 font-elegant">
          {config.letterHeading || 'A Personal Letter for You'}
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          Written with love, sincerity, and warm birthday wishes.
        </p>
      </div>

      {/* Interactive Envelope & Unfolding Letter */}
      <div className="relative flex flex-col items-center">
        {!isOpen ? (
          /* Sealed Vintage / Modern Envelope */
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.03 }}
            onClick={handleOpenEnvelope}
            className="cursor-pointer relative w-full max-w-md aspect-[1.5/1] rounded-2xl p-8 bg-gradient-to-br from-rose-900/90 via-pink-950/80 to-slate-900 border-2 border-rose-500/30 shadow-2xl flex flex-col items-center justify-center text-center group"
          >
            {/* Envelope Flap Lines */}
            <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

            {/* Glowing Wax Seal */}
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 shadow-xl shadow-red-600/40 border-2 border-amber-300 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                <Heart className="w-8 h-8 fill-amber-100 text-amber-100" />
              </div>
              <div className="absolute -inset-2 rounded-full blur-md bg-rose-500/30 animate-pulse pointer-events-none" />
            </div>

            <p className="text-base font-semibold text-rose-200 tracking-wide font-elegant">
              To: {config.recipientName || 'Someone Dear'}
            </p>
            <p className="text-xs text-rose-300/80 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Tap Wax Seal to Open Letter</span>
            </p>
          </motion.div>
        ) : (
          /* Unfolded Handwritten Letter Paper */
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-full rounded-3xl p-6 sm:p-10 md:p-12 bg-[#fffdf9] text-slate-900 shadow-2xl border border-amber-200/60 relative overflow-hidden"
          >
            {/* Vintage Paper Texture & Watermark */}
            <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
              <Heart className="w-32 h-32 text-pink-950 fill-current" />
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-amber-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Personal Handwritten Note</span>
              </div>

              {!isTypingComplete && (
                <button
                  onClick={handleShowAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show All Instantly</span>
                </button>
              )}
            </div>

            {/* Letter Content with Typewriter Text */}
            <div className="font-handwriting text-2xl sm:text-3xl leading-relaxed sm:leading-loose text-slate-800 whitespace-pre-line min-h-[160px]">
              {fullLetter.slice(0, displayedLength)}
              {!isTypingComplete && (
                <span className="inline-block w-2 h-6 bg-pink-600 ml-1 animate-pulse" />
              )}
            </div>

            {/* Closing Signature */}
            {config.letterClosing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: displayedLength >= fullLetter.length * 0.8 ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                className="mt-10 pt-6 border-t border-amber-200/80 text-right font-handwriting text-2xl sm:text-3xl text-pink-900 font-bold whitespace-pre-line"
              >
                {config.letterClosing}
              </motion.div>
            )}

            {/* Read status check */}
            {isTypingComplete && (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Read with love</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
