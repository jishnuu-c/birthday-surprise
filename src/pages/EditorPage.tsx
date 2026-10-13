import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getPageById, resolvePageAsync, savePage, savePageLocally, createNewBirthdayPage, areConfigsEqual } from '../lib/storage';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
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
  const isSavingRef = useRef<boolean>(false);
  const queuedSaveRef = useRef<boolean>(false);
  const lastSavedConfigRef = useRef<BirthdayPageConfig>(config);
  const latestConfigRef = useRef<BirthdayPageConfig>(config);
  const userRef = useRef(user);
  userRef.current = user;

  // Load configuration by ID with full async media resolution
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      // 1. If visiting /editor with no ID, immediately initialize a new unique birthday page
      if (!id) {
        const created = createNewBirthdayPage('Best Friend');
        if (userRef.current) created.userId = userRef.current.id;
        if (isMounted) {
          setConfig(created);
          lastSavedConfigRef.current = created;
          latestConfigRef.current = created;
          setIsLoading(false);
          navigate(`/editor/${created.id}`, { replace: true });
        }
        return;
      }

      // 2. If visiting /editor with the default demo ID, fork it into a unique page so the demo is never overwritten
      if (id === DEFAULT_DEMO_CONFIG.id) {
        const forked: BirthdayPageConfig = {
          ...DEFAULT_DEMO_CONFIG,
          id: `bday-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          slug: `celebration-${Math.floor(1000 + Math.random() * 9000)}`,
          isPublished: false,
          userId: userRef.current?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        savePageLocally(forked);
        if (isMounted) {
          setConfig(forked);
          lastSavedConfigRef.current = forked;
          latestConfigRef.current = forked;
          setIsLoading(false);
          navigate(`/editor/${forked.id}`, { replace: true });
        }
        return;
      }

      setIsLoading(true);

      // Fast sync local load
      const initial = getPageById(id);
      if (initial && isMounted) {
        setConfig(initial);
        lastSavedConfigRef.current = initial;
        latestConfigRef.current = initial;
      }

      // Full async resolution (creator studio allows local fallback for editing drafts)
      const resolved = await resolvePageAsync(id, { allowLocalFallback: true });
      if (isMounted) {
        if (resolved) {
          setConfig(resolved);
          lastSavedConfigRef.current = resolved;
          latestConfigRef.current = resolved;
        } else if (!initial) {
          const created = createNewBirthdayPage('Best Friend');
          if (userRef.current) created.userId = userRef.current.id;
          savePageLocally(created);
          setConfig(created);
          lastSavedConfigRef.current = created;
          latestConfigRef.current = created;
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

  // Unified save action with verified feedback, dirty-checking, and queueing
  const executeSavePipeline = useCallback(async (customConfig?: BirthdayPageConfig) => {
    if (customConfig) {
      latestConfigRef.current = customConfig;
    }

    // Requirement 2 & 4: Prevent duplicate and overlapping save requests
    // If a save is already in progress, queue the latest changes to be saved once the active save completes
    if (isSavingRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    const target = latestConfigRef.current;

    // Requirement 3 & 6: Save only when data has actually changed from the last successfully saved version
    if (lastSavedConfigRef.current && areConfigsEqual(target, lastSavedConfigRef.current)) {
      setHasUnsavedChanges(false);
      return;
    }

    isSavingRef.current = true;
    queuedSaveRef.current = false;
    setSaveStatus('saving');
    setSaveMessage(null);

    let saveSucceeded = false;

    try {
      const configToSave = {
        ...target,
        updatedAt: new Date().toISOString()
      };
      const currentUser = userRef.current;
      if (currentUser && !configToSave.userId) {
        configToSave.userId = currentUser.id;
      }

      const res = await savePage(configToSave);
      if (res.success) {
        saveSucceeded = true;
        const savedConfig = res.config || configToSave;
        lastSavedConfigRef.current = savedConfig;
        latestConfigRef.current = {
          ...latestConfigRef.current,
          id: savedConfig.id,
          slug: savedConfig.slug,
          userId: savedConfig.userId,
          updatedAt: savedConfig.updatedAt
        };
        setConfig((prev) => ({
          ...prev,
          id: savedConfig.id,
          slug: savedConfig.slug,
          userId: savedConfig.userId,
          updatedAt: savedConfig.updatedAt
        }));

        // If the ID was updated (e.g. forked from another user's page to avoid RLS violation), update URL
        if (savedConfig.id !== id) {
          navigate(`/editor/${savedConfig.id}`, { replace: true });
        }

        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setSaveMessage('All changes saved successfully!');
        setTimeout(() => {
          setSaveStatus((s) => s === 'saved' ? 'idle' : s);
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
    } finally {
      isSavingRef.current = false;
      // Requirement 2 & 4: Only process queued save if new changes were made while in-flight
      // Never loop-retry infinitely on error to avoid 429 rate limits
      if (queuedSaveRef.current && saveSucceeded) {
        queuedSaveRef.current = false;
        if (latestConfigRef.current && !areConfigsEqual(latestConfigRef.current, lastSavedConfigRef.current)) {
          window.setTimeout(() => {
            executeSavePipeline();
          }, 300);
        }
      } else {
        queuedSaveRef.current = false;
      }
    }
  }, [id, navigate]);

  const handleExplicitSave = useCallback((customConfig?: BirthdayPageConfig) => {
    // Prevent duplicate requests from repeated button clicks while save is in flight
    if (isSavingRef.current) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    executeSavePipeline(customConfig);
  }, [executeSavePipeline]);

  // Handle configuration updates from child components:
  // - Requirement 1: 1.5-second debounce after the user stops editing
  // - Requirement 2: Do not send a save request for every keystroke
  // - Requirement 3: Save only when data has actually changed
  // - Requirement 5: Applies to text, recipient name, messages, theme settings, and sections
  const handleUpdateConfig = useCallback((updated: Partial<BirthdayPageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      latestConfigRef.current = merged;

      // Check if actual content changed from last saved version
      const hasActualChanges = !areConfigsEqual(merged, lastSavedConfigRef.current);
      setHasUnsavedChanges(hasActualChanges);

      // Instant local persistence (0 network calls, guarantees local state safety)
      savePageLocally(merged);

      // Reset debounce timer on every keystroke/edit
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // If data matches saved version, no cloud request needed
      if (!hasActualChanges) {
        return merged;
      }

      // Requirement 1: 1.5-second (1500ms) debounce after user stops editing before saving changes
      autoSaveTimerRef.current = window.setTimeout(() => {
        executeSavePipeline();
      }, 1500);

      return merged;
    });
  }, [executeSavePipeline]);

  // Requirement 9: Safe flush strategy so latest edits are not lost when navigating away
  useEffect(() => {
    // 1. Browser tab close or refresh
    const handleBeforeUnload = () => {
      if (latestConfigRef.current) {
        savePageLocally(latestConfigRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 2. React SPA unmount (navigating to dashboard, preview, or another route)
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (latestConfigRef.current) {
        savePageLocally(latestConfigRef.current);
        // Flush cloud save if unsaved changes remain and not currently in-flight
        if (
          lastSavedConfigRef.current &&
          !areConfigsEqual(latestConfigRef.current, lastSavedConfigRef.current) &&
          !isSavingRef.current
        ) {
          savePage(latestConfigRef.current).catch(() => {});
        }
      }
    };
  }, []);

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

            {/* Save Status Badge (Requirement 7: subtle Saving..., Saved, or Save failed status) */}
            <div className="flex items-center gap-1.5 text-xs shrink-0 font-medium" aria-live="polite">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-rose-400" title={saveMessage || 'Save failed'}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Save failed</span>
                </span>
              )}
              {saveStatus === 'idle' && (
                hasUnsavedChanges ? (
                  <span className="text-amber-300/90 text-[11px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>Unsaved changes</span>
                  </span>
                ) : (
                  <span className="text-emerald-400/80 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>All changes saved</span>
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

