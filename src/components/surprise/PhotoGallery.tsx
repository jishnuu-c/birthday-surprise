import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronLeft, ChevronRight, X, Play, Pause, Maximize2, Calendar, Sparkles } from 'lucide-react';
import { BirthdayPageConfig, GalleryPhoto } from '../../types';

interface PhotoGalleryProps {
  config: BirthdayPageConfig;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ config }) => {
  const photos = config.galleryPhotos || [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);

  // Slideshow timer
  useEffect(() => {
    let timer: number;
    if (isSlideshowPlaying && selectedIndex !== null && photos.length > 1) {
      timer = window.setInterval(() => {
        setSelectedIndex((prev) => (prev !== null ? (prev + 1) % photos.length : 0));
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isSlideshowPlaying, selectedIndex, photos.length]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowRight') setSelectedIndex((prev) => (prev! + 1) % photos.length);
      if (e.key === 'ArrowLeft') setSelectedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, photos.length]);

  if (!photos.length) return null;

  const currentPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <section className="py-20 px-4 max-w-6xl mx-auto relative z-10">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-luxury border border-[#E8C982]/30 text-[#E8C982] text-xs font-semibold uppercase tracking-wider mb-4">
          <Camera className="w-3.5 h-3.5 text-[#E8C982]" />
          <span>Treasured Moments</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#FFF8F0] font-elegant">
          {config.galleryHeading || 'Our Beautiful Memories'}
        </h2>
        <p className="mt-3 text-[#F7DCE5]/80 text-sm sm:text-base leading-relaxed">
          {config.gallerySubtitle || 'Every photograph holds a million smiles, endless adventures, and unforgettable laughter.'}
        </p>
      </div>

      {/* Modern Responsive Masonry / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id || index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            onClick={() => setSelectedIndex(index)}
            className="group relative rounded-2xl overflow-hidden glass-panel border border-[#E8C982]/20 cursor-pointer shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-[#E8C982]/60 hover:shadow-2xl hover:shadow-[#E8C982]/10"
          >
            {/* Image Container */}
            <div className="aspect-[4/3] sm:aspect-[3/4] overflow-hidden relative">
              <img
                src={photo.url}
                alt={photo.caption || `Memory ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
            </div>

            {/* Hover overlay & caption */}
            <div className="absolute bottom-0 inset-x-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              {photo.date && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-pink-300 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span>{photo.date}</span>
                </div>
              )}
              <p className="text-sm font-medium text-slate-100 line-clamp-2 leading-snug">
                {photo.caption || 'Special moments together'}
              </p>
            </div>

            {/* Zoom Icon Pill */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox / Fullscreen Slideshow Modal */}
      <AnimatePresence>
        {selectedIndex !== null && currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-8"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10">
                  {selectedIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                    isSlideshowPlaying ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-300'
                  }`}
                >
                  {isSlideshowPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSlideshowPlaying ? 'Pause Slideshow' : 'Play Slideshow'}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedIndex(null);
                  setIsSlideshowPlaying(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image View */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <motion.img
                key={currentPhoto.id || selectedIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                src={currentPhoto.url}
                alt={currentPhoto.caption}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
              />

              {/* Prev / Next Buttons */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex((prev) => (prev! - 1 + photos.length) % photos.length);
                    }}
                    className="absolute left-2 sm:left-6 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-transform active:scale-95"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex((prev) => (prev! + 1) % photos.length);
                    }}
                    className="absolute right-2 sm:right-6 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white transition-transform active:scale-95"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="max-w-2xl mx-auto text-center px-4">
              {currentPhoto.date && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{currentPhoto.date}</span>
                </div>
              )}
              {currentPhoto.caption && (
                <p className="text-slate-200 text-sm sm:text-base font-medium">
                  {currentPhoto.caption}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
