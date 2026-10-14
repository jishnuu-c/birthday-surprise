import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BirthdayPageConfig } from '../../types';
import { saveAndPublishPage, generateShareableDataUrl } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Globe, Share2, Copy, Check, QrCode, MessageCircle, CloudCheck, HardDrive, FileDown, FileUp, Sparkles, ExternalLink, Lock, AlertTriangle } from 'lucide-react';
import { getStoredEditToken } from '../../lib/paymentService';

interface PublishShareTabProps {
  config: BirthdayPageConfig;
  onUpdateConfig: (updated: Partial<BirthdayPageConfig>) => void;
  onPublishSuccess?: (publishedConfig: BirthdayPageConfig) => void;
}

export const PublishShareTab: React.FC<PublishShareTabProps> = ({ config, onUpdateConfig, onPublishSuccess }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(() => {
    return isSupabaseConfigured
      ? `${window.location.origin}/b/${config.slug || config.id}`
      : generateShareableDataUrl(config);
  });
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured) {
      setPublishedUrl(`${window.location.origin}/b/${config.slug || config.id}`);
    } else {
      setPublishedUrl(generateShareableDataUrl(config));
    }
  }, [config]);

  const getEffectiveToken = () => config.editToken || getStoredEditToken(config.id);

  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      const result = await saveAndPublishPage(config, getEffectiveToken());
      if (!result.success) {
        setStatusMessage(`❌ Error publishing page: ${result.error || 'Failed to save to cloud'}`);
        return;
      }
      if (result.config) {
        if (onPublishSuccess) {
          onPublishSuccess(result.config);
        } else {
          onUpdateConfig(result.config);
        }
      } else {
        onUpdateConfig({ isPublished: true });
      }
      setPublishedUrl(result.url);
      setStatusMessage('🎉 Surprise Page published successfully to cloud! Permanent link ready to share across all devices.');
    } catch (err: unknown) {
      console.error('Publish error:', err);
      const msg = err instanceof Error ? err.message : 'Error publishing page. Please try again.';
      setStatusMessage(`❌ Error publishing page: ${msg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!config.isPublished) {
      setIsPublishing(true);
      setStatusMessage(null);
      try {
        const result = await saveAndPublishPage(config, getEffectiveToken());
        if (!result.success) {
          setStatusMessage(`❌ Error publishing page before copying: ${result.error || 'Failed to save to cloud'}`);
          setIsPublishing(false);
          return;
        }
        if (result.config) {
          if (onPublishSuccess) onPublishSuccess(result.config);
          else onUpdateConfig(result.config);
        }
        setPublishedUrl(result.url);
        navigator.clipboard.writeText(result.url);
        setCopied(true);
        setStatusMessage('🎉 Surprise Page published and share link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error publishing page.';
        setStatusMessage(`❌ Error: ${msg}`);
      } finally {
        setIsPublishing(false);
      }
      return;
    }

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

  const handleWhatsApp = async () => {
    let urlToShare = publishedUrl;
    if (!config.isPublished) {
      setIsPublishing(true);
      setStatusMessage(null);
      try {
        const result = await saveAndPublishPage(config, getEffectiveToken());
        if (!result.success) {
          setStatusMessage(`❌ Error publishing page before sharing: ${result.error || 'Failed to save to cloud'}`);
          setIsPublishing(false);
          return;
        }
        if (result.config) {
          if (onPublishSuccess) onPublishSuccess(result.config);
          else onUpdateConfig(result.config);
        }
        urlToShare = result.url;
        setPublishedUrl(result.url);
        setStatusMessage('🎉 Surprise Page published successfully to cloud!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error publishing page.';
        setStatusMessage(`❌ Error: ${msg}`);
        setIsPublishing(false);
        return;
      } finally {
        setIsPublishing(false);
      }
    }

    const text = `🎂 A little birthday surprise created just for ${config.recipientName || 'you'}! Open your gift here: ${urlToShare}`;
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
          <div className={`p-3 rounded-xl border text-xs font-semibold ${
            statusMessage.startsWith('❌')
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2.5 rounded-xl border border-white/10 select-none truncate">
              {window.location.host}/b/
            </span>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => onUpdateConfig({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
              placeholder="e.g. sophia-25th"
              className="flex-1 bg-slate-900 border border-white/15 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none min-w-0"
            />
          </div>
        </div>

        {/* Public Sharing Controls — only active when published */}
        {config.isPublished ? (
          <>
            {/* Copy Primary URL */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/15">
              <input
                type="text"
                readOnly
                value={publishedUrl}
                className="flex-1 bg-transparent px-2 text-xs text-slate-200 outline-none select-all truncate font-mono py-1 sm:py-0"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy URL'}</span>
                </button>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center justify-center"
                  title="Open live page in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Instant WhatsApp Share Button */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={handleWhatsApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
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

            <p className="text-[11px] text-slate-400 mt-2">
              ✨ <strong>Public View Guarantee:</strong> This link is view-only for the birthday person and guests. It requires no login or payment and never reveals your secret editing credentials.
            </p>
          </>
        ) : (
          /* When NOT published: show clear draft warning and publish action */
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Share Link Not Activated Yet</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                This surprise page is currently an unpublished draft. Share links and QR codes are activated once published to the cloud so your recipient can open it anywhere.
              </p>
            </div>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-6 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg cursor-pointer inline-flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isPublishing ? 'Publishing...' : 'Publish Surprise Page Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* QR Code Section — only active once published */}
      {config.isPublished && (
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
              Print this QR code on a real physical greeting card or gift tag. When the birthday person scans it with their phone camera, their custom surprise page launches instantly!
            </p>
          </div>
        </div>
      )}

      {/* Secret Creator Edit Access Link Card (Requirement 3: recovery & retention) */}
      {(() => {
        const token = config.editToken || getStoredEditToken(config.id);
        const secretEditUrl = token
          ? `${window.location.origin}/editor/${config.id}?token=${token}`
          : `${window.location.origin}/editor/${config.id}`;

        const handleCopySecret = () => {
          navigator.clipboard.writeText(secretEditUrl);
          setCopiedToken(true);
          setTimeout(() => setCopiedToken(false), 2500);
        };

        return (
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-4 bg-gradient-to-br from-amber-500/5 via-transparent to-pink-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-300 uppercase tracking-wider">
                <Lock className="w-4 h-4 text-[#E8C982]" />
                <span>Secret Creator Edit Link (Keep Private)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                Creator Only
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This secret link contains your unique editing access token. Save or bookmark it so you can return and make changes to this surprise in the future without paying again!
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-2 rounded-xl border border-amber-500/30">
              <input
                type="text"
                readOnly
                value={secretEditUrl}
                className="flex-1 bg-transparent px-2 text-xs text-amber-200 outline-none select-all truncate font-mono py-1 sm:py-0"
              />
              <button
                onClick={handleCopySecret}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied Secret Link!' : 'Copy Secret Link'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Important Security Warning:</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Do NOT share this secret edit link with the birthday recipient or on social media. If you lose this link and clear your browser cache, you may lose editing access to this surprise.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

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
