import { BirthdayPageConfig } from '../types';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { fetchRemoteBirthdayPage, isSupabaseConfigured, saveRemoteBirthdayPage } from './supabase';
import { getMediaBlobUrl, getMediaRecord, deleteMediaBlob } from './mediaDb';

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

export function getPageById(idOrSlug: string): BirthdayPageConfig | null {
  const pages = getAllPages();
  const found = pages.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  return found || null;
}

export async function resolvePageAsync(idOrSlug: string): Promise<BirthdayPageConfig | null> {
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
          // Check if local is older or doesn't exist
          const local = getPageById(idOrSlug);
          if (!local || new Date(parsed.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
            savePageLocally(parsed);
            const resolved = await resolveLocalMediaUrls(parsed);
            return resolved;
          }
        }
      } catch (e) {
        console.warn('Failed to parse data URL payload:', e);
      }
    }
  }

  // 2. Try Remote Supabase if enabled (to get latest published theme across any device)
  if (isSupabaseConfigured) {
    try {
      const remote = await fetchRemoteBirthdayPage(idOrSlug);
      const local = getPageById(idOrSlug);

      if (remote) {
        // If remote has the newest timestamp or local doesn't exist, use remote
        if (!local || new Date(remote.updatedAt || 0) >= new Date(local.updatedAt || 0)) {
          savePageLocally(remote);
          const resolved = await resolveLocalMediaUrls(remote);
          return resolved;
        } else {
          // Local is newer (e.g. user just edited in the same browser)
          const resolved = await resolveLocalMediaUrls(local);
          return resolved;
        }
      }
    } catch (err) {
      console.warn('Supabase resolve error, falling back to local:', err);
    }
  }

  // 3. Check local storage cache
  const local = getPageById(idOrSlug);
  if (local) {
    const resolved = await resolveLocalMediaUrls(local);
    return resolved;
  }

  return null;
}

export async function resolveLocalMediaUrls(config: BirthdayPageConfig): Promise<BirthdayPageConfig> {
  const copy = { ...config };

  // 1. Audio resolution
  if (copy.customAudioUrl) {
    if (copy.customAudioUrl.startsWith('indexeddb:')) {
      const key = copy.customAudioUrl.replace('indexeddb:', '');
      const blobUrl = await getMediaBlobUrl(key);
      if (blobUrl) {
        copy.customAudioUrl = blobUrl;
      }
    } else if (copy.customAudioUrl.startsWith('blob:')) {
      // Check if we have an indexeddb fallback for this page
      const fallbackKey = `audio-${copy.id}`;
      const blobUrl = await getMediaBlobUrl(fallbackKey);
      if (blobUrl) {
        copy.customAudioUrl = blobUrl;
      }
    }
  } else {
    // Check if indexeddb has an audio record for this page
    const fallbackKey = `audio-${copy.id}`;
    const blobUrl = await getMediaBlobUrl(fallbackKey);
    if (blobUrl) {
      copy.customAudioUrl = blobUrl;
    }
  }

  // 2. Video resolution
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
  } else {
    const fallbackKey = `video-${copy.id}`;
    const blobUrl = await getMediaBlobUrl(fallbackKey);
    if (blobUrl) {
      copy.videoUrl = blobUrl;
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
 * Unified save function: saves locally and syncs to Supabase if configured
 */
export async function savePage(config: BirthdayPageConfig): Promise<{ success: boolean; error?: string }> {
  const localRes = savePageLocally(config);
  if (!localRes.success) {
    return localRes;
  }

  if (isSupabaseConfigured) {
    const remoteRes = await saveRemoteBirthdayPage(config);
    if (!remoteRes.success) {
      return {
        success: true, // Saved locally at least
        error: `Saved locally, but remote sync noticed: ${remoteRes.error}`
      };
    }
  }

  return { success: true };
}

export async function saveAndPublishPage(config: BirthdayPageConfig): Promise<{ success: boolean; url: string; error?: string }> {
  const publishedConfig: BirthdayPageConfig = {
    ...config,
    isPublished: true,
    updatedAt: new Date().toISOString()
  };
  
  const saveRes = await savePage(publishedConfig);

  const origin = window.location.origin;
  const publicUrl = `${origin}/b/${config.slug || config.id}`;

  return {
    success: saveRes.success,
    url: publicUrl,
    error: saveRes.error
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

export function deletePage(id: string): void {
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


