import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, ShieldCheck, Check, AlertCircle, Heart, Lock, 
  KeyRound, ArrowLeft, ExternalLink, HelpCircle
} from 'lucide-react';
import { BirthdayPageConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface PaymentUnlockModalProps {
  initialRecipientName?: string;
  surpriseId: string;
  slug?: string;
  initialConfig?: BirthdayPageConfig;
  isOpen: boolean;
  onSuccess: (result: { surpriseId: string; editToken: string; editUrl: string }) => void;
  onAdminFreeUnlock?: () => void;
  onUnlockWithToken?: (token: string) => void;
  onClose?: () => void;
}

export const PaymentUnlockModal: React.FC<PaymentUnlockModalProps> = ({
  initialRecipientName = '',
  surpriseId,
  isOpen,
  onAdminFreeUnlock,
  onUnlockWithToken,
  onClose
}) => {
  const { isAdmin } = useAuth();
  const [recipientName, setRecipientName] = useState(initialRecipientName || 'My Best Friend');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');

  if (!isOpen) return null;

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    if (onUnlockWithToken) {
      onUnlockWithToken(manualToken.trim());
    } else {
      window.location.href = `/editor/${surpriseId}?token=${encodeURIComponent(manualToken.trim())}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-[#160D1F] border border-pink-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto text-slate-100">
        
        {/* Top Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#E8C982]" />
            <span>Interactive Birthday Surprise</span>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E8C982] via-pink-400 to-rose-400">
              ₹40
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-medium">One-time payment</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Unlock Birthday Creator Studio
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Create an unforgettable, interactive 3D birthday experience for your loved one.
          </p>
        </div>

        {/* Mandatory Pricing & Free Edit Guarantee Rule */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#E8C982] shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-amber-300 text-[13px]">
              ₹40 per birthday surprise. Once purchased, you can edit that surprise again without paying.
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Each new birthday surprise requires a separate ₹40 payment, but comes with permanent hosting and private editing access.
            </p>
          </div>
        </div>

        {/* Temporary Payment Unavailability Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-300 text-xs">
              Payments are temporarily unavailable. Please try again later.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Our direct online payment gateway is currently undergoing integration. Paid checkout is temporarily paused and no charges will be debited.
            </p>
          </div>
        </div>

        {/* Recipient Name Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>Who is this birthday surprise for?</span>
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="e.g. Sophia, Mom, Bestie, Alex"
            className="w-full bg-slate-950 border border-white/20 focus:border-pink-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors"
          />
        </div>

        {/* Included Features List */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs text-slate-200">
          <div className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>3D Interactive Gift Box:</strong> Animated opening sequence with confetti explosion</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Virtual Cake & Candle Blow:</strong> Blow out candle with wishes & custom message</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Memories & Audio:</strong> Photo gallery, timeline, background music & video player</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Mystery Scratch Card:</strong> Reveal hidden voucher, gift, or surprise note</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Private Secret Edit Link:</strong> Return and edit anytime without paying again</span>
          </div>
        </div>

        {/* Primary Checkout Button (Explicitly Disabled per Requirement 1) */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={true}
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm text-slate-400 bg-white/5 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2 opacity-70 transition-all select-none"
            title="Payments are temporarily unavailable. Please try again later."
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Pay ₹40 & Unlock Creator Studio (Temporarily Disabled)</span>
          </button>

          {/* Admin Free Unlock Option */}
          {isAdmin && onAdminFreeUnlock ? (
            <button
              onClick={onAdminFreeUnlock}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin: Unlock Complimentary (Free Access)</span>
            </button>
          ) : (
            <div className="text-center pt-1">
              <Link
                to="/admin"
                className="text-[11px] text-amber-300/80 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Website Administrator? Log in at Administrator Portal</span>
              </Link>
            </div>
          )}
        </div>

        {/* Existing Secret Token Option */}
        <div className="pt-2 border-t border-white/10 text-center">
          {!showTokenInput ? (
            <button
              type="button"
              onClick={() => setShowTokenInput(true)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-pink-400" />
              <span>Already have a Secret Edit Token? Enter Token</span>
            </button>
          ) : (
            <form onSubmit={handleManualTokenSubmit} className="space-y-2 pt-1 text-left">
              <label className="block text-[11px] font-semibold text-slate-300">
                Enter your Secret Edit Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="bday_edit_..."
                  className="flex-1 bg-slate-950 border border-white/20 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Navigation & Back Action */}
        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
          <Link
            to="/"
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Website</span>
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
