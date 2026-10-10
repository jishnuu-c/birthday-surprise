import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BirthdayPageConfig } from '../../types';
import { saveAndPublishPage, generateShareableDataUrl } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Globe, Share2, Copy, Check, QrCode, Download, MessageCircle, CloudCheck, HardDrive, FileDown, FileUp, Sparkles, ExternalLink } from 'lucide-react';

interface PublishShareTabProps {
  config: BirthdayPageConfig;
  onUpdateConfig: (updated: Partial<BirthdayPageConfig>) => void;
}

export const PublishShareTab: React.FC<PublishShareTabProps> = ({ config, onUpdateConfig }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(
    `${window.location.origin}/b/${config.slug || config.id}`
  );
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      const result = await saveAndPublishPage(config);
      onUpdateConfig({ isPublished: true });
      setPublishedUrl(result.url);
      if (result.error) {
        setStatusMessage(`⚠️ Page saved locally! Supabase Cloud notice: ${result.error}. Your page is ready and shareable.`);
      } else {
        setStatusMessage('🎉 Page published successfully! Ready to share with the recipient.');
      }
    } catch (err: unknown) {
      console.error('Publish error:', err);
      const msg = err instanceof Error ? err.message : 'Error publishing page. Please try again.';
      setStatusMessage(`Error publishing page: ${msg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyHashUrl = () => {
    const hashUrl = generateShareableDataUrl(config);
    navigator.clipboard.writeText(hashUrl);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handleWhatsApp = () => {
    const text = `🎂 A little birthday surprise created just for ${config.recipientName || 'you'}! Open your gift here: ${publishedUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `birthday-surprise-${config.slug || config.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.recipientName) {
          onUpdateConfig(parsed);
          alert('Configuration imported successfully!');
        }
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Publishing Status Card */}
      <div className="glass-panel-glow p-6 rounded-3xl border border-pink-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${config.isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <h3 className="text-lg font-bold text-white">
                {config.isPublished ? 'Published & Active' : 'Draft Mode (Not Published Yet)'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {config.isPublished
                ? 'Your surprise website is live! You can share the link below through WhatsApp, Instagram, or SMS.'
                : 'Customize your settings and click Publish when you are ready to share with the birthday person.'}
            </p>
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-6 py-3 rounded-full font-bold text-white text-sm shadow-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Globe className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing...' : config.isPublished ? 'Update Live Page' : 'Publish Surprise Page'}</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Public URL & Sharing Controls */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-pink-300 uppercase tracking-wider">
          <Share2 className="w-4 h-4" />
          <span>Public Shareable URL</span>
        </div>

        {/* URL Slug Customization */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Custom Link Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2.5 rounded-xl border border-white/10 select-none">
              {window.location.origin}/b/
            </span>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => onUpdateConfig({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
              placeholder="e.g. sophia-25th"
              className="flex-1 bg-slate-900 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none"
            />
          </div>
        </div>

        {/* Copy Primary URL */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/15">
          <input
            type="text"
            readOnly
            value={publishedUrl}
            className="flex-1 bg-transparent px-2 text-xs text-slate-200 outline-none select-all truncate font-mono"
          />
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title="Open live page in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Instant WhatsApp Share Button */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleWhatsApp}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share directly on WhatsApp</span>
          </button>

          <button
            onClick={handleCopyHashUrl}
            className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            title="Generates a zero-server portable URL containing full page data"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{copiedHash ? 'Copied Portable URL!' : 'Copy Serverless Portable Link'}</span>
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-6">
        <div className="p-4 bg-white rounded-2xl shadow-xl">
          <QRCodeSVG value={publishedUrl} size={150} level="H" includeMargin={true} />
        </div>

        <div className="space-y-3 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start text-sm font-bold text-slate-100">
            <QrCode className="w-4 h-4 text-pink-400" />
            <span>Printable & Scannable QR Code</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            You can print this QR code and paste it on physical birthday cards, cake boxes, or gift wrapping!
          </p>
        </div>
      </div>

      {/* Cloud & Backup Settings */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            {isSupabaseConfigured ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CloudCheck className="w-4 h-4" />
                <span>Supabase PostgreSQL Cloud Storage Connected</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <HardDrive className="w-4 h-4" />
                <span>Browser Local Persistence Active (Zero Setup Needed)</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleExportJson}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-pink-400" />
            <span>Export Configuration JSON</span>
          </button>

          <label className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer">
            <FileUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Configuration JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
