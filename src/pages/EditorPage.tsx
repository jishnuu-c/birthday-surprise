import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BirthdayPageConfig } from '../types';
import { getPageById, savePageLocally, createNewBirthdayPage } from '../lib/storage';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { Navbar } from '../components/common/Navbar';
import { BasicDetailsTab } from '../components/editor/BasicDetailsTab';
import { MediaManagerTab } from '../components/editor/MediaManagerTab';
import { ThemeCustomizerTab } from '../components/editor/ThemeCustomizerTab';
import { SectionManagerTab } from '../components/editor/SectionManagerTab';
import { PublishShareTab } from '../components/editor/PublishShareTab';
import { LivePreviewFrame } from '../components/editor/LivePreviewFrame';
import { ShareModal } from '../components/surprise/ShareModal';
import { User, Image, Palette, Layers, Globe, Eye, Save, Sparkles, Check } from 'lucide-react';

type TabKey = 'details' | 'media' | 'theme' | 'sections' | 'publish';

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<BirthdayPageConfig>(DEFAULT_DEMO_CONFIG);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [isSaved, setIsSaved] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor-only' | 'preview-only'>('split');

  // Load configuration by ID
  useEffect(() => {
    if (id) {
      const found = getPageById(id);
      if (found) {
        setConfig(found);
      } else {
        // Create if not found
        const created = createNewBirthdayPage('Best Friend');
        setConfig(created);
        navigate(`/editor/${created.id}`, { replace: true });
      }
    }
  }, [id, navigate]);

  // Handle configuration updates
  const handleUpdateConfig = (updated: Partial<BirthdayPageConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...updated, updatedAt: new Date().toISOString() };
      savePageLocally(merged);
      setIsSaved(false);
      setTimeout(() => setIsSaved(true), 800);
      return merged;
    });
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Basic Details', icon: <User className="w-4 h-4" /> },
    { key: 'media', label: 'Media & Audio', icon: <Image className="w-4 h-4" /> },
    { key: 'theme', label: 'Themes & Styles', icon: <Palette className="w-4 h-4" /> },
    { key: 'sections', label: 'Section Manager', icon: <Layers className="w-4 h-4" /> },
    { key: 'publish', label: 'Publish & Share', icon: <Globe className="w-4 h-4" /> }
  ];

  const publicUrl = `${window.location.origin}/b/${config.slug || config.id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        config={config}
        isEditor={true}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Editor Sub-Header Toolbar */}
      <div className="bg-slate-900/90 border-b border-white/10 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-bold text-slate-100">
              Editing: <span className="text-pink-300">{config.recipientName}</span>
            </span>
          </div>

          <span className="hidden sm:inline text-slate-600">|</span>

          {/* Auto save indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {isSaved ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Auto-saved</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                <Save className="w-3.5 h-3.5" />
                <span>Saving changes...</span>
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle for Desktop */}
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

        {/* Quick View Live button */}
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Open Recipient Link</span>
        </a>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Editor */}
          {viewMode !== 'preview-only' && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'} space-y-6`}>
              {/* Tab Navigation Buttons */}
              <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 rounded-2xl border border-white/10">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Active Tab Panel */}
              <div className="animate-in fade-in duration-200">
                {activeTab === 'details' && (
                  <BasicDetailsTab config={config} onChange={handleUpdateConfig} />
                )}
                {activeTab === 'media' && (
                  <MediaManagerTab config={config} onChange={handleUpdateConfig} />
                )}
                {activeTab === 'theme' && (
                  <ThemeCustomizerTab config={config} onChange={handleUpdateConfig} />
                )}
                {activeTab === 'sections' && (
                  <SectionManagerTab config={config} onChange={handleUpdateConfig} />
                )}
                {activeTab === 'publish' && (
                  <PublishShareTab config={config} onUpdateConfig={handleUpdateConfig} />
                )}
              </div>
            </div>
          )}

          {/* Right Column: Interactive Live Device Preview */}
          {viewMode !== 'editor-only' && (
            <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'} sticky top-36`}>
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
