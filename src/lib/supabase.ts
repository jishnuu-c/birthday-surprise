import { createClient, User } from '@supabase/supabase-js';
import { BirthdayPageConfig } from '../types';

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
 * Fetch a single published birthday page (or a page owned by the current user) by slug or ID
 */
export async function fetchRemoteBirthdayPage(slugOrId: string): Promise<BirthdayPageConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('config, is_published, updated_at')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Supabase query returned error:', error.message);
      return null;
    }

    if (data && data.length > 0 && data[0].config) {
      return data[0].config as BirthdayPageConfig;
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
      .select('config, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user pages:', error);
      return [];
    }

    if (!data) return [];
    return data.map((row) => row.config as BirthdayPageConfig).filter(Boolean);
  } catch (err) {
    console.error('Error in fetchUserRemotePages:', err);
    return [];
  }
}

/**
 * Persists a birthday page to Supabase with proper user ownership and RLS enforcement
 */
export async function saveRemoteBirthdayPage(config: BirthdayPageConfig): Promise<{ success: boolean; error?: string }> {
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
          error: `Please sign in or start a guest session to save pages to cloud: ${anonErr?.message || 'Authentication required'}` 
        };
      }
      user = anonData.user;
    }

    const payloadConfig: BirthdayPageConfig = {
      ...config,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };

    // Ensure ephemeral browser-only blob: or indexeddb: URLs are not saved to remote cloud DB
    const cleanConfig: BirthdayPageConfig = { ...payloadConfig };
    if (cleanConfig.customAudioUrl && (cleanConfig.customAudioUrl.startsWith('blob:') || cleanConfig.customAudioUrl.startsWith('indexeddb:'))) {
      cleanConfig.customAudioUrl = '';
    }
    if (cleanConfig.videoUrl && (cleanConfig.videoUrl.startsWith('blob:') || cleanConfig.videoUrl.startsWith('indexeddb:'))) {
      cleanConfig.videoUrl = '';
    }
    if (cleanConfig.voiceMessageUrl && (cleanConfig.voiceMessageUrl.startsWith('blob:') || cleanConfig.voiceMessageUrl.startsWith('indexeddb:'))) {
      cleanConfig.voiceMessageUrl = '';
    }

    const { error } = await supabase
      .from('birthday_pages')
      .upsert({
        id: cleanConfig.id,
        slug: cleanConfig.slug,
        user_id: user.id,
        recipient_name: cleanConfig.recipientName,
        is_published: cleanConfig.isPublished ?? false,
        config: cleanConfig,
        updated_at: cleanConfig.updatedAt
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
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
