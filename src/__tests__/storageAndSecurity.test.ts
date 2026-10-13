import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createNewBirthdayPage, 
  savePageLocally, 
  getPageById, 
  getAllPages,
  generateShareableDataUrl 
} from '../lib/storage';
import { 
  uploadRemoteMedia, 
  isSupabaseConfigured,
  isServiceRoleKey,
  isAnonOrPublishableKey,
  getSupabaseConfigError
} from '../lib/supabase';
import { BirthdayPageConfig } from '../types';

describe('Birthday Page Storage & Data Integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a new birthday page with valid unique slug and draft state', () => {
    const page = createNewBirthdayPage('Alexandra');

    expect(page.id).toMatch(/^bday-/);
    expect(page.slug).toMatch(/^alexandra-\d{4}$/);
    expect(page.recipientName).toBe('Alexandra');
    expect(page.isPublished).toBe(false);
    expect(page.pageTitle).toContain('Alexandra');
    expect(page.theme).toBeDefined();
    expect(page.sections).toBeDefined();
  });

  it('persists and retrieves birthday pages safely in local storage', () => {
    const page = createNewBirthdayPage('David');
    savePageLocally(page);

    const retrieved = getPageById(page.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.recipientName).toBe('David');
    expect(retrieved?.isPublished).toBe(false);

    // Can lookup by slug as well
    const bySlug = getPageById(page.slug);
    expect(bySlug).not.toBeNull();
    expect(bySlug?.id).toBe(page.id);
  });

  it('updates existing pages without duplicating records', () => {
    const page = createNewBirthdayPage('Elena');
    savePageLocally(page);

    const updated: BirthdayPageConfig = {
      ...page,
      recipientName: 'Elena Maria',
      isPublished: true
    };
    savePageLocally(updated);

    const retrieved = getPageById(page.id);
    expect(retrieved?.recipientName).toBe('Elena Maria');
    expect(retrieved?.isPublished).toBe(true);
  });

  it('generates a portable shareable data URL correctly without huge blobs', () => {
    const page = createNewBirthdayPage('Marcus');
    page.customAudioUrl = 'blob:http://localhost:5173/sample-blob-123';
    page.videoUrl = 'indexeddb:video-test';

    const shareUrl = generateShareableDataUrl(page);
    expect(shareUrl).toContain('/b/' + page.slug);
    expect(shareUrl).toContain('#data=');

    // Extract payload and verify
    const base64 = shareUrl.split('#data=')[1];
    const decoded = JSON.parse(decodeURIComponent(escape(atob(base64)))) as BirthdayPageConfig;
    expect(decoded.recipientName).toBe('Marcus');
    // Session-bound blob/indexeddb URLs should be stripped from zero-server export
    expect(decoded.customAudioUrl).toBe('');
    expect(decoded.videoUrl).toBe('');
  });
});

describe('Media Validation & Security Rules', () => {
  it('rejects oversized files exceeding security thresholds', async () => {
    // 15 MB fake image (exceeds 10 MB limit)
    const largeImage = new Blob([new Uint8Array(15 * 1024 * 1024)], { type: 'image/jpeg' });
    const imgRes = await uploadRemoteMedia(largeImage as File, 'images', 'big.jpg');
    expect(imgRes.url).toBeNull();
    expect(imgRes.error).toContain('Image file exceeds maximum limit of 10MB');

    // 30 MB fake audio (exceeds 25 MB limit)
    const largeAudio = new Blob([new Uint8Array(30 * 1024 * 1024)], { type: 'audio/mpeg' });
    const audioRes = await uploadRemoteMedia(largeAudio as File, 'audios', 'big.mp3');
    expect(audioRes.url).toBeNull();
    expect(audioRes.error).toContain('Audio file exceeds maximum limit of 25MB');

    // 60 MB fake video (exceeds 50 MB limit)
    const largeVideo = new Blob([new Uint8Array(60 * 1024 * 1024)], { type: 'video/mp4' });
    const videoRes = await uploadRemoteMedia(largeVideo as File, 'videos', 'big.mp4');
    expect(videoRes.url).toBeNull();
    expect(videoRes.error).toContain('Video file exceeds maximum limit of 50MB');
  });

  it('enforces secure configuration check when credentials are missing or placeholder', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('detects and strictly rejects service-role keys', () => {
    // 1. Modern secret key format
    expect(isServiceRoleKey('sb_secret_9999_fake_secret_key')).toBe(true);

    // 2. Keyword check
    expect(isServiceRoleKey('my_secret_service_role_key_value')).toBe(true);

    // 3. Fake JWT with role: "service_role"
    const fakeServiceJwtPayload = btoa(JSON.stringify({ role: 'service_role', exp: 9999999999 }));
    const fakeServiceJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeServiceJwtPayload}.signature`;
    expect(isServiceRoleKey(fakeServiceJwt)).toBe(true);

    // 4. Must not be accepted as an anon key
    expect(isAnonOrPublishableKey('sb_secret_9999')).toBe(false);
    expect(isAnonOrPublishableKey(fakeServiceJwt)).toBe(false);
  });

  it('accepts valid publishable and anon keys', () => {
    // 1. Modern publishable key format
    expect(isAnonOrPublishableKey('sb_publishable_N-D4agXYIn98PMG9w5Ljgg_kam3ly23')).toBe(true);
    expect(isServiceRoleKey('sb_publishable_N-D4agXYIn98PMG9w5Ljgg_kam3ly23')).toBe(false);

    // 2. Legacy JWT with role: "anon"
    const fakeAnonJwtPayload = btoa(JSON.stringify({ role: 'anon', exp: 9999999999 }));
    const fakeAnonJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeAnonJwtPayload}.signature`;
    expect(isAnonOrPublishableKey(fakeAnonJwt)).toBe(true);
    expect(isServiceRoleKey(fakeAnonJwt)).toBe(false);
  });

  it('produces clear descriptive error messages for missing or invalid environment variables', () => {
    // Missing both
    expect(getSupabaseConfigError('', '')).toContain('Missing Supabase configuration');

    // Missing URL
    expect(getSupabaseConfigError('', 'sb_publishable_123')).toContain('Missing Supabase URL');

    // Invalid non-https URL
    expect(getSupabaseConfigError('http://insecure.supabase.co', 'sb_publishable_123')).toContain('must start with "https://"');

    // Placeholder URL
    expect(getSupabaseConfigError('https://your-project.supabase.co', 'sb_publishable_123')).toContain('contains placeholder values');

    // Missing Key
    expect(getSupabaseConfigError('https://valid.supabase.co', '')).toContain('Missing Supabase API Key');

    // Placeholder Key
    expect(getSupabaseConfigError('https://valid.supabase.co', 'your-anon-key')).toContain('contains placeholder values');

    // Service-role key error
    expect(getSupabaseConfigError('https://valid.supabase.co', 'sb_secret_12345')).toContain('CRITICAL SECURITY ERROR');
  });
});
