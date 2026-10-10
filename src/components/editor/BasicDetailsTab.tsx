import React from 'react';
import { BirthdayPageConfig } from '../../types';
import { User, Calendar, Type, FileText, HeartHandshake } from 'lucide-react';

interface BasicDetailsTabProps {
  config: BirthdayPageConfig;
  onChange: (updated: Partial<BirthdayPageConfig>) => void;
}

export const BasicDetailsTab: React.FC<BasicDetailsTabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Recipient Profile */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <User className="w-4 h-4" />
          <span>Birthday Person Information</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={config.recipientName}
              onChange={(e) => {
                const name = e.target.value;
                onChange({
                  recipientName: name,
                  pageTitle: `Happy Birthday, ${name}! ✨`,
                  heroHeadline: `HAPPY BIRTHDAY, ${name.toUpperCase()}!`
                });
              }}
              placeholder="e.g. Sophia"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nickname / Pet Name
            </label>
            <input
              type="text"
              value={config.nickname || ''}
              onChange={(e) => onChange({ nickname: e.target.value })}
              placeholder="e.g. Soph / Sunshine ☀️"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <span>Birth Date</span>
            </label>
            <input
              type="date"
              value={config.birthDate || ''}
              onChange={(e) => onChange({ birthDate: e.target.value })}
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Turning Age (Optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={120}
                value={config.targetAge || ''}
                onChange={(e) => onChange({ targetAge: Number(e.target.value) || undefined })}
                placeholder="e.g. 25"
                className="w-28 bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
              />
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(config.showAgeCountdown)}
                  onChange={(e) => onChange({ showAgeCountdown: e.target.checked })}
                  className="rounded text-pink-500 focus:ring-pink-500"
                />
                <span>Display Age Milestone Badge</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Greetings & Titles */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Type className="w-4 h-4" />
          <span>Page Headings & Greetings</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Page Title (Browser Tab)
          </label>
          <input
            type="text"
            value={config.pageTitle}
            onChange={(e) => onChange({ pageTitle: e.target.value })}
            placeholder="e.g. Happy 25th Birthday, Sophia! ✨"
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Gift Landing Greeting Tag
            </label>
            <input
              type="text"
              value={config.landingGreeting}
              onChange={(e) => onChange({ landingGreeting: e.target.value })}
              placeholder="e.g. A Little Surprise Made Just for You"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hero Headline
            </label>
            <input
              type="text"
              value={config.heroHeadline}
              onChange={(e) => onChange({ heroHeadline: e.target.value })}
              placeholder="e.g. HAPPY 25TH BIRTHDAY, SOPHIA!"
              className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Hero Subtitle
          </label>
          <textarea
            rows={2}
            value={config.heroSubtitle}
            onChange={(e) => onChange({ heroSubtitle: e.target.value })}
            placeholder="e.g. Today the whole universe pauses to celebrate the most incredible person in our lives."
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* Personal Birthday Letter */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          <span>Personal Handwritten Letter</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Letter Section Heading
          </label>
          <input
            type="text"
            value={config.letterHeading}
            onChange={(e) => onChange({ letterHeading: e.target.value })}
            placeholder="e.g. A Letter from the Heart"
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Letter Message (Handwritten Font & Typewriter Reveal)
          </label>
          <textarea
            rows={6}
            value={config.letterContent}
            onChange={(e) => onChange({ letterContent: e.target.value })}
            placeholder="Write your heartfelt message here..."
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl p-3.5 text-sm text-slate-100 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
            <span>Closing Signature</span>
          </label>
          <input
            type="text"
            value={config.letterClosing}
            onChange={(e) => onChange({ letterClosing: e.target.value })}
            placeholder="e.g. Forever cheering for you with all my love, — Alex ❤️"
            className="w-full bg-slate-900/90 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
