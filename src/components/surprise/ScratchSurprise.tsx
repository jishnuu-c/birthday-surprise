import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Sparkles, Copy, Check, Eye } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { fireHeartBurst } from '../../lib/confetti';

interface ScratchSurpriseProps {
  config: BirthdayPageConfig;
}

export const ScratchSurprise: React.FC<ScratchSurpriseProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.offsetWidth || 340);
    const height = (canvas.height = canvas.offsetHeight || 180);

    // Fill with shimmering gold scratch-off pattern
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#d97706');
    gradient.addColorStop(0.3, '#fef08a');
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(0.7, '#fef08a');
    gradient.addColorStop(1, '#b45309');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw text overlay on scratch layer
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SCRATCH HERE WITH FINGER OR MOUSE ✨', width / 2, height / 2 - 8);
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('To reveal your secret surprise voucher', width / 2, height / 2 + 14);

    let lastCheckTime = 0;
    let throttleTimer: number | null = null;

    const checkClearedPercentage = () => {
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        let transparentPixels = 0;
        const totalPixels = imgData.data.length / 4;

        for (let i = 3; i < imgData.data.length; i += 16) {
          if (imgData.data[i] === 0) {
            transparentPixels++;
          }
        }

        if (transparentPixels / (totalPixels / 4) > 0.45 && !isRevealed) {
          setIsRevealed(true);
          fireHeartBurst();
        }
      } catch {
        // ignore cross-origin error
      }
    };

    const scheduleCheckCleared = (force = false) => {
      const now = performance.now();
      if (force || now - lastCheckTime > 180) {
        lastCheckTime = now;
        if (throttleTimer) {
          window.clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        checkClearedPercentage();
      } else if (!throttleTimer) {
        throttleTimer = window.setTimeout(() => {
          lastCheckTime = performance.now();
          throttleTimer = null;
          checkClearedPercentage();
        }, 180);
      }
    };

    const scratch = (x: number, y: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Throttled check to avoid synchronous GPU stall on mobile
      scheduleCheckCleared(false);
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      handlePointerMove(e);
    };

    const handlePointerUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        scheduleCheckCleared(true);
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      scratch(x, y);
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      if (throttleTimer) window.clearTimeout(throttleTimer);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isRevealed]);

  const handleRevealInstantly = () => {
    setIsRevealed(true);
    fireHeartBurst();
  };

  const handleCopyCode = () => {
    if (config.scratchGiftCode) {
      navigator.clipboard.writeText(config.scratchGiftCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <section className="py-20 px-4 max-w-2xl mx-auto relative z-10 text-center select-none">
      {/* Header */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
          <Ticket className="w-3.5 h-3.5" />
          <span>Mystery Surprise</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 font-elegant">
          {config.scratchTitle || 'Secret Mystery Voucher'}
        </h2>
        <p className="mt-3 text-slate-400 text-sm sm:text-base">
          {config.scratchInstruction || 'Scratch or tap the golden card to reveal what is hidden inside!'}
        </p>
      </div>

      {/* Scratch Container Card */}
      <div className="relative max-w-md mx-auto aspect-[1.8/1] rounded-2xl overflow-hidden glass-panel-glow border-2 border-amber-400/40 shadow-2xl p-6 flex flex-col items-center justify-center">
        {/* Hidden Content Beneath */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-slate-900 to-pink-950 p-6 flex flex-col items-center justify-center text-center">
          <Sparkles className="w-6 h-6 text-amber-300 animate-spin mb-1" style={{ animationDuration: '4s' }} />
          <p className="text-sm sm:text-base font-bold text-amber-200 leading-snug px-4">
            {config.scratchSecretMessage || 'A Special Dinner & Celebration on Us!'}
          </p>

          {config.scratchGiftCode && (
            <div className="mt-3 inline-flex items-center gap-2 bg-black/50 border border-amber-400/50 px-3.5 py-1 rounded-lg">
              <span className="text-xs font-mono font-bold text-amber-300">
                {config.scratchGiftCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Scratch Canvas Overlay */}
        {!isRevealed && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none"
          />
        )}
      </div>

      {/* Reveal Button for Accessibility */}
      {!isRevealed && (
        <button
          onClick={handleRevealInstantly}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Reveal Secret Instantly</span>
        </button>
      )}
    </section>
  );
};
