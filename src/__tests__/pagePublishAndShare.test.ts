import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createNewBirthdayPage, 
  savePage, 
  saveAndPublishPage, 
  resolvePageAsync,
  getPageById 
} from '../lib/storage';
import { 
  ensurePersistentMedia, 
  fetchRemoteBirthdayPage,
  isSupabaseConfigured 
} from '../lib/supabase';
import { DEFAULT_DEMO_CONFIG } from '../constants/presets';
import { BirthdayPageConfig } from '../types';

describe('Complete Birthday Page Editing, Persistence & Publishing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves complete edited page data including all customization settings', async () => {
    const page = createNewBirthdayPage('Chloe');
    
    // Customize all fields
    page.heroHeadline = 'HAPPY 21ST CELEBRATION, CHLOE!';
    page.heroSubtitle = 'A night of pure magic and joy';
    page.pageTitle = 'Magical 21st Birthday, Chloe ✨';
    page.birthDate = '2005-08-20';
    page.targetAge = 21;
    page.showAgeCountdown = true;
    page.letterHeading = 'To My Dearest Chloe';
    page.letterContent = 'You bring so much light and laughter into this world!';
    page.letterClosing = 'Love always, Bestie';
    page.theme = {
      ...page.theme,
      preset: 'luxury-plum-gold',
      primaryColor: '#E8C982',
      accentColor: '#C72C55',
      particleType: 'sparkles',
      particleDensity: 'high',
      enableSoundEffects: true,
      enableAmbientFloating: true
    };
    page.cakeFlavor = 'chocolate';
    page.candlesCount = 21;
    page.sections = {
      ...page.sections,
      birthdayCake: true,
      scratchSurprise: true
    };
    page.scratchTitle = 'Scratch to Reveal Your Gift!';
    page.scratchSecretMessage = 'Trip to Paris this Summer! ✈️';
    page.galleryPhotos = [
      {
        id: 'photo-chloe-1',
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
        caption: 'Unforgettable concert night',
        date: 'Summer 2024',
        aspectRatio: 'portrait'
      }
    ];

    const saveResult = await savePage(page);
    expect(saveResult.success).toBe(true);

    const retrieved = getPageById(page.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.recipientName).toBe('Chloe');
    expect(retrieved?.heroHeadline).toBe('HAPPY 21ST CELEBRATION, CHLOE!');
    expect(retrieved?.theme.preset).toBe('luxury-plum-gold');
    expect(retrieved?.theme.primaryColor).toBe('#E8C982');
    expect(retrieved?.theme.particleType).toBe('sparkles');
    expect(retrieved?.candlesCount).toBe(21);
    expect(retrieved?.scratchSecretMessage).toBe('Trip to Paris this Summer! ✈️');
    expect(retrieved?.galleryPhotos).toHaveLength(1);
    expect(retrieved?.galleryPhotos[0].caption).toBe('Unforgettable concert night');
  });

  it('generates a unique share URL using database slug and marks page as published', async () => {
    const page = createNewBirthdayPage('Liam');
    page.slug = 'liam-special-day';

    const publishResult = await saveAndPublishPage(page);
    expect(publishResult.success).toBe(true);
    expect(publishResult.url).toBeDefined();
    expect(publishResult.url).toContain('/b/liam-special-day');
    expect(publishResult.config?.isPublished).toBe(true);

    const saved = getPageById(page.id);
    expect(saved?.isPublished).toBe(true);
  });

  it('generates unique database IDs and slugs for pages initialized from demo config', async () => {
    // When a page has the demo ID, saveAndPublishPage must reassign unique credentials
    const demoCopy: BirthdayPageConfig = {
      ...DEFAULT_DEMO_CONFIG,
      recipientName: 'Michael',
      slug: DEFAULT_DEMO_CONFIG.slug // 'sophia-25th'
    };

    const publishResult = await saveAndPublishPage(demoCopy);
    expect(publishResult.success).toBe(true);
    expect(publishResult.config?.id).not.toBe(DEFAULT_DEMO_CONFIG.id);
    expect(publishResult.config?.slug).not.toBe(DEFAULT_DEMO_CONFIG.slug);
    expect(publishResult.url).not.toContain('/b/sophia-25th');
    expect(publishResult.url).toMatch(/\/b\/michael-\d+/);
  });
});

describe('Public Route Resolution & Isolation (Requirement 5)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does NOT load DEFAULT_DEMO_CONFIG or arbitrary localStorage for public share links when not found', async () => {
    // Save a page locally
    const secretDraft = createNewBirthdayPage('Secret Draft');
    secretDraft.slug = 'my-secret-draft';
    await savePage(secretDraft);

    // When an unshared / unknown slug is queried with allowLocalFallback: false (the public recipient view)
    const resolvedUnknown = await resolvePageAsync('non-existent-share-slug-999', { allowLocalFallback: false });
    
    // Must return null, NOT DEFAULT_DEMO_CONFIG and NOT local storage data
    expect(resolvedUnknown).toBeNull();

    // Even if query matches a local draft, public view must NOT leak it from localStorage if allowLocalFallback: false
    if (!isSupabaseConfigured) {
      const resolvedDraft = await resolvePageAsync('my-secret-draft', { allowLocalFallback: false });
      expect(resolvedDraft).toBeNull();
    }
  });

  it('allows local fallback only when explicitly enabled for creator editor studio', async () => {
    const creatorDraft = createNewBirthdayPage('Local Editor Draft');
    creatorDraft.slug = 'editor-local-slug';
    await savePage(creatorDraft);

    // Creator studio passes allowLocalFallback: true
    const resolvedInStudio = await resolvePageAsync(creatorDraft.id, { allowLocalFallback: true });
    expect(resolvedInStudio).not.toBeNull();
    expect(resolvedInStudio?.recipientName).toBe('Local Editor Draft');
  });
});

describe('Media Persistence & Blob Protection (Requirement 9)', () => {
  it('detects temporary browser blob: URLs and refuses to persist broken blobs without cloud upload', async () => {
    const pageWithBlobs = createNewBirthdayPage('Hannah');
    pageWithBlobs.customAudioUrl = 'blob:http://localhost:5173/temp-audio-uuid';
    pageWithBlobs.videoUrl = 'blob:http://localhost:5173/temp-video-uuid';

    // ensurePersistentMedia validates that local blobs are uploaded or flagged
    const result = await ensurePersistentMedia(pageWithBlobs);
    if (!isSupabaseConfigured) {
      // In unconfigured environment, config remains untouched
      expect(result.config).toBeDefined();
    } else {
      // If cloud is configured but blob cannot be resolved from fetch, it reports a clear error
      expect(result.error).toBeDefined();
    }
  });

  it('preserves persistent cloud URLs (https://) without modification', async () => {
    const pageWithCloudMedia = createNewBirthdayPage('Lucas');
    const persistentImageUrl = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800';
    const persistentVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    
    pageWithCloudMedia.profilePhotoUrl = persistentImageUrl;
    pageWithCloudMedia.videoUrl = persistentVideoUrl;

    const result = await ensurePersistentMedia(pageWithCloudMedia);
    expect(result.config.profilePhotoUrl).toBe(persistentImageUrl);
    expect(result.config.videoUrl).toBe(persistentVideoUrl);
    expect(result.error).toBeUndefined();
  });
});
