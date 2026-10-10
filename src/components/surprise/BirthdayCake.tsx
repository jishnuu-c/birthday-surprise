import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Sparkles, Mic, MicOff, Wind, RotateCcw } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { audioEngine } from '../../lib/audioService';
import { fireHeartBurst } from '../../lib/confetti';

interface BirthdayCakeProps {
  config: BirthdayPageConfig;
}

export const BirthdayCake: React.FC<BirthdayCakeProps> = ({ config }) => {
  const [candlesBlown, setCandlesBlown] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const candleCount = Math.min(Math.max(config.candlesCount || 5, 3), 7); // Render 3 to 7 stylish glowing candles

  const blowOutCandles = () => {
    if (candlesBlown) return;
    setCandlesBlown(true);
    stopMic();
    audioEngine.playCandleBlow();
    fireHeartBurst();
  };

  const relightCandles = () => {
    setCandlesBlown(false);
  };

  // Microphone blow detection
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setIsListeningMic(true);
      setMicPermissionDenied(false);

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let blowFrames = 0;
      const checkAudio = () => {
        if (!streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume in low frequencies (blowing produces low rumble)
        let sum = 0;
        for (let i = 0; i < 20; i++) {
          sum += dataArray[i];
        }
        const avgLow = sum / 20;

        if (avgLow > 65) {
          blowFrames++;
          if (blowFrames > 3) {
            blowOutCandles();
            return;
          }
        } else {
          blowFrames = Math.max(0, blowFrames - 1);
        }

        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch {
      setIsListeningMic(false);
      setMicPermissionDenied(true);
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsListeningMic(false);
  };

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, []);

  return (
    <section className="py-20 px-4 max-w-3xl mx-auto relative z-10 text-center select-none">
      {/* Header */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Cake className="w-3.5 h-3.5" />
          <span>Make a Birthday Wish</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 font-elegant">
          Blow Out Your Candles
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          {config.wishPrompt || 'Close your eyes, make your biggest wish for the year ahead, and blow out the candles!'}
        </p>
      </div>

      {/* 3D Styled Cake Graphic */}
      <div className="relative max-w-sm mx-auto my-8 flex flex-col items-center">
        {/* Ambient Cake Glow */}
        <div className="absolute -inset-6 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Glowing Candles Row */}
        <div className="flex items-end justify-center gap-4 sm:gap-6 z-20 mb-[-12px]">
          {Array.from({ length: candleCount }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              {/* Animated Flame or Smoke */}
              {!candlesBlown ? (
                <motion.div
                  animate={{
                    scale: [1, 1.15, 0.95, 1],
                    y: [0, -2, 1, 0],
                    rotate: [0, -3, 3, 0]
                  }}
                  transition={{
                    duration: 0.8 + (i % 3) * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="relative w-4 h-6 mb-1"
                >
                  {/* Outer Flame Glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-orange-500 via-amber-300 to-yellow-100 shadow-lg shadow-amber-400/80 blur-[1px]" />
                  {/* Inner Blue Core */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-2 rounded-full bg-blue-300/80" />
                </motion.div>
              ) : (
                /* Smoke puff */
                <motion.div
                  initial={{ opacity: 0.8, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -25, scale: 1.6 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-3 h-6 mb-1 rounded-full bg-slate-400/40 blur-[2px]"
                />
              )}

              {/* Candle Stick */}
              <div 
                className="w-3 sm:w-3.5 h-12 rounded-t-md shadow-md border-t border-white/40"
                style={{
                  background: i % 2 === 0
                    ? 'repeating-linear-gradient(45deg, #f43f5e, #f43f5e 4px, #fff 4px, #fff 8px)'
                    : 'repeating-linear-gradient(-45deg, #fbbf24, #fbbf24 4px, #fff 4px, #fff 8px)'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Cake Tier (Frosting & Strawberries) */}
        <div className="w-56 sm:w-64 h-20 rounded-2xl bg-gradient-to-b from-pink-300 via-pink-400 to-pink-500 shadow-2xl relative z-10 border-t-2 border-white/60 flex items-center justify-around px-4">
          {/* Strawberry Toppings */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-xl -mt-16 transform hover:scale-125 transition-transform">
              🍓
            </div>
          ))}
          {/* Cream Drippings */}
          <div className="absolute -bottom-2 inset-x-0 flex justify-between px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-6 h-4 bg-pink-300 rounded-b-full shadow-sm" />
            ))}
          </div>
        </div>

        {/* Bottom Cake Tier */}
        <div className="w-72 sm:w-80 h-24 rounded-3xl bg-gradient-to-b from-amber-100 via-pink-100 to-rose-200 shadow-2xl relative border-t border-white/50 flex items-center justify-center -mt-2">
          {/* Decorative Frosting Swirls */}
          <div className="flex gap-2 text-rose-400 text-sm opacity-80">
            ✨ 🎂 Happy Birthday 🎂 ✨
          </div>
        </div>

        {/* Cake Stand Base */}
        <div className="w-80 sm:w-96 h-4 rounded-full bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 shadow-xl border border-amber-300/40 -mt-1 z-0" />
      </div>

      {/* Wish Result / Blow Action */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <AnimatePresence>
          {!candlesBlown ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <button
                onClick={blowOutCandles}
                className="px-8 py-3.5 rounded-full font-bold text-white text-base shadow-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <Wind className="w-5 h-5 animate-pulse" />
                <span>Blow Out Candles</span>
              </button>

              {/* Optional Microphone Trigger */}
              {navigator.mediaDevices && (
                <button
                  onClick={isListeningMic ? stopMic : startMic}
                  className={`px-5 py-3 rounded-full text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                    isListeningMic
                      ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                      : 'bg-white/10 hover:bg-white/15 border-white/20 text-slate-300'
                  }`}
                >
                  {isListeningMic ? <Mic className="w-4 h-4 text-red-400" /> : <MicOff className="w-4 h-4 text-slate-400" />}
                  <span>{isListeningMic ? 'Blow into your mic now!' : 'Blow with Microphone'}</span>
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl glass-panel-glow border border-pink-500/40 max-w-lg mx-auto shadow-2xl"
            >
              <div className="text-3xl mb-2">🎉 ✨ 💫</div>
              <h3 className="text-xl font-bold text-pink-200 font-elegant">
                Wish Made Successfully!
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {config.wishCompletedMessage || 'May all the joy, love, and dreams in your heart come true this year and always!'}
              </p>

              <button
                onClick={relightCandles}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Relight Candles</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {micPermissionDenied && (
          <p className="text-xs text-amber-400/80">
            Microphone access was not granted. You can use the button above to blow the candles!
          </p>
        )}
      </div>
    </section>
  );
};
