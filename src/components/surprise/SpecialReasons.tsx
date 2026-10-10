import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, HelpCircle } from 'lucide-react';
import { BirthdayPageConfig, SpecialReason } from '../../types';

interface SpecialReasonsProps {
  config: BirthdayPageConfig;
}

export const SpecialReasons: React.FC<SpecialReasonsProps> = ({ config }) => {
  const reasons: SpecialReason[] = config.reasonsList || [];
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  if (!reasons.length) return null;

  const toggleFlip = (id: string) => {
    setFlippedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="py-20 px-4 max-w-6xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
          <span>Why You Are Irreplaceable</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 font-elegant">
          {config.reasonsHeading || 'Reasons You Are Special'}
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          {config.reasonsSubtitle || 'Tap any card to reveal what makes you so incredibly wonderful.'}
        </p>
      </div>

      {/* Interactive Flippable Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reasons.map((reason, index) => {
          const isFlipped = Boolean(flippedIds[reason.id || index]);

          return (
            <motion.div
              key={reason.id || index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              onClick={() => toggleFlip(reason.id || String(index))}
              className="perspective-1000 h-64 cursor-pointer group select-none"
            >
              <motion.div
                className="relative w-full h-full preserve-3d transition-transform duration-700"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
              >
                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden rounded-2xl glass-panel p-6 border border-white/15 group-hover:border-pink-500/40 flex flex-col items-center justify-center text-center shadow-xl group-hover:shadow-pink-500/10 group-hover:scale-[1.02] transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-3xl mb-4 shadow-inner">
                    {reason.emoji || '✨'}
                  </div>

                  <span className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1">
                    Reason #{index + 1}
                  </span>

                  <h3 className="text-base font-bold text-slate-100 font-sans-modern line-clamp-2">
                    {reason.title}
                  </h3>

                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 px-2.5 py-1 rounded-full">
                    <HelpCircle className="w-3 h-3" />
                    <span>Tap to flip</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-pink-950/90 via-purple-950/90 to-slate-900 p-6 border border-pink-500/30 flex flex-col items-center justify-center text-center shadow-2xl [transform:rotateY(180deg)]">
                  <Sparkles className="w-5 h-5 text-amber-300 mb-2" />
                  <h4 className="text-sm font-bold text-pink-200 mb-2">
                    {reason.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans-modern">
                    {reason.description}
                  </p>
                  <span className="mt-3 text-[10px] text-pink-400/80">Tap to flip back</span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
