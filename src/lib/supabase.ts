import { createClient } from '@supabase/supabase-js';
import { BirthdayPageConfig } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export async function fetchRemoteBirthdayPage(slugOrId: string): Promise<BirthdayPageConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('birthday_pages')
      .select('config')
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      console.warn('Supabase fetch notice:', error?.message);
      return null;
    }
    return data.config as BirthdayPageConfig;
  } catch (err) {
    console.warn('Failed to query Supabase:', err);
    return null;
  }
}

export async function saveRemoteBirthdayPage(config: BirthdayPageConfig): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase credentials not configured' };
  try {
    const { error } = await supabase
      .from('birthday_pages')
      .upsert({
        id: config.id,
        slug: config.slug,
        recipient_name: config.recipientName,
        is_published: config.isPublished,
        config: config,
        updated_at: new Date().toISOString()
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

export interface MediaUploadResult {
  url: string | null;
  error?: string;
}

/**
 * Upload a media file (Image, Audio, or Video) to Supabase Storage bucket 'birthday-media'
 */
export async function uploadRemoteMedia(
  file: File | Blob,
  folder: 'images' | 'audios' | 'videos' = 'images',
  customFilename?: string
): Promise<MediaUploadResult> {
  if (!supabase) {
    return { url: null, error: 'Supabase not configured' };
  }

  try {
    const bucket = 'birthday-media';
    const originalName = customFilename || (file instanceof File ? file.name : `file-${Date.now()}`);
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const path = `${folder}/${Date.now()}-${cleanName}`;

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

