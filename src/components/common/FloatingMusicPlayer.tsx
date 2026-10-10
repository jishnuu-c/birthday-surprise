import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Play, Pause, ChevronUp, Radio, AlertCircle } from 'lucide-react';
import { audioEngine, AudioState } from '../../lib/audioService';
import { BUILT_IN_AUDIO_TRACKS } from '../../constants/presets';

interface FloatingMusicPlayerProps {
  trackId: string;
  customAudioUrl?: string;
  accentColor?: string;
}

export const FloatingMusicPlayer: React.FC<FloatingMusicPlayerProps> = ({
  trackId,
  customAudioUrl,
  accentColor = '#ec4899'
}) => {
  const [audioState, setAudioState] = useState<AudioState>(audioEngine.getState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(trackId || 'synth-happy-birthday-warm');

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setAudioState(state);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (trackId) {
      setSelectedTrack(trackId);
    }
  }, [trackId]);

  const handleTogglePlay = () => {
    audioEngine.togglePlay(selectedTrack, customAudioUrl);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.toggleMute();
  };

  const handleSelectTrack = (id: string) => {
    setSelectedTrack(id);
    audioEngine.play(id, undefined);
    setIsExpanded(false);
  };

  const handlePlayCustom = () => {
    if (customAudioUrl) {
      audioEngine.play(selectedTrack, customAudioUrl);
      setIsExpanded(false);
    }
  };

  const activeTrackObj = BUILT_IN_AUDIO_TRACKS.find(t => t.id === selectedTrack) || BUILT_IN_AUDIO_TRACKS[0];
  const isPlaying = audioState.isPlaying;
  const isMuted = audioState.isMuted;
  const hasCustom = Boolean(customAudioUrl && customAudioUrl.trim() !== '');

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Track Selection Panel */}
      {isExpanded && (
        <div className="mb-3 w-72 sm:w-80 rounded-2xl p-4 glass-panel-dark border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink-300">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Surprise Music Player</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {hasCustom && (
              <button
                onClick={handlePlayCustom}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                  audioState.customUrl === customAudioUrl && isPlaying
                    ? 'bg-pink-500/20 border border-pink-500 text-white font-medium shadow-md'
                    : 'bg-purple-500/15 border border-purple-500/30 text-purple-200 hover:bg-purple-500/25'
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>🎵 Personal Custom Track</span>
                  </div>
                  <div className="text-[10px] text-purple-300/80">Uploaded audio file</div>
                </div>
                {audioState.customUrl === customAudioUrl && isPlaying && (
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 h-full bg-pink-400 animate-bounce" />
                    <span className="w-0.5 h-2/3 bg-pink-400 animate-bounce delay-75" />
                    <span className="w-0.5 h-4/5 bg-pink-400 animate-bounce delay-150" />
                  </span>
                )}
              </button>
            )}

            <div className="text-[10px] uppercase font-bold text-slate-400 px-1 pt-1">
              Built-in Instrumentals
            </div>

            {BUILT_IN_AUDIO_TRACKS.map((t) => {
              const isCurrent = !audioState.customUrl && selectedTrack === t.id && isPlaying;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTrack(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-pink-500/20 border border-pink-500/40 text-white font-medium'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-slate-100 truncate">{t.title}</div>
                    <div className="text-[10px] text-slate-400">{t.artist} · {t.category}</div>
                  </div>
                  {isCurrent && (
                    <span className="flex gap-0.5 items-end h-3">
                      <span className="w-0.5 h-full bg-pink-400 animate-bounce" />
                      <span className="w-0.5 h-2/3 bg-pink-400 animate-bounce delay-75" />
                      <span className="w-0.5 h-4/5 bg-pink-400 animate-bounce delay-150" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {audioState.error && (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{audioState.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Pill Button */}
      <div className="flex items-center gap-2 bg-slate-900/95 border border-white/15 hover:border-pink-500/40 p-2 pr-3 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-pink-500/20">
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 relative group overflow-hidden cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #f43f5e)` }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}

          {/* Equalizer animation ring */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping opacity-30" />
          )}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-left flex flex-col justify-center px-1 max-w-[120px] sm:max-w-[170px] cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Music className={`w-3 h-3 shrink-0 ${isPlaying ? 'text-pink-400 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '4s' }} />
            <span className="text-[11px] font-semibold text-slate-200 truncate">
              {hasCustom ? 'Personal Birthday Song' : activeTrackObj.title}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            {isPlaying ? (isMuted ? 'Muted' : 'Playing music') : 'Tap to play music'}
            <ChevronUp className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </span>
        </button>

        <button
          onClick={handleToggleMute}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>
      </div>
    </div>
  );
};

