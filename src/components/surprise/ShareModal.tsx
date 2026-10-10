import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, MessageCircle, Send, Share2, Sparkles, Smartphone } from 'lucide-react';
import { BirthdayPageConfig } from '../../types';

interface ShareModalProps {
  config: BirthdayPageConfig;
  isOpen: boolean;
  onClose: () => void;
  publicUrl: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  config,
  isOpen,
  onClose,
  publicUrl
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const recipient = config.recipientName || 'Someone Special';
  const shareText = `🎂 A little birthday surprise created with love for ${recipient}! Open your gift here: ${publicUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(`🎂 Birthday Surprise for ${recipient}!`)}`;
    window.open(url, '_blank');
  };

  const handleSMS = () => {
    const url = `sms:?body=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 sm:mb-6 pr-8 sm:pr-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Share Birthday Magic</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white font-elegant">
            Share {recipient}'s Surprise
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Send this magical link to {recipient}. It opens seamlessly on mobile worldwide without login!
          </p>
        </div>

        {/* QR Code Card */}
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-white text-slate-900 shadow-xl mb-5 sm:mb-6 mx-auto max-w-full">
          <QRCodeSVG
            value={publicUrl}
            size={160}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>",
              x: undefined,
              y: undefined,
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-pink-600" />
            Scan to Open on Phone
          </span>
        </div>

        {/* Copy URL Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 border border-white/15 rounded-xl p-2 mb-5 sm:mb-6">
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="bg-transparent flex-1 px-2 text-xs text-slate-200 outline-none select-all truncate py-1 sm:py-0 font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Instant Social Share Buttons */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] sm:text-xs font-semibold gap-1 transition-all cursor-pointer hover:scale-105"
          >
            <MessageCircle className="w-4 sm:w-5 h-4 sm:h-5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleTelegram}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-[11px] sm:text-xs font-semibold gap-1 transition-all cursor-pointer hover:scale-105"
          >
            <Send className="w-4 sm:w-5 h-4 sm:h-5" />
            <span>Telegram</span>
          </button>

          <button
            onClick={handleSMS}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[11px] sm:text-xs font-semibold gap-1 transition-all cursor-pointer hover:scale-105"
          >
            <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
            <span>SMS / Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
