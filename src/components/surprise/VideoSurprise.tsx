import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Play, Film, Sparkles } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';

interface VideoSurpriseProps {
  config: BirthdayPageConfig;
}

export const VideoSurprise: React.FC<VideoSurpriseProps> = ({ config }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!config.videoUrl) return null;

  const isYouTube = config.videoUrl.includes('youtube.com') || config.videoUrl.includes('youtu.be');
  const isVimeo = config.videoUrl.includes('vimeo.com');

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtube.com/watch')) {
      const id = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('vimeo.com/')) {
      const id = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
  };

  return (
    <section className="py-20 px-4 max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Film className="w-3.5 h-3.5" />
          <span>Cinematic Moments</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 font-elegant">
          {config.videoTitle || 'A Special Message Just for You'}
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
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

        <div className="relative aspect-video w-full bg-black/80 flex items-center justify-center overflow-hidden">
          {!isPlaying ? (
            <div className="relative w-full h-full flex items-center justify-center cursor-pointer" onClick={() => setIsPlaying(true)}>
              {config.videoThumbnailUrl ? (
                <img
                  src={config.videoThumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center" />
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

              {/* Glowing Play Button */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-full bg-pink-500/90 hover:bg-pink-500 text-white flex items-center justify-center shadow-2xl shadow-pink-500/50 border-2 border-white/40 group-hover:border-white transition-all"
                >
                  <Play className="w-8 h-8 fill-current ml-1" />
                </motion.button>
                <span className="text-xs sm:text-sm font-semibold text-white/90 drop-shadow flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tap to Watch Video Surprise</span>
                </span>
              </div>
            </div>
          ) : isYouTube || isVimeo ? (
            <iframe
              src={getEmbedUrl(config.videoUrl)}
              title="Birthday Video Message"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={config.videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </motion.div>
    </section>
  );
};
