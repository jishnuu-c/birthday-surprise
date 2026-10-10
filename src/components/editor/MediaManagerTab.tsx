import React, { useState, useRef, useEffect } from 'react';
import { BirthdayPageConfig, GalleryPhoto } from '../../types';
import { BUILT_IN_AUDIO_TRACKS } from '../../constants/presets';
import { compressImageFile } from '../../lib/storage';
import { isSupabaseConfigured, uploadRemoteMedia } from '../../lib/supabase';
import { saveMediaBlob } from '../../lib/mediaDb';
import { 
  Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Video, Music, 
  Sparkles, Mic, Plus, Play, Pause, Volume2, VolumeX, RotateCcw, 
  Check, AlertCircle, FileAudio, FileVideo, Radio, RefreshCw, Eye, Film
} from 'lucide-react';

interface MediaManagerTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
}

export const MediaManagerTab: React.FC<MediaManagerTabProps> = ({ config, onChange }) => {
  // Loading & Progress states
  const [isCompressing, setIsCompressing] = useState(false);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Audio file metadata & local preview player
  const [audioFileName, setAudioFileName] = useState<string>('Custom Audio Track');
  const [audioFileSize, setAudioFileSize] = useState<string>('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Video file metadata & local preview
  const [videoFileName, setVideoFileName] = useState<string>('Personal Video Message');
  const [videoFileSize, setVideoFileSize] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // Voice note state
  const [voiceFileName, setVoiceFileName] = useState<string>('Personal Voice Note');

  // Input refs
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const videoThumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const voiceInputRef = useRef<HTMLInputElement | null>(null);

  // Audio element for in-editor preview
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Initialize preview audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioPreviewRef.current = audio;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
    };
    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime || 0);
    };
    const handleEnded = () => {
      setIsAudioPlaying(false);
      setAudioCurrentTime(0);
    };
    const handleError = () => {
      setIsAudioPlaying(false);
      if (config.customAudioUrl) {
        setAudioError('Could not load audio. Check that the format is supported.');
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Sync preview audio src with config
  useEffect(() => {
    if (audioPreviewRef.current && config.customAudioUrl) {
      audioPreviewRef.current.src = config.customAudioUrl;
      audioPreviewRef.current.load();
    }
  }, [config.customAudioUrl]);

  // Audio preview controls
  const toggleAudioPreview = () => {
    if (!audioPreviewRef.current || !config.customAudioUrl) return;
    if (isAudioPlaying) {
      audioPreviewRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioPreviewRef.current.play().then(() => {
        setIsAudioPlaying(true);
        setAudioError(null);
      }).catch((err) => {
        console.warn('Preview play error:', err);
        setAudioError('Playback failed. Please ensure file format is supported.');
      });
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = vol;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format file size helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Profile photo upload
  const handleProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      if (isSupabaseConfigured) {
        const uploadRes = await uploadRemoteMedia(file, 'images', `profile-${file.name}`);
        if (uploadRes.url) {
          onChange({ profilePhotoUrl: uploadRes.url });
          return;
        }
      }
      const compressedDataUrl = await compressImageFile(file, 800, 0.85);
      onChange({ profilePhotoUrl: compressedDataUrl });
    } catch (err) {
      console.error('Photo upload failed:', err);
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
        let url = '';

        if (isSupabaseConfigured) {
          const uploadRes = await uploadRemoteMedia(file, 'images', `gallery-${file.name}`);
          if (uploadRes.url) {
            url = uploadRes.url;
          }
        }

        if (!url) {
          url = await compressImageFile(file, 1200, 0.85);
        }

        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url,
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

  // Reorder photos
  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const current = [...(config.galleryPhotos || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    onChange({ galleryPhotos: current });
  };

  const updatePhoto = (index: number, fields: Partial<GalleryPhoto>) => {
    const current = [...(config.galleryPhotos || [])];
    current[index] = { ...current[index], ...fields };
    onChange({ galleryPhotos: current });
  };

  const deletePhoto = (index: number) => {
    const current = (config.galleryPhotos || []).filter((_, i) => i !== index);
    onChange({ galleryPhotos: current });
  };

  // --- MP3 / AUDIO UPLOAD HANDLER ---
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioError(null);
    setIsAudioUploading(true);
    setAudioFileName(file.name);
    setAudioFileSize(formatBytes(file.size));
    setAudioUploadProgress('Processing audio file...');

    const supportedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/aac', 'audio/webm', 'audio/flac'];
    const hasAudioExt = /\.(mp3|wav|m4a|ogg|aac|webm|flac)$/i.test(file.name);

    if (!supportedMimes.includes(file.type) && !hasAudioExt && file.type !== '') {
      setAudioError('Unsupported format. Please select an MP3, WAV, M4A, AAC, or OGG audio file.');
      setIsAudioUploading(false);
      return;
    }

    try {
      if (isSupabaseConfigured) {
        setAudioUploadProgress('Uploading to Supabase Cloud Storage...');
        const res = await uploadRemoteMedia(file, 'audios', file.name);
        if (res.url) {
          onChange({ customAudioUrl: res.url });
          setAudioUploadProgress(null);
          setIsAudioUploading(false);
          return;
        } else if (res.error) {
          console.warn('Supabase audio upload note:', res.error);
        }
      }

      // Local persistence fallback using IndexedDB
      setAudioUploadProgress('Saving to local storage engine...');
      const mediaId = `audio-${config.id}-${Date.now()}`;
      const { blobUrl } = await saveMediaBlob(mediaId, file, file.name);
      
      onChange({ customAudioUrl: blobUrl });
      setAudioUploadProgress(null);
    } catch (err: unknown) {
      console.error('Audio upload error:', err);
      setAudioError('Failed to process audio file. Please try another file.');
    } finally {
      setIsAudioUploading(false);
    }
  };

  const handleRemoveAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setIsAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioFileName('');
    setAudioFileSize('');
    setAudioError(null);
    onChange({ customAudioUrl: '' });
  };

  // --- VIDEO UPLOAD HANDLER ---
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setIsVideoUploading(true);
    setVideoFileName(file.name);
    setVideoFileSize(formatBytes(file.size));
    setVideoUploadProgress('Processing video file...');

    const supportedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'];
    const hasVideoExt = /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name);

    if (!supportedVideoMimes.includes(file.type) && !hasVideoExt && file.type !== '') {
      setVideoError('Unsupported format. Please select an MP4, WebM, or MOV video file.');
      setIsVideoUploading(false);
      return;
    }

    try {
      if (isSupabaseConfigured) {
        setVideoUploadProgress('Uploading video to Supabase Cloud Storage...');
        const res = await uploadRemoteMedia(file, 'videos', file.name);
        if (res.url) {
          onChange({ videoUrl: res.url });
          setVideoUploadProgress(null);
          setIsVideoUploading(false);
          return;
        } else if (res.error) {
          console.warn('Supabase video upload note:', res.error);
        }
      }

      // Local IndexedDB fallback
      setVideoUploadProgress('Saving video to local browser storage...');
      const mediaId = `video-${config.id}-${Date.now()}`;
      const { blobUrl } = await saveMediaBlob(mediaId, file, file.name);
      
      onChange({ videoUrl: blobUrl });
      setVideoUploadProgress(null);
    } catch (err: unknown) {
      console.error('Video upload error:', err);
      setVideoError('Failed to process video. Please try an MP4 video under 50MB.');
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFileName('');
    setVideoFileSize('');
    setVideoError(null);
    onChange({ videoUrl: '' });
  };

  // Video thumbnail upload
  const handleVideoThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isSupabaseConfigured) {
        const res = await uploadRemoteMedia(file, 'images', `thumb-${file.name}`);
        if (res.url) {
          onChange({ videoThumbnailUrl: res.url });
          return;
        }
      }
      const compressed = await compressImageFile(file, 1000, 0.85);
      onChange({ videoThumbnailUrl: compressed });
    } catch (err) {
      console.error('Thumbnail upload failed:', err);
    }
  };

  // Voice note upload
  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceFileName(file.name);
    try {
      if (isSupabaseConfigured) {
        const res = await uploadRemoteMedia(file, 'audios', `voice-${file.name}`);
        if (res.url) {
          onChange({ voiceMessageUrl: res.url });
          return;
        }
      }
      const mediaId = `voice-${config.id}-${Date.now()}`;
      const { blobUrl } = await saveMediaBlob(mediaId, file, file.name);
      onChange({ voiceMessageUrl: blobUrl });
    } catch (err) {
      console.error('Voice upload failed:', err);
    }
  };

  const hasCustomAudio = Boolean(config.customAudioUrl && config.customAudioUrl.trim() !== '');
  const hasCustomVideo = Boolean(config.videoUrl && config.videoUrl.trim() !== '');

  return (
    <div className="space-y-6">
      {/* 1. Profile Photo Section */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
            <ImageIcon className="w-4 h-4" />
            <span>Birthday Person Profile Photo</span>
          </div>
          {isCompressing && (
            <span className="text-xs text-amber-300 animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Optimizing image...</span>
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
            <p className="text-xs text-slate-300 leading-relaxed">
              This photo is featured in the celebration hero banner and the 3D greeting card.
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
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{config.profilePhotoUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
              </button>

              {config.profilePhotoUrl && (
                <button
                  type="button"
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

      {/* 2. Photo Gallery Manager */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Photo Gallery ({config.galleryPhotos?.length || 0} Photos)</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload memories from your phone or computer. Reorder, add captions, and dates.
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
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-start sm:self-center"
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
              value={config.galleryHeading || ''}
              onChange={(e) => onChange({ galleryHeading: e.target.value })}
              placeholder="e.g. Our Favorite Memories Together"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Gallery Subtitle
            </label>
            <input
              type="text"
              value={config.gallerySubtitle || ''}
              onChange={(e) => onChange({ gallerySubtitle: e.target.value })}
              placeholder="e.g. Every photograph holds a million smiles..."
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>

        {/* Photos List */}
        <div className="space-y-3 pt-2">
          {(!config.galleryPhotos || config.galleryPhotos.length === 0) ? (
            <div className="p-8 text-center border border-dashed border-white/15 rounded-xl bg-slate-900/40">
              <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">No photos in gallery yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "Add Photos" to upload your favorite memories.</p>
            </div>
          ) : (
            config.galleryPhotos.map((photo, index) => (
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
                    value={photo.caption || ''}
                    onChange={(e) => updatePhoto(index, { caption: e.target.value })}
                    placeholder="Photo caption (e.g. Sunset by the beach)"
                    className="w-full bg-slate-950 border border-white/10 focus:border-pink-500 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
                  />
                  <input
                    type="text"
                    value={photo.date || ''}
                    onChange={(e) => updatePhoto(index, { date: e.target.value })}
                    placeholder="Date / Milestone (e.g. Summer 2024)"
                    className="w-full sm:w-56 bg-slate-950 border border-white/10 focus:border-pink-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
                  />
                </div>

                {/* Order & Delete Actions */}
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePhoto(index, 'up')}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === (config.galleryPhotos?.length || 1) - 1}
                    onClick={() => movePhoto(index, 'down')}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePhoto(index)}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Audio & Music Management (Requirement 1) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
            <Music className="w-4 h-4" />
            <span>MP3 Audio & Background Music</span>
          </div>
          {isAudioUploading && (
            <span className="text-xs text-amber-300 animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{audioUploadProgress || 'Uploading audio...'}</span>
            </span>
          )}
        </div>

        {/* Custom Audio Upload Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/15 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-pink-400" />
                <span>Upload Custom Audio / Song (MP3, WAV, M4A, OGG)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload your recipient's favorite song or a personalized birthday soundtrack.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.webm"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                disabled={isAudioUploading}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{hasCustomAudio ? 'Change Audio File' : 'Upload MP3 Audio'}</span>
              </button>

              {hasCustomAudio && (
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Remove custom audio and restore built-in tracks"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Audio Status / Preview Player */}
          {hasCustomAudio ? (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-pink-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {audioFileName || 'Uploaded Custom Audio'}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Active on Birthday Page {audioFileSize ? `(${audioFileSize})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Play / Pause Preview Button */}
                <button
                  type="button"
                  onClick={toggleAudioPreview}
                  className="px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow"
                >
                  {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAudioPlaying ? 'Pause' : 'Preview Audio'}</span>
                </button>
              </div>

              {/* In-Editor Audio Scrubber & Controls */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                    {formatSeconds(audioCurrentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 100}
                    value={audioCurrentTime}
                    onChange={handleAudioSeek}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-[10px] text-slate-400 font-mono w-8">
                    {formatSeconds(audioDuration)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span>Volume:</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioVolume}
                      onChange={handleAudioVolumeChange}
                      className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>
                  <span>Will autoplay upon opening gift box (respecting browser interaction rules)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              No custom MP3 uploaded. One of the built-in ambient tracks below will play automatically.
            </div>
          )}

          {audioError && (
            <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{audioError}</span>
            </div>
          )}
        </div>

        {/* Built-in Instrumentals Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300">
              Or Choose Built-In Royalty-Free Instrumental
            </label>
            {hasCustomAudio && (
              <button
                type="button"
                onClick={handleRemoveAudio}
                className="text-[11px] text-pink-400 hover:text-pink-300 underline cursor-pointer"
              >
                Restore Built-In Track
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUILT_IN_AUDIO_TRACKS.map((track) => {
              const isSelected = config.bgMusicTrackId === track.id && !hasCustomAudio;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    handleRemoveAudio();
                    onChange({ bgMusicTrackId: track.id, customAudioUrl: '' });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pink-500/20 border-pink-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-100 flex items-center justify-between">
                    <span>{track.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{track.artist} · {track.category}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Note Upload */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>Personal Voice Message / Audio Note (Optional)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {config.voiceMessageUrl ? `Attached: ${voiceFileName}` : 'Upload a heartfelt voice memo recorded on your phone.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={voiceInputRef}
              type="file"
              accept="audio/*"
              onChange={handleVoiceUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => voiceInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{config.voiceMessageUrl ? 'Change Voice Note' : 'Upload Voice Note'}</span>
            </button>
            {config.voiceMessageUrl && (
              <button
                type="button"
                onClick={() => onChange({ voiceMessageUrl: '' })}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
                title="Remove voice note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Video Surprise Management (Requirement 2) */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
            <Video className="w-4 h-4" />
            <span>Personal Video Surprise</span>
          </div>
          {isVideoUploading && (
            <span className="text-xs text-amber-300 animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{videoUploadProgress || 'Uploading video...'}</span>
            </span>
          )}
        </div>

        {/* Video Upload Controls */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-white/15 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <FileVideo className="w-4 h-4 text-purple-400" />
                <span>Upload Your Own Video (MP4, WebM, MOV)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select a video file directly from your computer or phone gallery.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*,.mp4,.webm,.mov"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isVideoUploading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{hasCustomVideo ? 'Change Video File' : 'Upload Video File'}</span>
              </button>

              {hasCustomVideo && (
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Video</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Preview in Editor */}
          {hasCustomVideo ? (
            <div className="space-y-3 pt-2">
              <div className="relative aspect-video max-w-lg mx-auto rounded-2xl overflow-hidden bg-black border border-white/20 shadow-xl">
                <video
                  ref={videoPreviewRef}
                  src={config.videoUrl}
                  poster={config.videoThumbnailUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setVideoDuration(v.duration);
                  }}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{videoFileName || 'Selected Video Active'} {videoFileSize ? `(${videoFileSize})` : ''}</span>
                </span>
                {videoDuration && (
                  <span className="text-slate-400 font-mono">
                    Duration: {formatSeconds(videoDuration)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-white/15 rounded-xl bg-slate-950/40">
              <Film className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">No video selected</p>
              <p className="text-[11px] text-slate-400 mt-1">Upload a video to surprise the recipient on their special page.</p>
            </div>
          )}

          {videoError && (
            <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{videoError}</span>
            </div>
          )}
        </div>

        {/* Video Text Details & Thumbnail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Video Section Title
            </label>
            <input
              type="text"
              value={config.videoTitle || ''}
              onChange={(e) => onChange({ videoTitle: e.target.value })}
              placeholder="e.g. A Special Birthday Video Message"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Video Thumbnail Poster (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={videoThumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleVideoThumbnailUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoThumbnailInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Poster</span>
              </button>
              {config.videoThumbnailUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ videoThumbnailUrl: '' })}
                  className="p-2.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
                  title="Remove poster"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Video Subtitle / Description
          </label>
          <textarea
            rows={2}
            value={config.videoDescription || ''}
            onChange={(e) => onChange({ videoDescription: e.target.value })}
            placeholder="e.g. Turn up your sound and press play to experience a personal birthday montage."
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};

