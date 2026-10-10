import React, { useState } from 'react';
import { BirthdayPageConfig, SectionsConfig, SpecialReason, TimelineMemory } from '../../types';
import { CheckSquare, Square, Layers, Plus, Trash2, Cake, Ticket, Heart, Clock } from 'lucide-react';

interface SectionManagerTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
}

export const SectionManagerTab: React.FC<SectionManagerTabProps> = ({ config, onChange }) => {
  const sections = config.sections;
  const [activeSubTab, setActiveSubTab] = useState<'toggles' | 'timeline' | 'reasons' | 'cake' | 'scratch'>('toggles');

  const toggleSection = (key: keyof SectionsConfig) => {
    onChange({
      sections: {
        ...sections,
        [key]: !sections[key]
      }
    });
  };

  // Section list items
  const sectionMeta: { key: keyof SectionsConfig; name: string; icon: string; desc: string }[] = [
    { key: 'giftLanding', name: 'Interactive 3D Gift Box Screen', icon: '🎁', desc: 'Opening surprise animation with ribbon and confetti burst' },
    { key: 'celebrationHero', name: 'Birthday Celebration Hero', icon: '🌟', desc: 'Large animated greeting, glowing photo frame & badge' },
    { key: 'photoGallery', name: 'Personal Photo Gallery', icon: '📸', desc: 'Interactive memory grid & full-screen slideshow' },
    { key: 'birthdayVideo', name: 'Personal Birthday Video', icon: '🎬', desc: 'Cinematic video player with custom thumbnail' },
    { key: 'personalLetter', name: 'Handwritten Letter with Wax Seal', icon: '💌', desc: 'Vintage envelope opening and typewriter text reveal' },
    { key: 'memoryTimeline', name: 'Interactive Memory Timeline', icon: '⏳', desc: 'Chronological milestone journey with dates and stories' },
    { key: 'birthdayCake', name: 'Birthday Cake & Candle Blowing', icon: '🎂', desc: 'Make a wish with button or live microphone blow detection' },
    { key: 'reasonsSpecial', name: 'Reasons You Are Special', icon: '💖', desc: 'Interactive flippable cards with heartfelt qualities' },
    { key: 'scratchSurprise', name: 'Secret Scratch Mystery Card', icon: '🎟️', desc: 'Scratch-to-reveal golden ticket with voucher / gift code' },
    { key: 'finalCelebration', name: 'Final Grand Fireworks Finale', icon: '🎆', desc: 'Celebratory message, grand confetti & social share buttons' }
  ];

  // Timeline handlers
  const addTimelineItem = () => {
    const newMem: TimelineMemory = {
      id: `mem-${Date.now()}`,
      yearOrDate: 'Special Date',
      title: 'A Beautiful Memory',
      description: 'Describe this memorable moment...',
      tag: 'Cherished'
    };
    onChange({ timelineMemories: [...(config.timelineMemories || []), newMem] });
  };

  const updateTimelineItem = (index: number, fields: Partial<TimelineMemory>) => {
    const list = [...(config.timelineMemories || [])];
    list[index] = { ...list[index], ...fields };
    onChange({ timelineMemories: list });
  };

  const deleteTimelineItem = (index: number) => {
    const list = (config.timelineMemories || []).filter((_, i) => i !== index);
    onChange({ timelineMemories: list });
  };

  // Reasons handlers
  const addReasonItem = () => {
    const newReason: SpecialReason = {
      id: `r-${Date.now()}`,
      title: 'Your Caring Heart',
      description: 'You always bring endless joy and warmth wherever you go.',
      emoji: '💖'
    };
    onChange({ reasonsList: [...(config.reasonsList || []), newReason] });
  };

  const updateReasonItem = (index: number, fields: Partial<SpecialReason>) => {
    const list = [...(config.reasonsList || [])];
    list[index] = { ...list[index], ...fields };
    onChange({ reasonsList: list });
  };

  const deleteReasonItem = (index: number) => {
    const list = (config.reasonsList || []).filter((_, i) => i !== index);
    onChange({ reasonsList: list });
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
        <button
          onClick={() => setActiveSubTab('toggles')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'toggles' ? 'bg-pink-500 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Enable / Disable Sections</span>
        </button>

        <button
          onClick={() => setActiveSubTab('timeline')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'timeline' ? 'bg-pink-500 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timeline Stories ({config.timelineMemories?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reasons')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'reasons' ? 'bg-pink-500 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Reasons Cards ({config.reasonsList?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cake')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'cake' ? 'bg-pink-500 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Cake className="w-3.5 h-3.5" />
          <span>Cake & Wish</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scratch')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeSubTab === 'scratch' ? 'bg-pink-500 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Scratch Mystery Card</span>
        </button>
      </div>

      {/* 1. Toggles View */}
      {activeSubTab === 'toggles' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-pink-300 uppercase tracking-wider">
              Surprise Page Sections
            </span>
            <span className="text-xs text-slate-400">
              Turn any section ON or OFF based on your surprise preference.
            </span>
          </div>

          <div className="space-y-2.5">
            {sectionMeta.map(({ key, name, icon, desc }) => {
              const isEnabled = sections[key];

              return (
                <div
                  key={key}
                  onClick={() => toggleSection(key)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isEnabled
                      ? 'bg-slate-900/90 border-pink-500/40 hover:border-pink-500'
                      : 'bg-slate-950/40 border-white/5 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-slate-100">{name}</div>
                      <div className="text-[11px] text-slate-400">{desc}</div>
                    </div>
                  </div>

                  <div className="text-pink-400">
                    {isEnabled ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Timeline Editor */}
      {activeSubTab === 'timeline' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-pink-300 uppercase tracking-wider">
              Memory Timeline Milestones
            </span>
            <button
              onClick={addTimelineItem}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </div>

          <div className="space-y-4">
            {config.timelineMemories?.map((mem, index) => (
              <div key={mem.id || index} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Milestone #{index + 1}</span>
                  <button
                    onClick={() => deleteTimelineItem(index)}
                    className="text-red-400 hover:text-red-300 text-xs p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={mem.yearOrDate}
                    onChange={(e) => updateTimelineItem(index, { yearOrDate: e.target.value })}
                    placeholder="Date or Year (e.g. 2022 - Summer)"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                  />
                  <input
                    type="text"
                    value={mem.title}
                    onChange={(e) => updateTimelineItem(index, { title: e.target.value })}
                    placeholder="Milestone Title (e.g. The Road Trip)"
                    className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                <textarea
                  rows={2}
                  value={mem.description}
                  onChange={(e) => updateTimelineItem(index, { description: e.target.value })}
                  placeholder="Describe what made this day so special..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none resize-none"
                />

                <input
                  type="text"
                  value={mem.imageUrl || ''}
                  onChange={(e) => updateTimelineItem(index, { imageUrl: e.target.value })}
                  placeholder="Optional Photo Image URL"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Reasons Editor */}
      {activeSubTab === 'reasons' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-pink-300 uppercase tracking-wider">
              Reasons Why You Are Special
            </span>
            <button
              onClick={addReasonItem}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reason</span>
            </button>
          </div>

          <div className="space-y-3">
            {config.reasonsList?.map((reason, index) => (
              <div key={reason.id || index} className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={reason.emoji || '💖'}
                    onChange={(e) => updateReasonItem(index, { emoji: e.target.value })}
                    className="w-12 text-center bg-slate-950 border border-white/10 rounded-lg py-1 text-sm text-white"
                  />
                  <input
                    type="text"
                    value={reason.title}
                    onChange={(e) => updateReasonItem(index, { title: e.target.value })}
                    placeholder="Reason Title (e.g. Your Radiant Smile)"
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                  />
                  <button
                    onClick={() => deleteReasonItem(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={reason.description}
                  onChange={(e) => updateReasonItem(index, { description: e.target.value })}
                  placeholder="What makes this quality so special to you..."
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Cake & Candle Config */}
      {activeSubTab === 'cake' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <span className="text-sm font-bold text-pink-300 uppercase tracking-wider block">
            Cake & Candle Blowing Options
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Number of Glowing Candles
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.candlesCount || 5}
                onChange={(e) => onChange({ candlesCount: Number(e.target.value) || 5 })}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Make a Wish Prompt Text
              </label>
              <input
                type="text"
                value={config.wishPrompt}
                onChange={(e) => onChange({ wishPrompt: e.target.value })}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Wish Completed Success Message
            </label>
            <textarea
              rows={2}
              value={config.wishCompletedMessage}
              onChange={(e) => onChange({ wishCompletedMessage: e.target.value })}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* 5. Scratch Card Config */}
      {activeSubTab === 'scratch' && (
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <span className="text-sm font-bold text-pink-300 uppercase tracking-wider block">
            Mystery Scratch Card Details
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Scratch Section Heading
              </label>
              <input
                type="text"
                value={config.scratchTitle}
                onChange={(e) => onChange({ scratchTitle: e.target.value })}
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gift / Voucher Code (Optional)
              </label>
              <input
                type="text"
                value={config.scratchGiftCode || ''}
                onChange={(e) => onChange({ scratchGiftCode: e.target.value })}
                placeholder="e.g. BDAY-VIP-DINNER-2026"
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Hidden Surprise Message Revealed After Scratching
            </label>
            <textarea
              rows={3}
              value={config.scratchSecretMessage}
              onChange={(e) => onChange({ scratchSecretMessage: e.target.value })}
              placeholder="e.g. 🎟️ VIP PASS: All-Expense-Paid Dinner at Your Dream Restaurant!"
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
