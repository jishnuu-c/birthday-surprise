import React, { useEffect, useRef } from 'react';
import { ThemeSettings } from '../../types';
import { THEME_PRESETS } from '../../constants/presets';

interface ThemeBackgroundProps {
  theme: ThemeSettings;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPreset = THEME_PRESETS[theme.preset] || THEME_PRESETS['luxury-plum-gold'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isPaused = false;
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Use reasonable canvas resolution to avoid high retina GPU fill-rate choke on mobile
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    let width = (canvas.width = Math.floor(window.innerWidth * dpr));
    let height = (canvas.height = Math.floor(window.innerHeight * dpr));

    const handleResize = () => {
      if (!canvas) return;
      const currentMobile = window.innerWidth < 768;
      const currentDpr = Math.min(window.devicePixelRatio || 1, currentMobile ? 1.5 : 2);
      width = canvas.width = Math.floor(window.innerWidth * currentDpr);
      height = canvas.height = Math.floor(window.innerHeight * currentDpr);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
      } else {
        isPaused = false;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Particle system - lighter density on mobile for 60 FPS smoothness
    const densityMap = { low: 18, medium: 36, high: 60 };
    const maxMobileParticles = prefersReducedMotion ? 8 : 18;
    const targetCount = densityMap[theme.particleDensity] || 36;
    const count = isMobile ? Math.min(targetCount, maxMobileParticles) : (prefersReducedMotion ? 12 : targetCount);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      fadeSpeed: number;
      rotation: number;
      rotationSpeed: number;
      color: string;
      type: 'heart' | 'star' | 'sparkle' | 'bokeh';
    }

    const paletteColors = [
      theme.primaryColor || currentPreset.primaryColor,
      theme.accentColor || currentPreset.accentColor,
      '#E8C982', // Champagne Gold
      '#FFF8F0', // Warm Ivory
      '#F7DCE5', // Soft Blush
      '#C72C55'  // Ruby Rose
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const isBokeh = i % 5 === 0;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: (isBokeh ? Math.random() * 12 + 8 : Math.random() * 5 + 2.5) * dpr,
        speedX: (Math.random() - 0.5) * (prefersReducedMotion ? 0.08 : 0.35) * dpr,
        speedY: -(Math.random() * (prefersReducedMotion ? 0.15 : 0.45) + 0.12) * dpr, // Float upwards gently
        opacity: isBokeh ? Math.random() * 0.22 + 0.06 : Math.random() * 0.6 + 0.2,
        fadeSpeed: (Math.random() - 0.5) * 0.005,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * (prefersReducedMotion ? 0.003 : 0.012),
        color: paletteColors[Math.floor(Math.random() * paletteColors.length)],
        type: isBokeh ? 'bokeh' : theme.particleType === 'hearts' ? 'heart' : theme.particleType === 'stars' ? 'star' : 'sparkle'
      });
    }

    // Drawing shapes
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + size, x, y + size);
      ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.closePath();
      ctx.fill();
    };

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes = 5, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Glow cross rays
      ctx.fillRect(x - size * 1.2, y - 0.6 * dpr, size * 2.4, 1.2 * dpr);
      ctx.fillRect(x - 0.6 * dpr, y - size * 1.2, 1.2 * dpr, size * 2.4);
    };

    const drawBokeh = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      if (isPaused) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        p.opacity += p.fadeSpeed;

        if (p.opacity > 0.85 || p.opacity < 0.12) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Wrap around edges
        if (p.y < -30 * dpr) {
          p.y = height + 30 * dpr;
          p.x = Math.random() * width;
        }
        if (p.x < -30 * dpr) p.x = width + 30 * dpr;
        if (p.x > width + 30 * dpr) p.x = -30 * dpr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));

        if (p.type === 'heart') {
          drawHeart(ctx, -p.size / 2, -p.size / 2, p.size);
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
        } else if (p.type === 'bokeh') {
          drawBokeh(ctx, 0, 0, p.size);
        } else {
          drawSparkle(ctx, 0, 0, p.size);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* Dynamic Background Ambient Gradient */}
      <div 
        className={`absolute inset-0 bg-gradient-to-b ${currentPreset.bgGradient} transition-colors duration-1000`} 
      />

      {/* Radial Soft Light Orbs - Optimized with responsive sizing & blur for mobile GPU efficiency */}
      <div 
        className="absolute -top-40 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full blur-2xl sm:blur-[140px] opacity-25 animate-pulse-glow will-change-transform"
        style={{ background: `radial-gradient(circle, ${theme.primaryColor || currentPreset.primaryColor} 0%, transparent 70%)` }}
      />
      <div 
        className="absolute top-1/2 -right-20 w-[260px] sm:w-[500px] h-[260px] sm:h-[500px] rounded-full blur-2xl sm:blur-[160px] opacity-20 animate-pulse-glow will-change-transform"
        style={{ 
          background: `radial-gradient(circle, ${theme.accentColor || currentPreset.accentColor} 0%, transparent 70%)`,
          animationDelay: '1.5s' 
        }}
      />
      <div 
        className="absolute -bottom-20 left-1/3 w-[340px] sm:w-[700px] h-[340px] sm:h-[700px] rounded-full blur-2xl sm:blur-[180px] opacity-20 will-change-transform"
        style={{ background: `radial-gradient(circle, ${theme.primaryColor || currentPreset.primaryColor} 0%, transparent 70%)` }}
      />

      {/* Floating Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

