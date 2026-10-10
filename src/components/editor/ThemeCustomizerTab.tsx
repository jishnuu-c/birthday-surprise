import React from 'react';
import { BirthdayPageConfig, FontPairing, GiftBoxStyle, ThemePreset } from '../../types';
import { THEME_PRESETS, GIFT_BOX_STYLES } from '../../constants/presets';
import { Palette, Gift, Type, Sparkles, Volume2 } from 'lucide-react';

interface ThemeCustomizerTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
}

export const ThemeCustomizerTab: React.FC<ThemeCustomizerTabProps> = ({ config, onChange }) => {
  const currentTheme = config.theme;

  const handleSelectPreset = (presetKey: ThemePreset) => {
    const p = THEME_PRESETS[presetKey];
    onChange({
      theme: {
        ...currentTheme,
        preset: presetKey,
        primaryColor: p.primaryColor,
        accentColor: p.accentColor,
        giftBoxStyle: p.boxStyle
      }
    });
  };

  const updateTheme = (fields: Partial<typeof currentTheme>) => {
    onChange({
      theme: {
        ...currentTheme,
        ...fields
      }
    });
  };

  const fontOptions: { id: FontPairing; name: string; description: string; sample: string }[] = [
    {
      id: 'modern-sans',
      name: 'Modern Outfit & Sans',
      description: 'Clean, bold, high-tech & contemporary',
      sample: 'Aa Happy Birthday'
    },
    {
      id: 'elegant-serif',
      name: 'Playfair Display Serif',
      description: 'Sophisticated, romantic, editorial elegance',
      sample: 'Aa Happy Birthday'
    },
    {
      id: 'playful-script',
      name: 'Dancing Script & Whimsical',
      description: 'Playful, celebratory, flowing cursive curves',
      sample: 'Aa Happy Birthday'
    },
    {
      id: 'luxury-display',
      name: 'Cinzel Royal Luxury',
      description: 'Regal Roman styling for milestone celebrations',
      sample: 'Aa Happy Birthday'
    },
    {
      id: 'handwritten-warm',
      name: 'Caveat Handwritten Note',
      description: 'Intimate, warm, heartfelt personal handwriting',
      sample: 'Aa Happy Birthday'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Preset Visual Selector */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Palette className="w-4 h-4" />
          <span>Curated Theme Presets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((key) => {
            const p = THEME_PRESETS[key];
            const isSelected = currentTheme.preset === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPreset(key)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/15'
                    : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-100">{p.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-pink-300 font-semibold">
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-3">{p.description}</p>

                {/* Color Swatch Bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border border-white/30 shadow"
                    style={{ background: p.primaryColor }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-white/30 shadow"
                    style={{ background: p.accentColor }}
                  />
                  <div
                    className={`flex-1 h-3 rounded-full bg-gradient-to-r ${p.bgGradient} border border-white/20`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Gift Box Wrapping Style */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Gift className="w-4 h-4" />
          <span>3D Gift Box Appearance & Wrapping</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(GIFT_BOX_STYLES) as GiftBoxStyle[]).map((styleKey) => {
            const b = GIFT_BOX_STYLES[styleKey];
            const isSelected = currentTheme.giftBoxStyle === styleKey;

            return (
              <button
                key={styleKey}
                type="button"
                onClick={() => updateTheme({ giftBoxStyle: styleKey })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-pink-500 bg-pink-500/20 shadow-md'
                    : 'border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-300'
                }`}
              >
                <div
                  className="w-full h-12 rounded-lg mb-2 shadow-inner border border-white/20 flex items-center justify-center relative overflow-hidden"
                  style={{ background: b.boxColor }}
                >
                  <div
                    className="w-3 h-full absolute"
                    style={{ background: b.ribbonColor }}
                  />
                  <div
                    className="w-full h-3 absolute"
                    style={{ background: b.ribbonColor }}
                  />
                  <div
                    className="w-4 h-4 rounded-full relative z-10 shadow"
                    style={{ background: b.bowColor }}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-100">{b.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Typography & Fonts */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Type className="w-4 h-4" />
          <span>Typography & Font Style</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fontOptions.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => updateTheme({ fontPairing: font.id })}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                currentTheme.fontPairing === font.id
                  ? 'border-pink-500 bg-pink-500/15 shadow-md'
                  : 'border-white/10 bg-slate-900/60 hover:bg-white/5'
              }`}
            >
              <div className="font-bold text-sm text-slate-100">{font.name}</div>
              <div className="text-xs text-slate-400 mb-2">{font.description}</div>
              <div className="text-base text-pink-300 italic opacity-90">{font.sample}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Particles & Atmosphere */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Floating Particle Atmosphere & Sound Effects</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Floating Particle Type
            </label>
            <select
              value={currentTheme.particleType}
              onChange={(e) => updateTheme({ particleType: e.target.value as any })}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            >
              <option value="hearts">💖 Floating Hearts</option>
              <option value="stars">⭐ Twinkling Stars</option>
              <option value="sparkles">✨ Golden Sparkles</option>
              <option value="confetti">🎊 Gentle Confetti</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Particle Density
            </label>
            <select
              value={currentTheme.particleDensity}
              onChange={(e) => updateTheme({ particleDensity: e.target.value as any })}
              className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
            >
              <option value="low">Subtle (Low - for maximum mobile battery)</option>
              <option value="medium">Balanced (Medium)</option>
              <option value="high">Magical Shower (High)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-semibold text-slate-200">
              Enable Interactive Sound Effects (Chimes, Candle Blow, Gift Pops)
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentTheme.enableSoundEffects}
              onChange={(e) => updateTheme({ enableSoundEffects: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
          </label>
        </div>
      </div>
    </div>
  );
};
