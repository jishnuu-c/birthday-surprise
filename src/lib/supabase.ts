import { createClient } from '@supabase/supabase-js';
import { BirthdayPageConfig } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
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
      console.warn('Supabase fetch error:', error?.message);
      return null;
    }
    return data.config as BirthdayPageConfig;
  } catch (err) {
    console.warn('Failed to query Supabase:', err);
    return null;
  }
}

export async function saveRemoteBirthdayPage(config: BirthdayPageConfig): Promise<boolean> {
  if (!supabase) return false;
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
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save to Supabase:', err);
    return false;
  }
}

export async function uploadRemoteMedia(file: File, path: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const bucket = 'birthday-media';
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error('Media upload failed:', err);
    return null;
  }
}
