import { createClient, User } from '@supabase/supabase-js';
import { BirthdayPageConfig } from '../types';
import { getMediaRecord } from './mediaDb';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function decodeBase64(str: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    try {
      return globalThis.atob(str);
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Checks whether a key is a Supabase service-role or secret key.
 * Service-role keys bypass all Row Level Security and must NEVER be used in frontend code!
 */
export function isServiceRoleKey(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();

  // 1. New Supabase secret key prefix
  if (trimmed.startsWith('sb_secret_')) return true;

  // 2. Direct keyword check
  const lower = trimmed.toLowerCase();
  if (lower.includes('service_role') || lower.includes('secret_key')) return true;

  // 3. JWT payload inspection (legacy format)
  if (trimmed.startsWith('eyJ')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeBase64(base64);
        if (json) {
          const payload = JSON.parse(json);
          if (payload && (payload.role === 'service_role' || payload.role === 'supabase_admin')) {
            return true;
          }
        }
      }
    } catch {
      // ignore parsing failure
    }
  }

  return false;
}

/**
 * Validates that a key is a public publishable or anonymous key.
 */
export function isAnonOrPublishableKey(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (isServiceRoleKey(trimmed)) return false;
  if (trimmed.startsWith('sb_publishable_')) return true;
  if (trimmed.startsWith('eyJ')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeBase64(base64);
        if (json) {
          const payload = JSON.parse(json);
          if (payload && payload.role === 'anon') {
            return true;
          }
        }
      }
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

/**
 * Validates Supabase configuration and returns a clear descriptive error message if invalid or missing.
 */
export function getSupabaseConfigError(url = rawUrl, key = rawKey): string | null {
  const trimmedUrl = (url || '').trim();
  const trimmedKey = (key || '').trim();

  if (!trimmedUrl && !trimmedKey) {
    return 'Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set in .env or Vercel environment variables.';
  }
  if (!trimmedUrl) {
    return 'Missing Supabase URL: VITE_SUPABASE_URL is not set. Please provide your Supabase project URL (e.g. https://your-project.supabase.co).';
  }
  if (!trimmedUrl.startsWith('https://')) {
    return 'Invalid Supabase URL: VITE_SUPABASE_URL must start with "https://".';
  }
  if (trimmedUrl.includes('your-project') || trimmedUrl.includes('placeholder')) {
    return 'Placeholder Supabase URL: VITE_SUPABASE_URL contains placeholder values. Please replace it with your actual project URL.';
  }
  if (!trimmedKey) {
    return 'Missing Supabase API Key: VITE_SUPABASE_ANON_KEY is not set. Please provide your public anon or publishable key.';
  }
  if (trimmedKey.includes('your-anon-key') || trimmedKey.includes('placeholder')) {
    return 'Placeholder Supabase API Key: VITE_SUPABASE_ANON_KEY contains placeholder values. Please replace it with your actual anon or publishable key.';
  }
  if (isServiceRoleKey(trimmedKey)) {
    return 'CRITICAL SECURITY ERROR: VITE_SUPABASE_ANON_KEY is configured with a service-role or secret key. Service-role keys bypass all Row Level Security and must NEVER be exposed in client applications! Replace it with your public anon or publishable key (e.g. sb_publishable_... or anon JWT).';
  }
  return null;
}

export const supabaseConfigError = getSupabaseConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

// Log helpful security or diagnostic warnings
if (supabaseConfigError) {
  if (isServiceRoleKey(rawKey)) {
    console.error(`🚨 [Supabase Security Alert] ${supabaseConfigError}`);
  } else if (rawUrl || rawKey) {
    console.warn(`⚠️ [Supabase Configuration Notice] ${supabaseConfigError}`);
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Detects whether an error is an HTTP 429 (Too Many Requests) or rate-limit response.
 */
export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    if (errorObj.status === 429 || errorObj.statusCode === 429 || errorObj.code === '429' || errorObj.code === 429) {
      return true;
    }
    const message = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : '';
    if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit')) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts retry-after delay in milliseconds from an error or headers if available, or falls back to exponential backoff.
 */
export function getRetryDelayMs(err: unknown, attempt: number, baseDelay = 1000): number {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    const retryAfter = errorObj.retryAfter || errorObj['retry-after'];
    if (typeof retryAfter === 'number' && retryAfter > 0) {
      return retryAfter * 1000;
    }
    if (typeof retryAfter === 'string') {
      const parsed = parseFloat(retryAfter);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed * 1000);
      }
    }
  }
  // Exponential backoff with jitter: baseDelay * 2^attempt + random(0..400ms)
  const backoff = baseDelay * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 400);
  return Math.min(backoff + jitter, 10000);
}

/**
 * Executes an operation with automatic retry on HTTP 429 rate limits.
 */
export async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const result = await operation();
      // Supabase PostgREST client returns { data, error } without throwing
      if (result && typeof result === 'object' && 'error' in result && (result as { error?: unknown }).error) {
        const error = (result as { error?: unknown }).error;
        if (isRateLimitError(error) && attempt < maxRetries) {
          const delay = getRetryDelayMs(error, attempt, baseDelay);
          console.warn(`⏳ [Rate Limit 429] Supabase API rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((res) => setTimeout(res, delay));
          attempt++;
          continue;
        }
      }
      return result;
    } catch (err: unknown) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        const delay = getRetryDelayMs(err, attempt, baseDelay);
        console.warn(`⏳ [Rate Limit 429] Request rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((res) => setTimeout(res, delay));
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

// User session memory cache to avoid spamming /auth/v1/user
let cachedUser: User | null = null;
let lastUserCheck = 0;
const USER_CACHE_TTL = 15_000; // 15 seconds

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUser = session?.user ?? null;
    lastUserCheck = Date.now();
  });
}

/**
 * Get the currently authenticated user if one exists.
 * Uses local session first (zero network requests) to avoid HTTP 429 auth rate limits.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const now = Date.now();
  if (cachedUser && (now - lastUserCheck < USER_CACHE_TTL)) {
    return cachedUser;
  }

  try {
    // 1. Check local session storage (instant, no network request)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUser = session.user;
      lastUserCheck = now;
      return cachedUser;
    }

    // 2. Query getUser() with retry only if no session found locally
    const { data: { user } } = await withRateLimitRetry(async () => {
      return await supabase!.auth.getUser();
    }, 2, 800);

    cachedUser = user;
    lastUserCheck = now;
    return cachedUser;
  } catch {
    return null;
  }
}

// In-flight singleton lock to prevent concurrent redundant anonymous sign-ins
let ongoingAnonSignIn: Promise<User | null> | null = null;

export async function getOrCreateCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const existing = await getCurrentUser();
  if (existing) return existing;

  if (ongoingAnonSignIn) {
    return ongoingAnonSignIn;
  }

  ongoingAnonSignIn = (async () => {
    try {
      const res = await withRateLimitRetry(async () => {
        return await supabase!.auth.signInAnonymously();
      }, 3, 1200);

      if (res.error) {
        console.warn('Anonymous sign-in error:', res.error.message);
        return null;
      }
      if (res.data?.user) {
        cachedUser = res.data.user;
        lastUserCheck = Date.now();
        return res.data.user;
      }
      return null;
    } catch (err) {
      console.warn('Anonymous sign-in exception:', err);
      return null;
    } finally {
      ongoingAnonSignIn = null;
    }
  })();

  return ongoingAnonSignIn;
}

interface CacheEntry {
  config: BirthdayPageConfig | null;
  status?: 'success' | 'unpublished' | 'not_found' | 'error';
  error?: string;
  timestamp: number;
}
const remotePageCache = new Map<string, CacheEntry>();
const inFlightFetches = new Map<string, Promise<BirthdayPageConfig | null>>();
const PAGE_CACHE_TTL_MS = 30_000; // 30 seconds cache

export function invalidateRemotePageCache(slugOrId?: string): void {
  if (slugOrId) {
    remotePageCache.delete(slugOrId);
  } else {
    remotePageCache.clear();
  }
}

export interface FetchBirthdayPageResult {
  config: BirthdayPageConfig | null;
  status: 'success' | 'unpublished' | 'not_found' | 'error';
  error?: string;
}

const inFlightDetailedFetches = new Map<string, Promise<FetchBirthdayPageResult>>();

/**
 * Fetch a single birthday page by slug or ID with detailed status.
 * Selects config, recipient_name, slug, is_published, id, updated_at.
 * Handles database errors and rate limits distinctly from 404 not found.
 */
export async function fetchRemoteBirthdayPageDetailed(
  slugOrId: string,
  forceFresh = false
): Promise<FetchBirthdayPageResult> {
  if (!slugOrId || !slugOrId.trim()) {
    return { config: null, status: 'not_found', error: 'No page slug or ID provided' };
  }

  if (!supabase) {
    return { config: null, status: 'error', error: supabaseConfigError || 'Supabase credentials not configured' };
  }

  const key = slugOrId.trim();
  const lowerKey = key.toLowerCase();

  // 1. Check in-memory cache if not forcing fresh fetch
  if (!forceFresh) {
    const cached = remotePageCache.get(key) || remotePageCache.get(lowerKey);
    if (cached) {
      const ttl = cached.status === 'not_found' ? 10_000 : PAGE_CACHE_TTL_MS;
      if (Date.now() - cached.timestamp < ttl) {
        if (cached.config) {
          return {
            config: cached.config,
            status: cached.config.isPublished ? 'success' : 'unpublished'
          };
        }
        if (cached.status === 'not_found') {
          return { config: null, status: 'not_found' };
        }
      }
    }
  }

  // 2. Return in-flight promise if query is already active
  if (inFlightDetailedFetches.has(key)) {
    return inFlightDetailedFetches.get(key)!;
  }

  const fetchPromise = (async (): Promise<FetchBirthdayPageResult> => {
    try {
      const orFilter = lowerKey !== key
        ? `slug.eq.${lowerKey},slug.eq.${key},id.eq.${key}`
        : `slug.eq.${lowerKey},id.eq.${lowerKey}`;

      const { data, error } = await withRateLimitRetry(async () => {
        return await supabase!
          .from('birthday_pages')
          .select('id, slug, recipient_name, is_published, config, updated_at')
          .or(orFilter)
          .order('updated_at', { ascending: false })
          .limit(1);
      }, 3, 1000);

      if (error) {
        console.warn('Supabase query returned database error:', error.message);
        return {
          config: null,
          status: 'error',
          error: error.message || 'Database error while fetching birthday page'
        };
      }

      if (data && data.length > 0 && data[0].config) {
        const row = data[0];
        const pageConfig = row.config as BirthdayPageConfig;
        pageConfig.id = row.id || pageConfig.id;
        pageConfig.slug = row.slug || pageConfig.slug;
        pageConfig.recipientName = row.recipient_name || pageConfig.recipientName;
        pageConfig.isPublished = row.is_published ?? pageConfig.isPublished;
        pageConfig.updatedAt = row.updated_at || pageConfig.updatedAt;

        // Cache result by key, lowercase key, id, and slug
        const status = row.is_published === false ? 'unpublished' : 'success';
        const entry: CacheEntry = { config: pageConfig, status, timestamp: Date.now() };
        remotePageCache.set(key, entry);
        if (lowerKey !== key) remotePageCache.set(lowerKey, entry);
        if (pageConfig.id) remotePageCache.set(pageConfig.id, entry);
        if (pageConfig.slug) remotePageCache.set(pageConfig.slug.toLowerCase(), entry);

        if (row.is_published === false) {
          return { config: pageConfig, status: 'unpublished' };
        }

        return { config: pageConfig, status: 'success' };
      }

      const notFoundEntry: CacheEntry = { config: null, status: 'not_found', timestamp: Date.now() };
      remotePageCache.set(key, notFoundEntry);
      if (lowerKey !== key) remotePageCache.set(lowerKey, notFoundEntry);
      return { config: null, status: 'not_found' };
    } catch (err: unknown) {
      console.warn('Failed to query remote birthday page from Supabase:', err);
      const msg = err instanceof Error ? err.message : 'Network error loading birthday page';
      return { config: null, status: 'error', error: msg };
    } finally {
      inFlightDetailedFetches.delete(key);
    }
  })();

  inFlightDetailedFetches.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Fetch a single published birthday page (or a page owned by the current user) by slug or ID.
 * Features in-memory caching, in-flight deduplication, and automatic HTTP 429 exponential backoff retry.
 * Never returns default demo data.
 */
export async function fetchRemoteBirthdayPage(slugOrId: string, forceFresh = false): Promise<BirthdayPageConfig | null> {
  const result = await fetchRemoteBirthdayPageDetailed(slugOrId, forceFresh);
  return result.config;
}

/**
 * Fetch all birthday pages owned by the currently authenticated user
 */
export async function fetchUserRemotePages(): Promise<BirthdayPageConfig[]> {
  if (!supabase) return [];
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await withRateLimitRetry(async () => {
      return await supabase!
        .from('birthday_pages')
        .select('config, is_published, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
    }, 3, 1000);

    if (error) {
      console.error('Failed to fetch user pages:', error);
      return [];
    }

    if (!data) return [];
    return data.map((row) => {
      const cfg = row.config as BirthdayPageConfig;
      if (cfg) {
        cfg.isPublished = row.is_published ?? cfg.isPublished;
      }
      return cfg;
    }).filter(Boolean);
  } catch (err) {
    console.error('Error in fetchUserRemotePages:', err);
    return [];
  }
}

/**
 * Ensures all media URLs in the page configuration are permanent cloud storage URLs.
 * If temporary browser blob: or indexeddb: URLs are detected, they are resolved from IndexedDB
 * or fetched and uploaded to the Supabase Storage 'birthday-media' bucket.
 */
export async function ensurePersistentMedia(
  config: BirthdayPageConfig
): Promise<{ config: BirthdayPageConfig; error?: string }> {
  if (!isSupabaseConfigured) {
    return { config };
  }

  const copy: BirthdayPageConfig = {
    ...config,
    galleryPhotos: config.galleryPhotos ? config.galleryPhotos.map((p) => ({ ...p })) : [],
    timelineMemories: config.timelineMemories ? config.timelineMemories.map((m) => ({ ...m })) : []
  };

  async function uploadBlobOrIndexedDb(
    url: string,
    folder: 'images' | 'audios' | 'videos',
    fallbackKey?: string,
    preferredName?: string
  ): Promise<{ url: string | null; error?: string }> {
    let blob: Blob | null = null;
    let name = preferredName || `media-${Date.now()}`;

    try {
      if (url.startsWith('indexeddb:')) {
        const key = url.replace('indexeddb:', '');
        const record = await getMediaRecord(key);
        if (record && record.blob) {
          blob = record.blob;
          name = record.name || name;
        }
      } else if (url.startsWith('blob:')) {
        try {
          const res = await fetch(url);
          blob = await res.blob();
        } catch {
          if (fallbackKey) {
            const record = await getMediaRecord(fallbackKey);
            if (record && record.blob) {
              blob = record.blob;
              name = record.name || name;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to extract media blob:', err);
    }

    if (!blob) {
      return { url: null, error: `Unable to access local media file for cloud upload.` };
    }

    return await uploadRemoteMedia(blob, folder, name);
  }

  // 1. Audio track
  if (copy.customAudioUrl && (copy.customAudioUrl.startsWith('blob:') || copy.customAudioUrl.startsWith('indexeddb:'))) {
    const res = await uploadBlobOrIndexedDb(copy.customAudioUrl, 'audios', `audio-${copy.id}`, 'custom-audio.mp3');
    if (res.url) {
      copy.customAudioUrl = res.url;
    } else {
      return {
        config: copy,
        error: `Failed to upload custom audio to cloud: ${res.error || 'Upload failed'}`
      };
    }
  }

  // 2. Video message
  if (copy.videoUrl && (copy.videoUrl.startsWith('blob:') || copy.videoUrl.startsWith('indexeddb:'))) {
    const res = await uploadBlobOrIndexedDb(copy.videoUrl, 'videos', `video-${copy.id}`, 'custom-video.mp4');
    if (res.url) {
      copy.videoUrl = res.url;
    } else {
      return {
        config: copy,
        error: `Failed to upload video message to cloud: ${res.error || 'Upload failed'}`
      };
    }
  }

  // 3. Voice Note
  if (copy.voiceMessageUrl && (copy.voiceMessageUrl.startsWith('blob:') || copy.voiceMessageUrl.startsWith('indexeddb:'))) {
    const res = await uploadBlobOrIndexedDb(copy.voiceMessageUrl, 'audios', `voice-${copy.id}`, 'voice-note.webm');
    if (res.url) {
      copy.voiceMessageUrl = res.url;
    } else {
      return {
        config: copy,
        error: `Failed to upload voice note to cloud: ${res.error || 'Upload failed'}`
      };
    }
  }

  // 4. Profile Photo
  if (copy.profilePhotoUrl && copy.profilePhotoUrl.startsWith('blob:')) {
    const res = await uploadBlobOrIndexedDb(copy.profilePhotoUrl, 'images', undefined, 'profile-photo.jpg');
    if (res.url) {
      copy.profilePhotoUrl = res.url;
    } else {
      return {
        config: copy,
        error: `Failed to upload profile photo to cloud: ${res.error || 'Upload failed'}`
      };
    }
  }

  // 5. Video Thumbnail
  if (copy.videoThumbnailUrl && copy.videoThumbnailUrl.startsWith('blob:')) {
    const res = await uploadBlobOrIndexedDb(copy.videoThumbnailUrl, 'images', undefined, 'video-thumb.jpg');
    if (res.url) {
      copy.videoThumbnailUrl = res.url;
    }
  }

  // 6. Gallery Photos
  if (Array.isArray(copy.galleryPhotos)) {
    for (let i = 0; i < copy.galleryPhotos.length; i++) {
      const photo = copy.galleryPhotos[i];
      if (photo.url && photo.url.startsWith('blob:')) {
        const res = await uploadBlobOrIndexedDb(photo.url, 'images', undefined, `gallery-${i}.jpg`);
        if (res.url) {
          photo.url = res.url;
        } else {
          return {
            config: copy,
            error: `Failed to upload gallery photo #${i + 1} to cloud: ${res.error || 'Upload failed'}`
          };
        }
      }
    }
  }

  // 7. Timeline Memories
  if (Array.isArray(copy.timelineMemories)) {
    for (let i = 0; i < copy.timelineMemories.length; i++) {
      const mem = copy.timelineMemories[i];
      if (mem.imageUrl && mem.imageUrl.startsWith('blob:')) {
        const res = await uploadBlobOrIndexedDb(mem.imageUrl, 'images', undefined, `memory-${i}.jpg`);
        if (res.url) {
          mem.imageUrl = res.url;
        }
      }
    }
  }

  // Final check: temporary browser blob URLs are rejected before cloud save
  const remainingBlobs: string[] = [];
  if (copy.customAudioUrl?.startsWith('blob:') || copy.customAudioUrl?.startsWith('indexeddb:')) remainingBlobs.push('Audio');
  if (copy.videoUrl?.startsWith('blob:') || copy.videoUrl?.startsWith('indexeddb:')) remainingBlobs.push('Video');
  if (copy.voiceMessageUrl?.startsWith('blob:') || copy.voiceMessageUrl?.startsWith('indexeddb:')) remainingBlobs.push('Voice');
  if (copy.profilePhotoUrl?.startsWith('blob:')) remainingBlobs.push('Profile Photo');
  if (copy.galleryPhotos?.some((p) => p.url?.startsWith('blob:'))) remainingBlobs.push('Gallery Photo');

  if (remainingBlobs.length > 0) {
    return {
      config: copy,
      error: `Temporary browser blob URLs detected for: ${remainingBlobs.join(', ')}. All media must be uploaded to cloud storage before saving.`
    };
  }

  return { config: copy };
}

/**
 * Persists a birthday page to Supabase with proper user ownership and RLS enforcement.
 * Saves the complete configuration including text, theme, colors, photos, audio, video,
 * and sections.
 */
export async function saveRemoteBirthdayPage(
  config: BirthdayPageConfig,
  editToken?: string | null
): Promise<{ success: boolean; error?: string; config?: BirthdayPageConfig }> {
  if (!supabase) {
    return { success: false, error: supabaseConfigError || 'Supabase credentials not configured' };
  }

  try {
    // Ensure all media URLs are persistent cloud storage URLs
    const mediaRes = await ensurePersistentMedia(config);
    if (mediaRes.error) {
      return { success: false, error: mediaRes.error };
    }

    const targetConfig = mediaRes.config;

    // Check for edit token from parameter, config, or localStorage
    let effectiveToken = editToken || targetConfig.editToken || null;
    if (!effectiveToken && typeof window !== 'undefined' && targetConfig.id) {
      try {
        effectiveToken = localStorage.getItem(`bday_edit_token_${targetConfig.id}`);
      } catch {
        // ignore
      }
    }

    // If edit token is present or we are running in browser without an authenticated Supabase user session,
    // try the secure server endpoint /api/save-surprise first
    if (effectiveToken && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const apiRes = await fetch('/api/save-surprise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetConfig.id,
            token: effectiveToken,
            config: targetConfig,
            isPublished: targetConfig.isPublished
          })
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.success && apiData.config) {
            const savedCfg = apiData.config as BirthdayPageConfig;
            // Update cache
            const entry: CacheEntry = { config: savedCfg, timestamp: Date.now() };
            remotePageCache.set(savedCfg.id, entry);
            if (savedCfg.slug) remotePageCache.set(savedCfg.slug, entry);
            return { success: true, config: savedCfg };
          }
        }
      } catch (apiErr) {
        console.warn('API save fallback to direct Supabase:', apiErr);
      }
    }

    // Direct Supabase fallback (for admin sessions or test environments)
    const user = await getOrCreateCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication session required for direct database write.' };
    }

    const cleanConfig: BirthdayPageConfig = {
      ...targetConfig,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };

    // Sanitize slug
    let cleanSlug = (cleanConfig.slug || cleanConfig.recipientName || 'birthday')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/^-+|-+$/g, '') || cleanConfig.id;

    cleanConfig.slug = cleanSlug;

    // Check whether the page already exists in Supabase by ID or SLUG
    const { data: existingRows } = await withRateLimitRetry(async () => {
      return await supabase!
        .from('birthday_pages')
        .select('id, user_id, slug, is_published')
        .or(`id.eq.${cleanConfig.id},slug.eq.${cleanSlug}`)
        .order('updated_at', { ascending: false })
        .limit(2);
    }, 2, 800);

    const existingPage = (existingRows && existingRows.length > 0)
      ? (existingRows.find(r => r.id === cleanConfig.id) || existingRows[0])
      : null;

    let error: { message: string; code?: string } | null = null;
    interface SavedBirthdayRow {
      id: string;
      slug: string;
      is_published: boolean;
      user_id: string;
      config: unknown;
      recipient_name: string;
      updated_at: string;
    }
    let savedRow: SavedBirthdayRow | null = null;

    if (existingPage) {
      // 1. EXISTING PAGE: Use UPDATE with the existing row ID
      if (existingPage.user_id === user.id || !existingPage.user_id) {
        cleanConfig.id = existingPage.id; // Keep ID consistent with database row
        const updateRes = await withRateLimitRetry(async () => {
          return await supabase!
            .from('birthday_pages')
            .update({
              slug: cleanSlug,
              user_id: user.id,
              recipient_name: cleanConfig.recipientName || 'Friend',
              is_published: cleanConfig.isPublished ?? false,
              config: cleanConfig,
              updated_at: cleanConfig.updatedAt
            })
            .eq('id', existingPage.id)
            .select('id, slug, is_published, user_id, config, recipient_name, updated_at')
            .single();
        }, 2, 800);
        error = updateRes.error;
        savedRow = (updateRes.data as unknown) as SavedBirthdayRow;
      } else {
        // Page exists but belongs to another user (e.g. opened shared link or different account)
        // Fork safely into a new page owned by current user to avoid 403 RLS violation
        cleanConfig.id = `bday-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        cleanConfig.slug = cleanSlug;
        cleanConfig.userId = user.id;

        const insertRes = await withRateLimitRetry(async () => {
          return await supabase!
            .from('birthday_pages')
            .insert({
              id: cleanConfig.id,
              slug: cleanSlug,
              user_id: user.id,
              recipient_name: cleanConfig.recipientName || 'Friend',
              is_published: cleanConfig.isPublished ?? false,
              config: cleanConfig,
              created_at: cleanConfig.createdAt || new Date().toISOString(),
              updated_at: cleanConfig.updatedAt
            })
            .select('id, slug, is_published, user_id, config, recipient_name, updated_at')
            .single();
        }, 2, 800);
        error = insertRes.error;
        savedRow = (insertRes.data as unknown) as SavedBirthdayRow;
      }
    } else {
      // 2. NEW PAGE: Use INSERT only when creating a new birthday page
      const insertRes = await withRateLimitRetry(async () => {
        return await supabase!
          .from('birthday_pages')
          .insert({
            id: cleanConfig.id,
            slug: cleanSlug,
            user_id: user.id,
            recipient_name: cleanConfig.recipientName || 'Friend',
            is_published: cleanConfig.isPublished ?? false,
            config: cleanConfig,
            created_at: cleanConfig.createdAt || new Date().toISOString(),
            updated_at: cleanConfig.updatedAt
          })
          .select('id, slug, is_published, user_id, config, recipient_name, updated_at')
          .single();
      }, 2, 800);
      error = insertRes.error;
      savedRow = (insertRes.data as unknown) as SavedBirthdayRow;
    }

    // Handle slug uniqueness constraint collision by appending unique suffix
    if (error && (error.message.includes('birthday_pages_slug_key') || error.code === '23505')) {
      cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      cleanConfig.slug = cleanSlug;
      if (existingPage && (existingPage.user_id === user.id || !existingPage.user_id)) {
        const retryUpdate = await withRateLimitRetry(async () => {
          return await supabase!
            .from('birthday_pages')
            .update({
              slug: cleanSlug,
              user_id: user.id,
              recipient_name: cleanConfig.recipientName || 'Friend',
              is_published: cleanConfig.isPublished ?? false,
              config: cleanConfig,
              updated_at: cleanConfig.updatedAt
            })
            .eq('id', existingPage.id)
            .select('id, slug, is_published, user_id, config, recipient_name, updated_at')
            .single();
        }, 2, 800);
        error = retryUpdate.error;
        savedRow = (retryUpdate.data as unknown) as SavedBirthdayRow;
      } else {
        const retryInsert = await withRateLimitRetry(async () => {
          return await supabase!
            .from('birthday_pages')
            .insert({
              id: cleanConfig.id,
              slug: cleanSlug,
              user_id: user.id,
              recipient_name: cleanConfig.recipientName || 'Friend',
              is_published: cleanConfig.isPublished ?? false,
              config: cleanConfig,
              created_at: cleanConfig.createdAt || new Date().toISOString(),
              updated_at: cleanConfig.updatedAt
            })
            .select('id, slug, is_published, user_id, config, recipient_name, updated_at')
            .single();
        }, 2, 800);
        error = retryInsert.error;
        savedRow = (retryInsert.data as unknown) as SavedBirthdayRow;
      }
    }

    if (error) {
      console.error('Supabase save error:', error);
      return { success: false, error: error.message };
    }

    if (!savedRow) {
      return { success: false, error: 'Database did not return a confirmed saved row.' };
    }

    // Requirement 4: Check actual database response after saving
    // Verify slug, is_published, user_id, and config from the database row
    cleanConfig.id = savedRow.id;
    cleanConfig.slug = savedRow.slug;
    cleanConfig.isPublished = savedRow.is_published;
    cleanConfig.userId = savedRow.user_id;
    cleanConfig.updatedAt = savedRow.updated_at;
    cleanConfig.recipientName = savedRow.recipient_name || cleanConfig.recipientName;

    // Synchronize in-memory cache so subsequent reads do not trigger duplicate network queries
    const entry: CacheEntry = { config: cleanConfig, timestamp: Date.now() };
    remotePageCache.set(cleanConfig.id, entry);
    if (cleanConfig.slug) {
      remotePageCache.set(cleanConfig.slug, entry);
      remotePageCache.set(cleanConfig.slug.toLowerCase(), entry);
    }

    return { success: true, config: cleanConfig };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error saving to Supabase';
    console.error('Failed to save to Supabase:', err);
    return { success: false, error: message };
  }
}

/**
 * Deletes a birthday page from Supabase (RLS ensures user can only delete their own)
 */
export async function deleteRemoteBirthdayPage(id: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' };
  try {
    invalidateRemotePageCache(id);
    const { error } = await withRateLimitRetry(async () => {
      return await supabase!
        .from('birthday_pages')
        .delete()
        .eq('id', id);
    }, 3, 1000);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown delete error';
    return { success: false, error: message };
  }
}

export interface MediaUploadResult {
  url: string | null;
  error?: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Upload a media file (Image, Audio, or Video) to Supabase Storage bucket 'birthday-media'
 * with validation, size limits, user path isolation, and rate-limit retry
 */
export async function uploadRemoteMedia(
  file: File | Blob,
  folder: 'images' | 'audios' | 'videos' = 'images',
  customFilename?: string
): Promise<MediaUploadResult> {
  // 1. Validate file sizes immediately before network
  if (folder === 'images' && file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: `Image file exceeds maximum limit of 10MB (Current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` };
  }
  if (folder === 'audios' && file.size > MAX_AUDIO_BYTES) {
    return { url: null, error: `Audio file exceeds maximum limit of 25MB (Current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` };
  }
  if (folder === 'videos' && file.size > MAX_VIDEO_BYTES) {
    return { url: null, error: `Video file exceeds maximum limit of 50MB (Current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)` };
  }

  if (!supabase) {
    return { url: null, error: supabaseConfigError || 'Supabase not configured' };
  }

  try {
    const user = await getCurrentUser();
    const bucket = 'birthday-media';
    const originalName = customFilename || (file instanceof File ? file.name : `media-${Date.now()}`);
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    
    // Store in creator or user-scoped path for clean storage management
    const scopePrefix = user ? user.id : 'creator';
    const path = `${scopePrefix}/${folder}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await withRateLimitRetry(async () => {
      return await supabase!.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined
        });
    }, 3, 1200);

    if (uploadError) {
      console.error('Upload error to Supabase bucket:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { url: data.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Media upload failed:', err);
    return { url: null, error: message };
  }
}
