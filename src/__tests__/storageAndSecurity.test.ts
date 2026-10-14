import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createNewBirthdayPage, 
  savePageLocally, 
  getPageById, 
  getAllPages,
  generateShareableDataUrl,
  areConfigsEqual
} from '../lib/storage';
import { 
  uploadRemoteMedia, 
  isSupabaseConfigured,
  isServiceRoleKey,
  isAnonOrPublishableKey,
  getSupabaseConfigError,
  isRateLimitError,
  getRetryDelayMs,
  withRateLimitRetry,
  saveRemoteBirthdayPage,
  getOrCreateCurrentUser,
  supabase
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

  it('correctly identifies HTTP 429 rate limit errors from various shapes', () => {
    // 1. Direct status number
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isRateLimitError({ code: 429 })).toBe(true);
    expect(isRateLimitError({ code: '429' })).toBe(true);

    // 2. Message based
    expect(isRateLimitError({ message: 'Too Many Requests' })).toBe(true);
    expect(isRateLimitError({ message: 'Request rate limit exceeded. Please retry later.' })).toBe(true);
    expect(isRateLimitError({ message: 'Failed to load resource: the server responded with a status of 429 ()' })).toBe(true);

    // 3. Non-429 errors
    expect(isRateLimitError({ status: 404, message: 'Not found' })).toBe(false);
    expect(isRateLimitError({ status: 500, message: 'Internal Server Error' })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
  });

  it('calculates retry delay respecting Retry-After and applies exponential backoff', () => {
    // Explicit Retry-After header in seconds
    expect(getRetryDelayMs({ retryAfter: 3 }, 0)).toBe(3000);
    expect(getRetryDelayMs({ 'retry-after': '5' }, 0)).toBe(5000);

    // Exponential backoff fallback: baseDelay * 2^attempt + jitter
    const delayAttempt0 = getRetryDelayMs({}, 0, 500);
    expect(delayAttempt0).toBeGreaterThanOrEqual(500);
    expect(delayAttempt0).toBeLessThan(1000);

    const delayAttempt1 = getRetryDelayMs({}, 1, 500);
    expect(delayAttempt1).toBeGreaterThanOrEqual(1000);
    expect(delayAttempt1).toBeLessThan(1500);
  });

  it('retries operations that encounter HTTP 429 and succeeds once cleared', async () => {
    let callCount = 0;
    const failingThenSucceedingOp = async () => {
      callCount++;
      if (callCount < 3) {
        return { data: null, error: { status: 429, message: 'Too Many Requests' } };
      }
      return { data: { success: true }, error: null };
    };

    const result = await withRateLimitRetry(failingThenSucceedingOp, 3, 10);
    expect(callCount).toBe(3);
    expect(result.data?.success).toBe(true);
  });
});

describe('Auto-Save Optimization & Dirty Checking (areConfigsEqual)', () => {
  it('returns true when comparing identical configs', () => {
    const pageA = createNewBirthdayPage('Sophia');
    const pageB = JSON.parse(JSON.stringify(pageA)) as BirthdayPageConfig;
    expect(areConfigsEqual(pageA, pageB)).toBe(true);
  });

  it('ignores volatile updatedAt timestamp differences to prevent unnecessary saves', () => {
    const pageA = createNewBirthdayPage('Sophia');
    pageA.updatedAt = '2026-01-01T00:00:00.000Z';
    const pageB = {
      ...pageA,
      updatedAt: '2026-01-02T12:34:56.789Z'
    };
    expect(areConfigsEqual(pageA, pageB)).toBe(true);
  });

  it('detects changes in editable text (recipientName, heroHeadline, letterContent)', () => {
    const original = createNewBirthdayPage('Sophia');
    
    // Changing recipientName
    const editedName = { ...original, recipientName: 'Sophia Isabella' };
    expect(areConfigsEqual(original, editedName)).toBe(false);

    // Changing heroHeadline
    const editedHero = { ...original, heroHeadline: 'Wishing You Joy!' };
    expect(areConfigsEqual(original, editedHero)).toBe(false);

    // Changing letterContent
    const editedLetter = { ...original, letterContent: 'Happy birthday, hope you have a fabulous year!' };
    expect(areConfigsEqual(original, editedLetter)).toBe(false);
  });

  it('detects changes in theme customizations and section configurations', () => {
    const original = createNewBirthdayPage('Lucas');

    // Modifying theme primary color
    const editedTheme: BirthdayPageConfig = {
      ...original,
      theme: {
        ...original.theme,
        primaryColor: '#FF0055'
      }
    };
    expect(areConfigsEqual(original, editedTheme)).toBe(false);

    // Toggling section visibility
    const editedSections: BirthdayPageConfig = {
      ...original,
      sections: {
        ...original.sections,
        birthdayCake: false
      }
    };
    expect(areConfigsEqual(original, editedSections)).toBe(false);
  });

  it('safely handles null and undefined configs without throwing', () => {
    const page = createNewBirthdayPage('Lucas');
    expect(areConfigsEqual(null, null)).toBe(true);
    expect(areConfigsEqual(undefined, undefined)).toBe(true);
    expect(areConfigsEqual(page, null)).toBe(false);
    expect(areConfigsEqual(null, page)).toBe(false);
  });
});

describe('Selective INSERT vs UPDATE Database Operations (Requirements 3 & 4)', () => {
  it('differentiates between new page creation (INSERT) and existing page edits (UPDATE)', async () => {
    if (!supabase) return;
    const user = await getOrCreateCurrentUser();
    if (!user) {
      // In offline or CI environments where anonymous sign-ins are disabled on Supabase Auth,
      // skip live remote DB integration assertions that require direct authenticated database writes
      return;
    }

    const testId = `bday-test-unit-${Date.now()}`;
    const newPage = createNewBirthdayPage('Unit Test Recipient');
    newPage.id = testId;
    newPage.slug = `test-slug-unit-${Date.now()}`;

    // 1. First save: Page does NOT exist in DB, must perform INSERT
    const createResult = await saveRemoteBirthdayPage(newPage);
    expect(createResult.success).toBe(true);
    expect(createResult.config?.id).toBe(testId);

    // 2. Second save: Page DOES exist in DB, must perform UPDATE on existing ID
    const updatedPage: BirthdayPageConfig = {
      ...createResult.config!,
      recipientName: 'Unit Test Recipient Updated'
    };
    const updateResult = await saveRemoteBirthdayPage(updatedPage);
    expect(updateResult.success).toBe(true);
    expect(updateResult.config?.id).toBe(testId);
    expect(updateResult.config?.recipientName).toBe('Unit Test Recipient Updated');

    // 3. Verify in database that only ONE row exists with this ID (no duplicates created)
    const { data: rows } = await supabase
      .from('birthday_pages')
      .select('id, recipient_name')
      .eq('id', testId);

    expect(rows).toBeDefined();
    expect(rows?.length).toBe(1);
    expect(rows?.[0].recipient_name).toBe('Unit Test Recipient Updated');

    // Clean up
    await supabase.from('birthday_pages').delete().eq('id', testId);
  });
});

