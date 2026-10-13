import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getPageById, resolvePageAsync, savePage, savePageLocally, createNewBirthdayPage, areConfigsEqual } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
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
  const isSavingRef = useRef<boolean>(false);
  const isCloudPersistedRef = useRef<boolean>(false);
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
          isCloudPersistedRef.current = false;
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
          isCloudPersistedRef.current = false;
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
          isCloudPersistedRef.current = isSupabaseConfigured && Boolean(resolved.id);
          setConfig(resolved);
          lastSavedConfigRef.current = resolved;
          latestConfigRef.current = resolved;
        } else if (!initial) {
          const created = createNewBirthdayPage('Best Friend');
          if (userRef.current) created.userId = userRef.current.id;
          savePageLocally(created);
          isCloudPersistedRef.current = false;
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

  // Explicit save action: persists data to Supabase ONLY on user manual action
  // Autosave is completely disabled. Duplicate requests from repeated clicks are blocked.
  const executeSavePipeline = useCallback(async (customConfig?: BirthdayPageConfig) => {
    if (customConfig) {
      latestConfigRef.current = customConfig;
    }

    // Requirement 4: Prevent duplicate requests when Save button is clicked multiple times
    if (isSavingRef.current) {
      return;
    }

    const target = latestConfigRef.current;

    // Check if data actually has unsaved changes compared to last saved snapshot
    // But NEVER skip if the page has not yet been persisted to the cloud database!
    if (isCloudPersistedRef.current && lastSavedConfigRef.current && areConfigsEqual(target, lastSavedConfigRef.current)) {
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setSaveMessage('Saved successfully!');
      setTimeout(() => {
        setSaveStatus((s) => s === 'saved' ? 'idle' : s);
        setSaveMessage(null);
      }, 2500);
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    setSaveMessage(null);

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
        isCloudPersistedRef.current = isSupabaseConfigured;
        const savedConfig = res.config || configToSave;
        lastSavedConfigRef.current = savedConfig;
        latestConfigRef.current = savedConfig;
        setConfig(savedConfig);

        // If page ID changed (e.g. forked from another user's page to avoid RLS violation), update URL
        if (savedConfig.id !== id) {
          navigate(`/editor/${savedConfig.id}`, { replace: true });
        }

        // Requirement 7: Show "Saved successfully" only after Supabase confirms the save
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setSaveMessage('Saved successfully!');
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
    }
  }, [id, navigate]);

  const handleExplicitSave = useCallback((customConfig?: BirthdayPageConfig) => {
    // Prevent duplicate requests from repeated button clicks while save is in flight
    if (isSavingRef.current) return;
    executeSavePipeline(customConfig);
  }, [executeSavePipeline]);

  // Handle configuration updates from child components:
  // - Requirement 1: Autosave completely disabled. Zero automatic network requests.
  // - Requirement 6: Keep unsaved changes in editor state and local storage until explicitly saved.
  // - Requirement 7: Marks hasUnsavedChanges = true to show the Unsaved changes indicator.
  const handleUpdateConfig = useCallback((updated: Partial<BirthdayPageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated };
      latestConfigRef.current = merged;

      // Track if content differs from last successfully saved snapshot
      const hasActualChanges = !areConfigsEqual(merged, lastSavedConfigRef.current);
      setHasUnsavedChanges(hasActualChanges);

      // Local storage persistence for crash safety without sending any Supabase network request
      savePageLocally(merged);

      return merged;
    });
  }, []);

  // Safe local backup on tab close or refresh (0 network requests)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (latestConfigRef.current) {
        savePageLocally(latestConfigRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

            {/* Save Status Badge (Requirement 7: clear Unsaved changes and Saved successfully indicators) */}
            <div className="flex items-center gap-1.5 text-xs shrink-0 font-medium" aria-live="polite">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400 animate-pulse font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Saving…</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold animate-in fade-in px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saved successfully</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30" title={saveMessage || 'Save failed'}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Save failed</span>
                </span>
              )}
              {saveStatus === 'idle' && (
                hasUnsavedChanges ? (
                  <span className="text-amber-300 font-semibold text-xs flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
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
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved successfully!' : 'Save Changes'}
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

            {/* Quick Open Live Page or Publish to Share */}
            {config.isPublished ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 sm:px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-pink-500/15 hover:bg-pink-500/25 border-pink-500/40 text-pink-300"
                title="Open live published page in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Live Link</span>
              </a>
            ) : (
              <button
                onClick={() => setActiveTab('publish')}
                className="px-3 sm:px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300"
                title="Draft Mode — Click to publish and generate your shareable birthday link"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Publish to Share</span>
              </button>
            )}
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
                  <PublishShareTab
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    onPublishSuccess={(publishedConfig) => {
                      isCloudPersistedRef.current = true;
                      lastSavedConfigRef.current = publishedConfig;
                      latestConfigRef.current = publishedConfig;
                      setConfig(publishedConfig);
                      setHasUnsavedChanges(false);
                      setSaveStatus('saved');
                      setSaveMessage('Surprise published successfully to cloud!');
                      setTimeout(() => {
                        setSaveStatus((s) => s === 'saved' ? 'idle' : s);
                        setSaveMessage(null);
                      }, 3000);
                      if (publishedConfig.id !== id) {
                        navigate(`/editor/${publishedConfig.id}`, { replace: true });
                      }
                    }}
                  />
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
        onPublishSuccess={(publishedConfig) => {
          isCloudPersistedRef.current = true;
          lastSavedConfigRef.current = publishedConfig;
          latestConfigRef.current = publishedConfig;
          setConfig(publishedConfig);
          setHasUnsavedChanges(false);
          setSaveStatus('saved');
          setSaveMessage('Surprise published successfully to cloud!');
          setTimeout(() => {
            setSaveStatus((s) => s === 'saved' ? 'idle' : s);
            setSaveMessage(null);
          }, 3000);
          if (publishedConfig.id !== id) {
            navigate(`/editor/${publishedConfig.id}`, { replace: true });
          }
        }}
      />
    </div>
  );
};

