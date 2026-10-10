import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getPageById, resolvePageAsync, savePage, createNewBirthdayPage } from '../lib/storage';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { Navbar } from '../components/common/Navbar';
import { BasicDetailsTab } from '../components/editor/BasicDetailsTab';
import { MediaManagerTab } from '../components/editor/MediaManagerTab';
import { ThemeCustomizerTab } from '../components/editor/ThemeCustomizerTab';
import { SectionManagerTab } from '../components/editor/SectionManagerTab';
import { PublishShareTab } from '../components/editor/PublishShareTab';
import { LivePreviewFrame } from '../components/editor/LivePreviewFrame';
import { ShareModal } from '../components/surprise/ShareModal';
import { 
  User, Image, Palette, Layers, Globe, Eye, Edit3, Save, 
  Sparkles, Check, ExternalLink, AlertCircle, RefreshCw, CheckCircle2 
} from 'lucide-react';

type TabKey = 'details' | 'media' | 'theme' | 'sections' | 'publish';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<BirthdayPageConfig>(DEFAULT_DEMO_CONFIG);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // View mode state: on mobile default to 'editor-only', desktop default to 'split'
  const [viewMode, setViewMode] = useState<'split' | 'editor-only' | 'preview-only'>('split');
  const autoSaveTimerRef = useRef<number | null>(null);

  // Load configuration by ID with full async media resolution
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      if (!id) return;
      setIsLoading(true);

      // Fast sync local load
      const initial = getPageById(id);
      if (initial && isMounted) {
        setConfig(initial);
      }

      // Full async resolution (resolves IndexedDB media blobs & Supabase remote)
      const resolved = await resolvePageAsync(id);
      if (isMounted) {
        if (resolved) {
          setConfig(resolved);
        } else if (!initial) {
          const created = createNewBirthdayPage('Best Friend');
          setConfig(created);
          navigate(`/editor/${created.id}`, { replace: true });
        }
        setIsLoading(false);
      }
    }

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Unified save action with verified feedback
  const handleExplicitSave = useCallback(async (customConfig?: BirthdayPageConfig) => {
    const target = customConfig || config;
    setSaveStatus('saving');
    setSaveMessage(null);

    try {
      const res = await savePage(target);
      if (res.success) {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setSaveMessage(res.error ? `Saved locally (${res.error})` : 'All changes saved successfully!');
        setTimeout(() => {
          setSaveStatus('idle');
          setSaveMessage(null);
        }, 3000);
      } else {
        setSaveStatus('error');
        setSaveMessage(res.error || 'Failed to save changes. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Save error:', err);
      setSaveStatus('error');
      const msg = err instanceof Error ? err.message : 'Unknown error during save';
      setSaveMessage(msg);
    }
  }, [config]);

  // Handle configuration updates from child components
  const handleUpdateConfig = useCallback((updated: Partial<BirthdayPageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      setHasUnsavedChanges(true);

      // Debounced background autosave
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = window.setTimeout(() => {
        handleExplicitSave(merged);
      }, 1200);

      return merged;
    });
  }, [handleExplicitSave]);

  const tabs: { key: TabKey; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Basic Details', shortLabel: 'Details', icon: <User className="w-4 h-4 shrink-0" /> },
    { key: 'media', label: 'Media & Audio', shortLabel: 'Media', icon: <Image className="w-4 h-4 shrink-0" /> },
    { key: 'theme', label: 'Themes & Styles', shortLabel: 'Themes', icon: <Palette className="w-4 h-4 shrink-0" /> },
    { key: 'sections', label: 'Section Manager', shortLabel: 'Sections', icon: <Layers className="w-4 h-4 shrink-0" /> },
    { key: 'publish', label: 'Publish & Share', shortLabel: 'Publish', icon: <Globe className="w-4 h-4 shrink-0" /> }
  ];

  const publicUrl = `${window.location.origin}/b/${config.slug || config.id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        config={config}
        isEditor={true}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Editor Sub-Header Toolbar */}
      <div className="bg-slate-900/95 border-b border-white/10 px-3 sm:px-6 py-2.5 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Recipient Name & Save Status */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#E8C982] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                Editing: <span className="text-[#E8C982]">{config.recipientName || 'Friend'}</span>
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">|</span>

            {/* Save Status Badge */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs shrink-0">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="hidden xs:inline">Saving...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Error Saving</span>
                </span>
              )}
              {saveStatus === 'idle' && (
                hasUnsavedChanges ? (
                  <span className="text-amber-300/90 text-[11px] font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="hidden xs:inline">Unsaved changes</span>
                  </span>
                ) : (
                  <span className="text-emerald-400/80 text-[11px] font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span className="hidden xs:inline">All changes saved</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right: Primary Save Button & Responsive View Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Explicit Save Changes Button */}
            <button
              onClick={() => handleExplicitSave()}
              disabled={saveStatus === 'saving'}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white ring-2 ring-pink-500/40 shadow-pink-500/20 active:scale-95'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
              title="Save all changes permanently"
            >
              {saveStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
              </span>
            </button>

            {/* Mobile View Switcher (Visible on screens < 1024px) */}
            <div className="flex lg:hidden items-center bg-slate-950 p-0.5 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('editor-only')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode !== 'preview-only' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setViewMode('preview-only')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'preview-only' ? 'bg-pink-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Desktop View Mode Toggle (Visible on screens >= 1024px) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'split' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split Studio
              </button>
              <button
                onClick={() => setViewMode('editor-only')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'editor-only' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Editor Only
              </button>
              <button
                onClick={() => setViewMode('preview-only')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'preview-only' ? 'bg-pink-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Preview
              </button>
            </div>

            {/* Quick Open Live Page */}
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open full page in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Live Link</span>
            </a>
          </div>
        </div>

        {/* Global Save Feedback Toast / Alert Banner */}
        {saveMessage && (
          <div className="max-w-7xl mx-auto mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              saveStatus === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                {saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{saveMessage}</span>
              </div>
              <button
                onClick={() => setSaveMessage(null)}
                className="text-xs opacity-70 hover:opacity-100 px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form Editor */}
          {viewMode !== 'preview-only' && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'} space-y-5 w-full min-w-0`}>
              {/* Horizontally Scrollable Tab Navigation Strip */}
              <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar scroll-smooth">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none touch-target ${
                      activeTab === tab.key
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 font-bold scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span className="whitespace-nowrap sm:inline hidden">{tab.label}</span>
                    <span className="whitespace-nowrap sm:hidden inline">{tab.shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Panel */}
              <div className="animate-in fade-in duration-200">
                {activeTab === 'details' && (
                  <BasicDetailsTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'media' && (
                  <MediaManagerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'theme' && (
                  <ThemeCustomizerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'sections' && (
                  <SectionManagerTab config={config} onChange={handleUpdateConfig} onSave={() => handleExplicitSave()} saveStatus={saveStatus} />
                )}
                {activeTab === 'publish' && (
                  <PublishShareTab config={config} onUpdateConfig={handleUpdateConfig} />
                )}
              </div>
            </div>
          )}

          {/* Right Column: Interactive Live Device Preview */}
          {(viewMode === 'preview-only' || (viewMode === 'split' && window.innerWidth >= 1024)) && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5 lg:sticky lg:top-32' : 'col-span-12'} w-full`}>
              <LivePreviewFrame config={config} />
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        config={config}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicUrl={publicUrl}
      />
    </div>
  );
};

