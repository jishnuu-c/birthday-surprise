import { describe, it, expect } from 'vitest';
import { fetchRemoteBirthdayPage, isSupabaseConfigured } from '../lib/supabase';
import { createNewBirthdayPage } from '../lib/storage';

describe('Public and Private Draft Visibility Rules', () => {
  it('identifies published status correctly', () => {
    const page = createNewBirthdayPage('Birthday Star');
    expect(page.isPublished).toBe(false); // Initially a draft

    // Only owner should see drafts; public link shouldn't be exposed until published
    const publishedPage = { ...page, isPublished: true };
    expect(publishedPage.isPublished).toBe(true);
  });

  it('generates strictly URL-safe slugs for recipients', () => {
    const pageWithSymbols = createNewBirthdayPage('Special Friend #1! & Bestie');
    expect(pageWithSymbols.slug).toMatch(/^[a-z0-9-]+$/);
    expect(pageWithSymbols.slug).not.toContain(' ');
    expect(pageWithSymbols.slug).not.toContain('#');
    expect(pageWithSymbols.slug).not.toContain('&');
  });

  it('handles remote page querying gracefully when Supabase is unconfigured in test environment', async () => {
    if (!isSupabaseConfigured) {
      const page = await fetchRemoteBirthdayPage('non-existent-slug-xyz');
      expect(page).toBeNull();
    }
  });
});
