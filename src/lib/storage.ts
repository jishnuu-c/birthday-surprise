import { BirthdayPageConfig } from '../types';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { fetchRemoteBirthdayPage, isSupabaseConfigured, saveRemoteBirthdayPage } from './supabase';

const STORAGE_KEY_PAGES = 'birthday_magic_pages_v1';
const STORAGE_KEY_CURRENT = 'birthday_magic_active_page_id';

// Initialize default store
export function getAllPages(): BirthdayPageConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAGES);
    if (!raw) {
      const initial = [DEFAULT_DEMO_CONFIG];
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_DEMO_CONFIG];
    }
    return parsed;
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
  // 1. Check local storage
  const local = getPageById(idOrSlug);
  if (local) return local;

  // 2. Check if encoded in URL Hash (for instant zero-server sharing across any phone)
  if (window.location.hash.startsWith('#data=')) {
    try {
      const base64 = window.location.hash.replace('#data=', '');
      const json = decodeURIComponent(escape(atob(base64)));
      const parsed = JSON.parse(json) as BirthdayPageConfig;
      if (parsed && parsed.recipientName) {
        // Save to local cache
        savePageLocally(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse hash payload:', e);
    }
  }

  // 3. Try Remote Supabase if enabled
  if (isSupabaseConfigured) {
    const remote = await fetchRemoteBirthdayPage(idOrSlug);
    if (remote) {
      savePageLocally(remote);
      return remote;
    }
  }

  return null;
}

export function savePageLocally(config: BirthdayPageConfig): void {
  const pages = getAllPages();
  const index = pages.findIndex(p => p.id === config.id);
  const updated = {
    ...config,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    pages[index] = updated;
  } else {
    pages.push(updated);
  }

  localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
}

export async function saveAndPublishPage(config: BirthdayPageConfig): Promise<{ success: boolean; url: string }> {
  // Update local
  const publishedConfig = {
    ...config,
    isPublished: true,
    updatedAt: new Date().toISOString()
  };
  savePageLocally(publishedConfig);

  // Sync to Supabase if configured
  if (isSupabaseConfigured) {
    await saveRemoteBirthdayPage(publishedConfig);
  }

  // Generate public URL
  const origin = window.location.origin;
  const publicUrl = `${origin}/b/${config.slug || config.id}`;

  return {
    success: true,
    url: publicUrl
  };
}

export function generateShareableDataUrl(config: BirthdayPageConfig): string {
  try {
    const json = JSON.stringify(config);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}/b/${config.slug || config.id}#data=${base64}`;
  } catch (err) {
    console.error('Failed to encode share URL:', err);
    return `${window.location.origin}/b/${config.slug || config.id}`;
  }
}

export function deletePage(id: string): void {
  const pages = getAllPages().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
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

// Image compression helper for smooth mobile uploads
export function compressImageFile(file: File, maxWidth = 1400, quality = 0.85): Promise<string> {
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
