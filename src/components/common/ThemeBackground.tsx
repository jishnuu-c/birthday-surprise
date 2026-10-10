import React, { useEffect, useRef } from 'react';
import { ThemeSettings } from '../../types';
import { THEME_PRESETS } from '../../constants/presets';

interface ThemeBackgroundProps {
  theme: ThemeSettings;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPreset = THEME_PRESETS[theme.preset] || THEME_PRESETS['romantic-rose'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle system
    const densityMap = { low: 25, medium: 50, high: 90 };
    const count = densityMap[theme.particleDensity] || 50;

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
      type: 'heart' | 'star' | 'sparkle' | 'circle';
    }

    const colors = [
      theme.primaryColor || currentPreset.primaryColor,
      theme.accentColor || currentPreset.accentColor,
      '#ffffff',
      '#fbbf24',
      '#f472b6'
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: -(Math.random() * 0.8 + 0.3), // Float upwards
        opacity: Math.random() * 0.7 + 0.2,
        fadeSpeed: (Math.random() - 0.5) * 0.008,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: theme.particleType === 'hearts' ? 'heart' : theme.particleType === 'stars' ? 'star' : 'sparkle'
      });
    }

    // Drawing shapes
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      // top left curve
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      // bottom left curve
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + size, x, y + size);
      // bottom right curve
      ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      // top right curve
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
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Glow rays
      ctx.fillRect(x - size, y - 0.8, size * 2, 1.6);
      ctx.fillRect(x - 0.8, y - size, 1.6, size * 2);
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        p.opacity += p.fadeSpeed;

        if (p.opacity > 0.85 || p.opacity < 0.15) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Wrap around edges
        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));

        if (p.type === 'heart') {
          drawHeart(ctx, -p.size / 2, -p.size / 2, p.size);
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.5);
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
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* Dynamic Background Ambient Gradient */}
      <div 
        className={`absolute inset-0 bg-gradient-to-b ${currentPreset.bgGradient} transition-colors duration-1000`} 
      />

      {/* Radial Soft Light Orbs */}
      <div 
        className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-30 animate-pulse-glow"
        style={{ background: `radial-gradient(circle, ${theme.primaryColor || currentPreset.primaryColor} 0%, transparent 70%)` }}
      />
      <div 
        className="absolute top-1/2 -right-20 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20 animate-pulse-glow"
        style={{ 
          background: `radial-gradient(circle, ${theme.accentColor || currentPreset.accentColor} 0%, transparent 70%)`,
          animationDelay: '1.5s' 
        }}
      />
      <div 
        className="absolute -bottom-20 left-1/3 w-[700px] h-[700px] rounded-full blur-[180px] opacity-25"
        style={{ background: `radial-gradient(circle, ${theme.primaryColor || currentPreset.primaryColor} 0%, transparent 70%)` }}
      />

      {/* Floating Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
