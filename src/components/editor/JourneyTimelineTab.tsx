import React, { useState, useRef } from 'react';
import { BirthdayPageConfig, TimelineMemory } from '../../types';
import { compressImageFile } from '../../lib/storage';
import { isSupabaseConfigured, uploadRemoteMedia } from '../../lib/supabase';
import { 
  Clock, Sparkles, Calendar, Tag, Plus, Trash2, ArrowUp, ArrowDown, 
  Upload, Image as ImageIcon, Save, RefreshCw, CheckCircle2, 
  AlertCircle, Eye, Check, Layers, Compass, HelpCircle
} from 'lucide-react';

interface JourneyTimelineTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

// Preset milestone inspirations to help creators add memories quickly
const INSPIRATION_PRESETS = [
  {
    title: 'The First Hello',
    yearOrDate: 'Day One',
    tag: 'First Spark',
    description: 'The moment we first crossed paths and knew this connection was something truly extraordinary.'
  },
  {
    title: 'The Great Road Trip',
    yearOrDate: 'That Epic Summer',
    tag: 'Adventure',
    description: 'Windows down, our favorite playlist blasting, and getting wonderfully lost along the scenic route.'
  },
  {
    title: 'Late Night Matcha & Dreams',
    yearOrDate: 'A Memorable Night',
    tag: 'Heartfelt',
    description: 'Talking for hours until 3 AM about all our wildest ambitions, dreams, and ridiculous inside jokes.'
  },
  {
    title: 'The Big Celebration',
    yearOrDate: 'Today — The Milestone',
    tag: 'Celebration',
    description: 'Celebrating the incredible person you are today and all the magical memories still waiting ahead!'
  }
];

export const JourneyTimelineTab: React.FC<JourneyTimelineTabProps> = ({
  config,
  onChange,
  onSave,
  saveStatus = 'idle'
}) => {
  const isEnabled = config.sections?.memoryTimeline ?? true;
  const memories: TimelineMemory[] = config.timelineMemories || [];

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showInspirations, setShowInspirations] = useState(false);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Toggle section visibility
  const handleToggleSection = () => {
    onChange({
      sections: {
        ...config.sections,
        memoryTimeline: !isEnabled
      }
    });
  };

  // Add new milestone
  const handleAddMilestone = (preset?: typeof INSPIRATION_PRESETS[0]) => {
    const newMilestone: TimelineMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      yearOrDate: preset ? preset.yearOrDate : 'Special Chapter',
      title: preset ? preset.title : 'An Unforgettable Memory',
      description: preset ? preset.description : 'Describe what happened, where you were, or why this day meant so much to both of you...',
      tag: preset ? preset.tag : 'Memorable',
      imageUrl: ''
    };

    onChange({
      timelineMemories: [...memories, newMilestone]
    });
  };

  // Update specific milestone
  const handleUpdateMilestone = (index: number, updates: Partial<TimelineMemory>) => {
    const list = [...memories];
    list[index] = { ...list[index], ...updates };
    onChange({ timelineMemories: list });
  };

  // Delete milestone
  const handleDeleteMilestone = (index: number) => {
    const list = memories.filter((_, i) => i !== index);
    onChange({ timelineMemories: list });
  };

  // Reorder milestones
  const handleMoveMilestone = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= memories.length) return;

    const list = [...memories];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    onChange({ timelineMemories: list });
  };

  // Duplicate milestone
  const handleDuplicateMilestone = (index: number) => {
    const source = memories[index];
    const duplicate: TimelineMemory = {
      ...source,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${source.title} (Copy)`
    };

    const list = [...memories];
    list.splice(index + 1, 0, duplicate);
    onChange({ timelineMemories: list });
  };

  // Handle photo file upload for a milestone
  const handlePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    setUploadError(null);

    try {
      if (isSupabaseConfigured) {
        const uploadRes = await uploadRemoteMedia(file, 'images', `timeline-${Date.now()}-${file.name}`);
        if (uploadRes.url) {
          handleUpdateMilestone(index, { imageUrl: uploadRes.url });
          return;
        } else if (uploadRes.error) {
          console.warn('Cloud upload notice, falling back to local compressed:', uploadRes.error);
        }
      }

      // Local compressed fallback
      const compressedDataUrl = await compressImageFile(file, 1000, 0.85);
      handleUpdateMilestone(index, { imageUrl: compressedDataUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      setUploadError(msg);
    } finally {
      setUploadingIndex(null);
      // Reset input value
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Section Controls Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 shadow-lg">
              <Clock className="w-5 h-5 text-[#E8C982]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Chapters of Our Journey</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8C982]/20 text-[#E8C982] border border-[#E8C982]/40">
                  {memories.length} {memories.length === 1 ? 'Milestone' : 'Milestones'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chronological milestone timeline with custom dates, tags, heartfelt stories, and photos.
              </p>
            </div>
          </div>

          {/* Visibility Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-300">
              {isEnabled ? 'Section Enabled' : 'Section Hidden'}
            </span>
            <button
              type="button"
              onClick={handleToggleSection}
              role="switch"
              aria-checked={isEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                isEnabled ? 'bg-pink-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section Notice when disabled */}
        {!isEnabled && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              This section is currently disabled. Toggle the switch above to display <strong>Chapters of Our Journey</strong> on your surprise page.
            </span>
          </div>
        )}

        {/* Global Section Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>Section Heading</span>
              <span className="text-[11px] text-slate-500 font-normal">(Display Title)</span>
            </label>
            <input
              type="text"
              value={config.timelineHeading ?? 'Chapters of Our Journey'}
              onChange={(e) => onChange({ timelineHeading: e.target.value })}
              placeholder="e.g. Chapters of Our Journey"
              className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <span>Section Subtitle</span>
              <span className="text-[11px] text-slate-500 font-normal">(Introductory summary)</span>
            </label>
            <input
              type="text"
              value={config.timelineSubtitle ?? 'Looking back at the milestones and magical days that brought us here.'}
              onChange={(e) => onChange({ timelineSubtitle: e.target.value })}
              placeholder="e.g. Looking back at the milestones and magical days that brought us here."
              className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium outline-none transition-colors"
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddMilestone()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-pink-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Milestone</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInspirations(!showInspirations)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#E8C982]" />
              <span>Idea Presets</span>
            </button>
          </div>

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
            >
              {saveStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Milestones'}</span>
            </button>
          )}
        </div>

        {/* Quick Inspiration Drawer */}
        {showInspirations && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-[#E8C982]/30 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E8C982] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Click any preset idea to add it as a new milestone:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowInspirations(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INSPIRATION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleAddMilestone(preset);
                    setShowInspirations(false);
                  }}
                  className="p-3 rounded-xl bg-white/5 hover:bg-[#E8C982]/10 border border-white/10 hover:border-[#E8C982]/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-[#E8C982] transition-colors">
                      {preset.title}
                    </span>
                    <span className="text-[10px] font-semibold text-[#E8C982] bg-[#E8C982]/15 px-2 py-0.5 rounded-full">
                      {preset.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global upload error banner */}
      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-xs opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Milestones List */}
      {memories.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-slate-900/60 border border-dashed border-white/20 space-y-3">
          <Clock className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Milestones Added Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Add cherished memories to tell the story of your friendship, journey, or relationship over time.
          </p>
          <button
            type="button"
            onClick={() => handleAddMilestone()}
            className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Milestone</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((mem, index) => (
            <div
              key={mem.id || index}
              className="p-5 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-[#E8C982]/30 transition-all duration-200 shadow-xl space-y-4 relative group"
            >
              {/* Card Header & Controls */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#E8C982] text-slate-950 font-black text-xs flex items-center justify-center shadow-md shadow-[#E8C982]/40">
                    {index + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-200">
                    {mem.title || `Milestone #${index + 1}`}
                  </span>
                  {mem.tag && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8C982] bg-[#E8C982]/10 px-2 py-0.5 rounded-full border border-[#E8C982]/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      {mem.tag}
                    </span>
                  )}
                </div>

                {/* Reorder, Duplicate & Delete buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveMilestone(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Move up chronologically"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMilestone(index, 'down')}
                    disabled={index === memories.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Move down chronologically"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateMilestone(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#E8C982] hover:bg-white/10 cursor-pointer transition-colors"
                    title="Duplicate milestone"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors ml-1"
                    title="Delete milestone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Date or Year */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#E8C982]" />
                    <span>Date or Year</span>
                  </label>
                  <input
                    type="text"
                    value={mem.yearOrDate || ''}
                    onChange={(e) => handleUpdateMilestone(index, { yearOrDate: e.target.value })}
                    placeholder="e.g. 2020 — Day One"
                    className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-colors"
                  />
                </div>

                {/* Tag / Badge */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#E8C982]" />
                    <span>Tag / Highlight</span>
                  </label>
                  <input
                    type="text"
                    value={mem.tag || ''}
                    onChange={(e) => handleUpdateMilestone(index, { tag: e.target.value })}
                    placeholder="e.g. First Spark, Adventure"
                    className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-colors"
                  />
                </div>

                {/* Milestone Title */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#E8C982]" />
                    <span>Milestone Title</span>
                  </label>
                  <input
                    type="text"
                    value={mem.title || ''}
                    onChange={(e) => handleUpdateMilestone(index, { title: e.target.value })}
                    placeholder="e.g. The First Hello"
                    className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Description Story */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Milestone Story / Memory Description
                </label>
                <textarea
                  rows={2}
                  value={mem.description || ''}
                  onChange={(e) => handleUpdateMilestone(index, { description: e.target.value })}
                  placeholder="The moment we first talked over matcha lattes and lost track of 4 hours..."
                  className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none resize-none leading-relaxed transition-colors"
                />
              </div>

              {/* Photo Upload & Preview Section */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#E8C982]" />
                    <span>Milestone Photo</span>
                    <span className="text-[10px] text-slate-500 font-normal">(Optional memory snapshot)</span>
                  </span>

                  {mem.imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleUpdateMilestone(index, { imageUrl: '' })}
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Photo Preview Thumbnail */}
                  {mem.imageUrl ? (
                    <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-white/15 shrink-0 bg-slate-900 group/img">
                      <img
                        src={mem.imageUrl}
                        alt={mem.title || 'Milestone photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-20 rounded-xl border border-dashed border-white/15 shrink-0 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 gap-1 text-[10px]">
                      <ImageIcon className="w-5 h-5 text-slate-600" />
                      <span>No Photo</span>
                    </div>
                  )}

                  {/* Upload Controls & URL Input */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        onChange={(e) => handlePhotoUpload(index, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {uploadingIndex === index ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-[#E8C982]" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3 text-[#E8C982]" />
                            <span>Upload from Device</span>
                          </>
                        )}
                      </button>
                    </div>

                    <input
                      type="url"
                      value={mem.imageUrl || ''}
                      onChange={(e) => handleUpdateMilestone(index, { imageUrl: e.target.value })}
                      placeholder="Or paste an image web URL (https://...)"
                      className="w-full bg-slate-950 border border-white/15 focus:border-[#E8C982] rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Bottom Add Button & Save Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => handleAddMilestone()}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 text-[#E8C982]" />
          <span>Add Another Milestone</span>
        </button>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved Successfully!' : 'Save All Changes'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
