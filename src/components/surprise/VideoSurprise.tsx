import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Film, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';

interface VideoSurpriseProps {
  config: BirthdayPageConfig;
}

export const VideoSurprise: React.FC<VideoSurpriseProps> = ({ config }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!config.videoUrl || config.videoUrl.trim() === '') {
    return null;
  }

  const rawUrl = config.videoUrl.trim();
  const isYouTube = rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be');
  const isVimeo = rawUrl.includes('vimeo.com');

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (url.includes('youtube.com/watch')) {
      const id = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
  };

  const handleStartPlay = () => {
    setIsPlaying(true);
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Video autoplay catch:', err);
      });
    }
  };

  return (
    <section className="py-20 px-4 max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-luxury border border-[#E8C982]/30 text-[#E8C982] text-xs font-semibold uppercase tracking-wider mb-4">
          <Film className="w-3.5 h-3.5 text-[#E8C982]" />
          <span>Cinematic Moments</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#FFF8F0] font-elegant">
          {config.videoTitle || 'A Special Message Just for You'}
        </h2>
        <p className="mt-3 text-[#F7DCE5]/80 text-sm sm:text-base leading-relaxed">
          {config.videoDescription || 'Turn up your sound and press play to experience a personal birthday montage.'}
        </p>
      </div>

      {/* Cinematic Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative group rounded-3xl overflow-hidden glass-panel-dark border border-white/20 shadow-2xl shadow-purple-500/10"
      >
        {/* Ambient Backlight */}
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500 -z-10" />

        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {hasError ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-sm font-semibold text-slate-200">
                Could not play this video file.
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Please check the video format (MP4/WebM/MOV recommended) or upload a supported video in the editor.
              </p>
              <button
                onClick={() => {
                  setHasError(false);
                  setIsPlaying(false);
                }}
                className="mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : !isPlaying ? (
            <div
              className="relative w-full h-full flex items-center justify-center cursor-pointer group"
              onClick={handleStartPlay}
            >
              {config.videoThumbnailUrl ? (
                <img
                  src={config.videoThumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center">
                  <Film className="w-20 h-20 text-purple-500/20" />
                </div>
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] group-hover:bg-black/30 transition-colors" />

              {/* Glowing Play Button */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Play video"
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white flex items-center justify-center shadow-2xl shadow-pink-500/50 border-2 border-white/50 group-hover:border-white transition-all cursor-pointer"
                >
                  <Play className="w-8 h-8 fill-current ml-1" />
                </motion.button>
                <span className="text-xs sm:text-sm font-semibold text-white/95 drop-shadow flex items-center gap-1.5 bg-black/40 px-3.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tap to Play Video Surprise</span>
                </span>
              </div>
            </div>
          ) : isYouTube || isVimeo ? (
            <iframe
              src={getEmbedUrl(rawUrl)}
              title="Birthday Video Message"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={rawUrl}
              poster={config.videoThumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setHasError(true)}
              className="w-full h-full object-contain bg-black"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </motion.div>
    </section>
  );
};

