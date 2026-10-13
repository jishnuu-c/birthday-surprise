import { createClient, User } from '@supabase/supabase-js';
import { BirthdayPageConfig } from '../types';
import { getMediaRecord } from './mediaDb';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-project') &&
  !rawUrl.includes('placeholder') &&
  !rawKey.includes('your-anon-key') &&
  !rawKey.includes('placeholder') &&
  rawUrl.startsWith('https://')
);

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
 * Get the currently authenticated user if one exists
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Fetch a single published birthday page (or a page owned by the current user) by slug or ID.
 * Never returns default demo data.
 */
export async function fetchRemoteBirthdayPage(slugOrId: string): Promise<BirthdayPageConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('id, slug, is_published, config, updated_at')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Supabase query returned error:', error.message);
      return null;
    }

    if (data && data.length > 0 && data[0].config) {
      const pageConfig = data[0].config as BirthdayPageConfig;
      // Guarantee synchronized isPublished, id, and slug values
      pageConfig.id = data[0].id || pageConfig.id;
      pageConfig.slug = data[0].slug || pageConfig.slug;
      pageConfig.isPublished = data[0].is_published ?? pageConfig.isPublished;
      pageConfig.updatedAt = data[0].updated_at || pageConfig.updatedAt;
      return pageConfig;
    }

    return null;
  } catch (err) {
    console.warn('Failed to query remote birthday page from Supabase:', err);
    return null;
  }
}

/**
 * Fetch all birthday pages owned by the currently authenticated user
 */
export async function fetchUserRemotePages(): Promise<BirthdayPageConfig[]> {
  if (!supabase) return [];
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('birthday_pages')
      .select('config, is_published, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

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
  config: BirthdayPageConfig
): Promise<{ success: boolean; error?: string; config?: BirthdayPageConfig }> {
  if (!supabase) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  try {
    let user = await getCurrentUser();

    // If user is not yet logged in, auto-initialize an anonymous session for secure ownership
    if (!user) {
      const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anonData.user) {
        return { 
          success: false, 
          error: `Authentication required: please sign in or create an account to save your birthday surprise to the cloud (${anonErr?.message || 'Guest session unavailable'}).` 
        };
      }
      user = anonData.user;
    }

    // Ensure all media URLs are persistent cloud storage URLs
    const mediaRes = await ensurePersistentMedia(config);
    if (mediaRes.error) {
      return { success: false, error: mediaRes.error };
    }

    const cleanConfig: BirthdayPageConfig = {
      ...mediaRes.config,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };

    // Sanitize slug
    let cleanSlug = (cleanConfig.slug || cleanConfig.recipientName || 'birthday')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/^-+|-+$/g, '') || cleanConfig.id;

    cleanConfig.slug = cleanSlug;

    // Perform upsert with full JSON configuration
    let { error } = await supabase
      .from('birthday_pages')
      .upsert({
        id: cleanConfig.id,
        slug: cleanSlug,
        user_id: user.id,
        recipient_name: cleanConfig.recipientName || 'Friend',
        is_published: cleanConfig.isPublished ?? false,
        config: cleanConfig,
        updated_at: cleanConfig.updatedAt
      }, { onConflict: 'id' });

    // Handle slug uniqueness constraint collision by appending unique suffix
    if (error && (error.message.includes('birthday_pages_slug_key') || error.code === '23505')) {
      cleanSlug = `${cleanSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      cleanConfig.slug = cleanSlug;
      const retryRes = await supabase
        .from('birthday_pages')
        .upsert({
          id: cleanConfig.id,
          slug: cleanSlug,
          user_id: user.id,
          recipient_name: cleanConfig.recipientName || 'Friend',
          is_published: cleanConfig.isPublished ?? false,
          config: cleanConfig,
          updated_at: cleanConfig.updatedAt
        }, { onConflict: 'id' });
      error = retryRes.error;
    }

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
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
    const { error } = await supabase
      .from('birthday_pages')
      .delete()
      .eq('id', id);

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
 * with validation, size limits, and user path isolation
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
    return { url: null, error: 'Supabase not configured' };
  }

  try {
    let user = await getCurrentUser();
    if (!user) {
      const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr || !anonData.user) {
        return { url: null, error: 'Authentication required for upload. Please sign in or use guest session.' };
      }
      user = anonData.user;
    }

    const bucket = 'birthday-media';
    const originalName = customFilename || (file instanceof File ? file.name : `media-${Date.now()}`);
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    
    // Store in user-scoped path for clean RLS management: userId/folder/timestamp-name
    const path = `${user.id}/${folder}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || undefined
      });

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
