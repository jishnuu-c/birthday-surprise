import { BirthdayPageConfig } from '../types';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { 
  fetchRemoteBirthdayPage, 
  fetchRemoteBirthdayPageDetailed,
  fetchUserRemotePages,
  deleteRemoteBirthdayPage,
  isSupabaseConfigured, 
  saveRemoteBirthdayPage 
} from './supabase';
import { getMediaBlobUrl, deleteMediaBlob } from './mediaDb';

const STORAGE_KEY_PAGES = 'birthday_magic_pages_v1';
const STORAGE_KEY_CURRENT = 'birthday_magic_active_page_id';

// Initialize default store
export function getAllPages(): BirthdayPageConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAGES);
    if (!raw) {
      const initial = [DEFAULT_DEMO_CONFIG];
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(initial));
      } catch {
        // ignore quota
      }
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_DEMO_CONFIG];
    }

    // Auto-migrate default demo page if it was stored with old legacy default preset
    let didMigrate = false;
    const migrated = parsed.map((page: BirthdayPageConfig) => {
      if (page.id === DEFAULT_DEMO_CONFIG.id || page.slug === DEFAULT_DEMO_CONFIG.slug) {
        if (!page.theme || page.theme.preset === 'romantic-rose' || !page.theme.giftBoxStyle) {
          didMigrate = true;
          return {
            ...page,
            theme: DEFAULT_DEMO_CONFIG.theme,
            landingGreeting: page.landingGreeting || DEFAULT_DEMO_CONFIG.landingGreeting,
            bgMusicTrackId: page.bgMusicTrackId || DEFAULT_DEMO_CONFIG.bgMusicTrackId
          };
        }
      }
      return page;
    });

    if (didMigrate) {
      try {
        localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(migrated));
      } catch {
        // ignore
      }
    }

    return migrated;
  } catch {
    return [DEFAULT_DEMO_CONFIG];
  }
}

export async function getAllPagesAsync(): Promise<BirthdayPageConfig[]> {
  const localPages = getAllPages();
  if (!isSupabaseConfigured) {
    return localPages;
  }
  try {
    const remotePages = await fetchUserRemotePages();
    if (!remotePages || remotePages.length === 0) {
      return localPages;
    }
    const map = new Map<string, BirthdayPageConfig>();
    localPages.forEach((p) => map.set(p.id, p));
    remotePages.forEach((p) => {
      const existing = map.get(p.id);
      if (!existing || new Date(p.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        map.set(p.id, p);
      }
    });
    const merged = Array.from(map.values());
    try {
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  } catch (err) {
    console.warn('Failed to fetch remote pages for dashboard:', err);
    return localPages;
  }
}

export function getPageById(idOrSlug: string): BirthdayPageConfig | null {
  const pages = getAllPages();
  const lower = idOrSlug.toLowerCase().trim();
  const found = pages.find(p => p.id === idOrSlug || p.slug === idOrSlug || p.slug?.toLowerCase() === lower);
  return found || null;
}

export interface ResolvedPageDetails {
  config: BirthdayPageConfig | null;
  status: 'success' | 'unpublished' | 'not_found' | 'error' | 'invalid_slug';
  error?: string;
}

/**
 * Resolves a birthday page with granular error and draft status differentiation.
 * Avoids false 404s when the database encounters an error or when a draft is unpublished.
 */
export async function resolvePageDetailsAsync(
  idOrSlug: string,
  options: { allowLocalFallback?: boolean; forceFresh?: boolean } = {}
): Promise<ResolvedPageDetails> {
  const { allowLocalFallback = false, forceFresh = false } = options;

  if (!idOrSlug || !idOrSlug.trim()) {
    return { config: null, status: 'invalid_slug', error: 'No link identifier provided in URL' };
  }

  // 1. Check if encoded in URL Hash or Query parameter (for instant zero-server sharing across phones)
  if (typeof window !== 'undefined') {
    let base64Payload: string | null = null;
    if (window.location.hash.startsWith('#data=')) {
      base64Payload = window.location.hash.replace('#data=', '');
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('data')) {
        base64Payload = searchParams.get('data');
      }
    }

    if (base64Payload) {
      try {
        const json = decodeURIComponent(escape(atob(base64Payload)));
        const parsed = JSON.parse(json) as BirthdayPageConfig;
        if (parsed && parsed.recipientName) {
          savePageLocally(parsed);
          const resolved = await resolveLocalMediaUrls(parsed);
          return { config: resolved, status: 'success' };
        }
      } catch (e) {
        console.warn('Failed to parse data URL payload:', e);
      }
    }
  }

  // 2. Query Supabase Cloud Database if enabled
  if (isSupabaseConfigured) {
    try {
      // Check fetchRemoteBirthdayPage first (supports unit test mocks and cached calls)
      const remotePage = await fetchRemoteBirthdayPage(idOrSlug, forceFresh);
      if (remotePage) {
        if (remotePage.isPublished) {
          // If in editor mode (allowLocalFallback), verify if local edits are strictly newer
          if (allowLocalFallback) {
            const local = getPageById(idOrSlug);
            if (local && new Date(local.updatedAt || 0) > new Date(remotePage.updatedAt || 0)) {
              const resolved = await resolveLocalMediaUrls(local);
              return { config: resolved, status: 'success' };
            }
          }
          savePageLocally(remotePage);
          const resolved = await resolveLocalMediaUrls(remotePage);
          return { config: resolved, status: 'success' };
        } else {
          const resolved = await resolveLocalMediaUrls(remotePage);
          return { config: resolved, status: 'unpublished' };
        }
      }

      // If returned null, check whether it was due to a database/network error or unpublished draft (re-using cached result)
      const remoteRes = await fetchRemoteBirthdayPageDetailed(idOrSlug, false);
      if (remoteRes.status === 'unpublished' && remoteRes.config) {
        const resolved = await resolveLocalMediaUrls(remoteRes.config);
        return { config: resolved, status: 'unpublished' };
      }
      if (remoteRes.status === 'error') {
        // Supabase network failure, rate limit HTTP 429, or PostgREST error - NOT a 404!
        return { config: null, status: 'error', error: remoteRes.error };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query database';
      console.warn('Supabase resolve error:', err);
      return { config: null, status: 'error', error: msg };
    }
  }

  // 3. Local storage check
  const local = getPageById(idOrSlug);
  if (local) {
    // If allowLocalFallback is true (editor mode), return it as success
    if (allowLocalFallback) {
      const resolved = await resolveLocalMediaUrls(local);
      return { config: resolved, status: 'success' };
    }
    // If not in editor mode but local copy exists on this browser:
    // It's an unpublished draft on the creator's machine
    if (!local.isPublished) {
      const resolved = await resolveLocalMediaUrls(local);
      return { config: resolved, status: 'unpublished' };
    }
  }

  return { config: null, status: 'not_found' };
}

export async function resolvePageAsync(
  idOrSlug: string,
  options: { allowLocalFallback?: boolean; forceFresh?: boolean } = {}
): Promise<BirthdayPageConfig | null> {
  const result = await resolvePageDetailsAsync(idOrSlug, options);
  return result.config;
}

export async function resolveLocalMediaUrls(config: BirthdayPageConfig): Promise<BirthdayPageConfig> {
  const copy = { ...config };

  // 1. Audio resolution: only check IndexedDB if URL is explicitly local (blob: or indexeddb:)
  if (copy.customAudioUrl) {
    if (copy.customAudioUrl.startsWith('indexeddb:')) {
      const key = copy.customAudioUrl.replace('indexeddb:', '');
      const blobUrl = await getMediaBlobUrl(key);
      if (blobUrl) {
        copy.customAudioUrl = blobUrl;
      }
    } else if (copy.customAudioUrl.startsWith('blob:')) {
      const fallbackKey = `audio-${copy.id}`;
      const blobUrl = await getMediaBlobUrl(fallbackKey);
      if (blobUrl) {
        copy.customAudioUrl = blobUrl;
      }
    }
  }

  // 2. Video resolution: only check IndexedDB if URL is explicitly local
  if (copy.videoUrl) {
    if (copy.videoUrl.startsWith('indexeddb:')) {
      const key = copy.videoUrl.replace('indexeddb:', '');
      const blobUrl = await getMediaBlobUrl(key);
      if (blobUrl) {
        copy.videoUrl = blobUrl;
      }
    } else if (copy.videoUrl.startsWith('blob:')) {
      const fallbackKey = `video-${copy.id}`;
      const blobUrl = await getMediaBlobUrl(fallbackKey);
      if (blobUrl) {
        copy.videoUrl = blobUrl;
      }
    }
  }

  // 3. Voice message resolution
  if (copy.voiceMessageUrl && copy.voiceMessageUrl.startsWith('indexeddb:')) {
    const key = copy.voiceMessageUrl.replace('indexeddb:', '');
    const blobUrl = await getMediaBlobUrl(key);
    if (blobUrl) {
      copy.voiceMessageUrl = blobUrl;
    }
  }

  return copy;
}

/**
 * Compares two BirthdayPageConfig objects to check if user-editable content has actually changed.
 * Ignores transient or volatile timestamps (e.g. updatedAt).
 */
export function areConfigsEqual(
  a: BirthdayPageConfig | null | undefined,
  b: BirthdayPageConfig | null | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a === b) return true;

  // 1. Direct comparison of primary scalar editable fields
  if (a.recipientName !== b.recipientName) return false;
  if (a.nickname !== b.nickname) return false;
  if (a.pageTitle !== b.pageTitle) return false;
  if (a.landingGreeting !== b.landingGreeting) return false;
  if (a.heroHeadline !== b.heroHeadline) return false;
  if (a.heroSubtitle !== b.heroSubtitle) return false;
  if (a.letterHeading !== b.letterHeading) return false;
  if (a.letterContent !== b.letterContent) return false;
  if (a.letterClosing !== b.letterClosing) return false;
  if (a.birthDate !== b.birthDate) return false;
  if (a.targetAge !== b.targetAge) return false;
  if (a.showAgeCountdown !== b.showAgeCountdown) return false;
  if (a.passcode !== b.passcode) return false;
  if (a.cakeFlavor !== b.cakeFlavor) return false;
  if (a.candlesCount !== b.candlesCount) return false;
  if (a.wishPrompt !== b.wishPrompt) return false;
  if (a.wishCompletedMessage !== b.wishCompletedMessage) return false;
  if (a.scratchTitle !== b.scratchTitle) return false;
  if (a.scratchInstruction !== b.scratchInstruction) return false;
  if (a.scratchSecretMessage !== b.scratchSecretMessage) return false;
  if (a.profilePhotoUrl !== b.profilePhotoUrl) return false;
  if (a.videoUrl !== b.videoUrl) return false;
  if (a.videoTitle !== b.videoTitle) return false;
  if (a.videoDescription !== b.videoDescription) return false;
  if (a.videoThumbnailUrl !== b.videoThumbnailUrl) return false;
  if (a.bgMusicTrackId !== b.bgMusicTrackId) return false;
  if (a.customAudioUrl !== b.customAudioUrl) return false;
  if (a.voiceMessageUrl !== b.voiceMessageUrl) return false;
  if (a.voiceMessageSender !== b.voiceMessageSender) return false;
  if (a.isPublished !== b.isPublished) return false;
  if (a.slug !== b.slug) return false;

  // 2. Structural sub-objects comparison (theme, sections, gallery, timeline, reasons)
  const normA = {
    theme: a.theme,
    sections: a.sections,
    galleryPhotos: a.galleryPhotos,
    galleryHeading: a.galleryHeading,
    gallerySubtitle: a.gallerySubtitle,
    timelineMemories: a.timelineMemories,
    timelineHeading: a.timelineHeading,
    timelineSubtitle: a.timelineSubtitle,
    reasonsHeading: a.reasonsHeading,
    reasonsList: a.reasonsList
  };

  const normB = {
    theme: b.theme,
    sections: b.sections,
    galleryPhotos: b.galleryPhotos,
    galleryHeading: b.galleryHeading,
    gallerySubtitle: b.gallerySubtitle,
    timelineMemories: b.timelineMemories,
    timelineHeading: b.timelineHeading,
    timelineSubtitle: b.timelineSubtitle,
    reasonsHeading: b.reasonsHeading,
    reasonsList: b.reasonsList
  };

  return JSON.stringify(normA) === JSON.stringify(normB);
}

/**
 * Persists page configuration safely to localStorage with proper media key preservation
 */
export function savePageLocally(config: BirthdayPageConfig): { success: boolean; error?: string } {
  try {
    const pages = getAllPages();
    const index = pages.findIndex(p => p.id === config.id);
    
    // Convert ephemeral session blob: URLs to persistent indexeddb: keys for storage
    const storageConfig = { ...config, updatedAt: new Date().toISOString() };
    
    if (storageConfig.customAudioUrl && storageConfig.customAudioUrl.startsWith('blob:')) {
      storageConfig.customAudioUrl = `indexeddb:audio-${config.id}`;
    }
    if (storageConfig.videoUrl && storageConfig.videoUrl.startsWith('blob:')) {
      storageConfig.videoUrl = `indexeddb:video-${config.id}`;
    }
    if (storageConfig.voiceMessageUrl && storageConfig.voiceMessageUrl.startsWith('blob:')) {
      storageConfig.voiceMessageUrl = `indexeddb:voice-${config.id}`;
    }

    if (index >= 0) {
      pages[index] = storageConfig;
    } else {
      pages.push(storageConfig);
    }

    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage quota exceeded';
    console.warn('localStorage save warning:', err);
    return { success: false, error: msg };
  }
}

/**
 * Unified save function: saves locally and syncs complete configuration to Supabase if configured
 */
export async function savePage(
  config: BirthdayPageConfig
): Promise<{ success: boolean; error?: string; config?: BirthdayPageConfig }> {
  const localRes = savePageLocally(config);
  if (!localRes.success) {
    return localRes;
  }

  if (isSupabaseConfigured) {
    const remoteRes = await saveRemoteBirthdayPage(config);
    if (!remoteRes.success) {
      return {
        success: false,
        error: remoteRes.error || 'Failed to save to Supabase cloud'
      };
    }
    if (remoteRes.config) {
      savePageLocally(remoteRes.config);
      return { success: true, config: remoteRes.config };
    }
  }

  return { success: true, config };
}

export async function saveAndPublishPage(
  config: BirthdayPageConfig
): Promise<{ success: boolean; url: string; config?: BirthdayPageConfig; error?: string }> {
  let targetConfig = { ...config };

  // Guarantee a unique ID if missing or demo
  if (!targetConfig.id || targetConfig.id === DEFAULT_DEMO_CONFIG.id) {
    targetConfig.id = `bday-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Guarantee a unique slug if missing or demo
  if (!targetConfig.slug || targetConfig.slug === DEFAULT_DEMO_CONFIG.slug) {
    const cleanName = (targetConfig.recipientName || 'friend')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'surprise';
    targetConfig.slug = `${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;
  } else {
    targetConfig.slug = targetConfig.slug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/(^-|-$)/g, '');
  }

  const publishedConfig: BirthdayPageConfig = {
    ...targetConfig,
    isPublished: true,
    updatedAt: new Date().toISOString()
  };

  const saveRes = await savePage(publishedConfig);
  if (!saveRes.success) {
    return {
      success: false,
      url: '',
      error: saveRes.error || 'Failed to publish to cloud'
    };
  }

  const finalConfig = saveRes.config || publishedConfig;
  const origin = window.location.origin;
  const publicUrl = isSupabaseConfigured
    ? `${origin}/b/${finalConfig.slug || finalConfig.id}`
    : generateShareableDataUrl(finalConfig);

  return {
    success: true,
    url: publicUrl,
    config: finalConfig
  };
}

export function generateShareableDataUrl(config: BirthdayPageConfig): string {
  try {
    const exportableConfig = { ...config };
    if (exportableConfig.customAudioUrl && (exportableConfig.customAudioUrl.startsWith('blob:') || exportableConfig.customAudioUrl.startsWith('indexeddb:') || exportableConfig.customAudioUrl.length > 200000)) {
      exportableConfig.customAudioUrl = '';
    }
    if (exportableConfig.videoUrl && (exportableConfig.videoUrl.startsWith('blob:') || exportableConfig.videoUrl.startsWith('indexeddb:') || exportableConfig.videoUrl.length > 200000)) {
      exportableConfig.videoUrl = '';
    }

    const json = JSON.stringify(exportableConfig);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}/b/${config.slug || config.id}#data=${base64}`;
  } catch (err) {
    console.error('Failed to encode share URL:', err);
    return `${window.location.origin}/b/${config.slug || config.id}`;
  }
}

export async function deletePage(id: string): Promise<void> {
  const pages = getAllPages().filter(p => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
    // Clean up local media associated with page
    deleteMediaBlob(`audio-${id}`).catch(() => {});
    deleteMediaBlob(`video-${id}`).catch(() => {});
    deleteMediaBlob(`voice-${id}`).catch(() => {});
  } catch {
    // ignore
  }

  if (isSupabaseConfigured) {
    await deleteRemoteBirthdayPage(id).catch(err => {
      console.warn('Failed to delete remote page:', err);
    });
  }
}

export function getActivePageId(): string {
  return localStorage.getItem(STORAGE_KEY_CURRENT) || DEFAULT_DEMO_CONFIG.id;
}

export function setActivePageId(id: string): void {
  localStorage.setItem(STORAGE_KEY_CURRENT, id);
}

export function createNewBirthdayPage(recipientName: string = 'My Best Friend'): BirthdayPageConfig {
  const cleanSlug = recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'special-day';
  const newId = `bday-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  
  const newConfig: BirthdayPageConfig = {
    ...DEFAULT_DEMO_CONFIG,
    id: newId,
    slug: `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: false,
    recipientName: recipientName,
    nickname: '',
    pageTitle: `Happy Birthday, ${recipientName}! ✨`,
    heroHeadline: `HAPPY BIRTHDAY, ${recipientName.toUpperCase()}!`,
    heroSubtitle: 'Today is your day to shine brighter than all the stars.',
    letterHeading: `A Special Letter for ${recipientName}`,
    letterContent: `Dear ${recipientName},\n\nWishing you the happiest birthday ever! May your day be filled with endless smiles, sweet memories, and every single thing you have been wishing for.\n\nThank you for being such an extraordinary light in this world!`,
    letterClosing: `With love and celebration,\n— Your Friend ❤️`,
    reasonsHeading: `Reasons Why You Are Special, ${recipientName}`,
    galleryPhotos: [
      {
        id: `p-${Date.now()}-1`,
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
        caption: 'Unforgettable moments full of genuine joy',
        date: 'Recent memory',
        aspectRatio: 'portrait'
      }
    ]
  };

  savePageLocally(newConfig);
  setActivePageId(newId);
  return newConfig;
}

// Image compression helper for smooth mobile uploads and optimal storage size
export function compressImageFile(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}


