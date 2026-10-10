import React, { useState, useRef } from 'react';
import { BirthdayPageConfig, GalleryPhoto } from '../../types';
import { BUILT_IN_AUDIO_TRACKS } from '../../constants/presets';
import { compressImageFile } from '../../lib/storage';
import { Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Video, Music, Sparkles, Mic, Plus } from 'lucide-react';

interface MediaManagerTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
}

export const MediaManagerTab: React.FC<MediaManagerTabProps> = ({ config, onChange }) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const voiceInputRef = useRef<HTMLInputElement | null>(null);

  // Profile photo upload
  const handleProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImageFile(file, 800, 0.85);
      onChange({ profilePhotoUrl: compressedDataUrl });
    } catch (err) {
      console.error('Photo compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Gallery multi-upload
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsCompressing(true);
      const newPhotos: GalleryPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await compressImageFile(file, 1200, 0.85);
        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url: dataUrl,
          caption: 'Special unforgettable memory',
          date: 'Special Moment',
          aspectRatio: 'portrait'
        });
      }

      onChange({
        galleryPhotos: [...(config.galleryPhotos || []), ...newPhotos]
      });
    } catch (err) {
      console.error('Gallery upload failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Move photo up / down
  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const current = [...(config.galleryPhotos || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    onChange({ galleryPhotos: current });
  };

  // Update single photo
  const updatePhoto = (index: number, fields: Partial<GalleryPhoto>) => {
    const current = [...(config.galleryPhotos || [])];
    current[index] = { ...current[index], ...fields };
    onChange({ galleryPhotos: current });
  };

  // Delete photo
  const deletePhoto = (index: number) => {
    const current = (config.galleryPhotos || []).filter((_, i) => i !== index);
    onChange({ galleryPhotos: current });
  };

  // Custom audio upload
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ customAudioUrl: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  // Custom voice message upload
  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ voiceMessageUrl: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
            <ImageIcon className="w-4 h-4" />
            <span>Birthday Person Profile Photo</span>
          </div>
          {isCompressing && (
            <span className="text-xs text-amber-300 animate-pulse">
              Optimizing image...
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-900 border-2 border-pink-500/40 shadow-xl flex items-center justify-center shrink-0">
            {config.profilePhotoUrl ? (
              <img
                src={config.profilePhotoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-500" />
            )}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <p className="text-xs text-slate-300">
              This photo will be showcased in the 3D celebration card after opening the gift box.
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhoto}
                className="hidden"
              />
              <button
                onClick={() => profileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Photo</span>
              </button>

              {config.profilePhotoUrl && (
                <button
                  onClick={() => onChange({ profilePhotoUrl: '' })}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery Manager */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Photo Gallery ({config.galleryPhotos?.length || 0} Photos)</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload multiple photos, drag & drop, add heartfelt captions & dates.
            </p>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleGalleryUpload}
            className="hidden"
          />
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Photos</span>
          </button>
        </div>

        {/* Gallery Headings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gallery Section Title
            </label>
            <input
              type="text"
              value={config.galleryHeading}
              onChange={(e) => onChange({ galleryHeading: e.target.value })}
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gallery Subtitle
            </label>
            <input
              type="text"
              value={config.gallerySubtitle}
              onChange={(e) => onChange({ gallerySubtitle: e.target.value })}
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>

        {/* Photos List */}
        <div className="space-y-3 pt-2">
          {config.galleryPhotos?.map((photo, index) => (
            <div
              key={photo.id || index}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <img
                src={photo.url}
                alt="Thumbnail"
                className="w-20 h-20 rounded-lg object-cover border border-white/10 shrink-0"
              />

              <div className="flex-1 space-y-2 w-full">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => updatePhoto(index, { caption: e.target.value })}
                  placeholder="Photo caption (e.g. That cozy winter road trip)"
                  className="w-full bg-slate-950 border border-white/10 focus:border-pink-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                />
                <input
                  type="text"
                  value={photo.date || ''}
                  onChange={(e) => updatePhoto(index, { date: e.target.value })}
                  placeholder="Date / Location (e.g. Autumn 2024)"
                  className="w-full sm:w-48 bg-slate-950 border border-white/10 focus:border-pink-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
                />
              </div>

              {/* Order & Delete Actions */}
              <div className="flex items-center gap-1 self-end sm:self-center">
                <button
                  disabled={index === 0}
                  onClick={() => movePhoto(index, 'up')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={index === (config.galleryPhotos?.length || 1) - 1}
                  onClick={() => movePhoto(index, 'down')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deletePhoto(index)}
                  className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Birthday Video Surprise Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Video className="w-4 h-4" />
          <span>Birthday Video Surprise</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Video URL (Direct MP4, YouTube, or Vimeo)
          </label>
          <input
            type="text"
            value={config.videoUrl || ''}
            onChange={(e) => onChange({ videoUrl: e.target.value })}
            placeholder="e.g. https://www.youtube.com/watch?v=... or https://.../video.mp4"
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Video Title
            </label>
            <input
              type="text"
              value={config.videoTitle || ''}
              onChange={(e) => onChange({ videoTitle: e.target.value })}
              placeholder="e.g. A Special Message Just for You"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Video Thumbnail Image URL
            </label>
            <input
              type="text"
              value={config.videoThumbnailUrl || ''}
              onChange={(e) => onChange({ videoThumbnailUrl: e.target.value })}
              placeholder="https://.../thumbnail.jpg"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Background Music & Voice Notes */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Music className="w-4 h-4" />
          <span>Background Music & Voice Message</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select Built-In Royalty-Free Instrumental Track
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUILT_IN_AUDIO_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => onChange({ bgMusicTrackId: track.id, customAudioUrl: '' })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  config.bgMusicTrackId === track.id && !config.customAudioUrl
                    ? 'bg-pink-500/20 border-pink-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="font-semibold text-xs text-slate-100">{track.title}</div>
                <div className="text-[10px] text-slate-400">{track.artist} · {track.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Audio Upload */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Or Upload Custom Audio Track (MP3/WAV)
            </div>
            <p className="text-[11px] text-slate-400">
              {config.customAudioUrl ? 'Custom track loaded' : 'Use your own special birthday song'}
            </p>
          </div>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
          <button
            onClick={() => audioInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload MP3</span>
          </button>
        </div>

        {/* Optional Voice Note */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>Personal Voice Message / Audio Note</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {config.voiceMessageUrl ? 'Voice message attached' : 'Upload an audio greeting from your phone'}
            </p>
          </div>

          <input
            ref={voiceInputRef}
            type="file"
            accept="audio/*"
            onChange={handleVoiceUpload}
            className="hidden"
          />
          <button
            onClick={() => voiceInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Voice Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};
