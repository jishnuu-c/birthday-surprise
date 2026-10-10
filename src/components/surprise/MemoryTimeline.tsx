import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { BirthdayPageConfig, TimelineMemory } from '../../types';

interface MemoryTimelineProps {
  config: BirthdayPageConfig;
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ config }) => {
  const memories: TimelineMemory[] = config.timelineMemories || [];

  if (!memories.length) return null;

  return (
    <section className="py-20 px-4 max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Our Journey Together</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 font-elegant">
          {config.timelineHeading || 'Chapters of Our Journey'}
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          {config.timelineSubtitle || 'Looking back at the milestones and magical days that brought us here.'}
        </p>
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative border-l-2 border-pink-500/30 ml-4 sm:ml-32 space-y-12">
        {memories.map((mem, index) => (
          <motion.div
            key={mem.id || index}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: index * 0.15, duration: 0.6 }}
            className="relative pl-6 sm:pl-10 group"
          >
            {/* Timeline Glowing Node Dot */}
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-pink-500 border-4 border-slate-950 shadow-md shadow-pink-500/50 group-hover:scale-125 transition-transform" />

            {/* Date Tag for Desktop (Positioned to the left) */}
            <div className="hidden sm:block absolute -left-36 top-1 w-28 text-right font-bold text-xs text-pink-300 uppercase tracking-wider">
              {mem.yearOrDate}
            </div>

            {/* Content Card */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-pink-500/30 transition-all duration-300 shadow-xl">
              {/* Mobile Date Tag */}
              <div className="sm:hidden inline-block text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">
                {mem.yearOrDate}
              </div>

              {mem.tag && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-2">
                  <Sparkles className="w-3 h-3" />
                  {mem.tag}
                </span>
              )}

              <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-2 font-sans-modern">
                {mem.title}
              </h3>

              <p className="text-slate-300 text-sm leading-relaxed">
                {mem.description}
              </p>

              {mem.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden aspect-video sm:aspect-[2/1] border border-white/10 shadow-lg">
                  <img
                    src={mem.imageUrl}
                    alt={mem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
