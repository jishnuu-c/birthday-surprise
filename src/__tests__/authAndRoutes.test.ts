import { describe, it, expect, beforeEach } from 'vitest';
import { fetchRemoteBirthdayPage, isSupabaseConfigured } from '../lib/supabase';
import { createNewBirthdayPage } from '../lib/storage';
import { parseAdminEmails } from '../context/AuthContext';
import { getAdminEmails, verifyAdminSession, verifyAdminAuth } from '../server/paymentHandlers';

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

describe('Admin Authorization & Allowlist Engine', () => {
  it('normalizes single and multiple admin emails with whitespace and case insensitivity', () => {
    const raw = '  Admin@BirthdayMagic.com,  Owner@DOMAIN.COM ; manager@test.org  ';
    const parsed = parseAdminEmails(raw);

    expect(parsed).toEqual(['admin@birthdaymagic.com', 'owner@domain.com', 'manager@test.org']);
    expect(parsed.includes('owner@domain.com')).toBe(true);
    expect(parsed.includes('admin@birthdaymagic.com')).toBe(true);
    expect(parsed.includes('notanadmin@domain.com')).toBe(false);
  });

  it('handles null, empty, and malformed email inputs safely', () => {
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails('')).toEqual([]);
    expect(parseAdminEmails('   ; ,  ')).toEqual([]);
    expect(parseAdminEmails('invalid-without-at-sign')).toEqual([]);
  });

  it('parses environment admin emails dynamically on the backend', () => {
    process.env.ADMIN_EMAIL = 'lead@company.com, CEO@Company.com ';
    const emails = getAdminEmails();

    expect(emails).toContain('lead@company.com');
    expect(emails).toContain('ceo@company.com');
  });

  it('verifies admin session via ADMIN_SECRET_KEY fallback', async () => {
    process.env.ADMIN_SECRET_KEY = 'secret_admin_token_xyz_123';

    const validRes = await verifyAdminSession('Bearer secret_admin_token_xyz_123');
    expect(validRes.authorized).toBe(true);

    const invalidRes = await verifyAdminSession('Bearer wrong_token_999');
    expect(invalidRes.authorized).toBe(false);
  });

  it('authorizes admin@gmail.com case-insensitively with whitespace trimmed', () => {
    process.env.ADMIN_EMAIL = '  Admin@Gmail.Com  ';
    const emails = getAdminEmails();

    expect(emails).toContain('admin@gmail.com');

    // Test case-insensitive lookup
    const testInput = '   ADMIN@GMAIL.COM   '.trim().toLowerCase();
    expect(emails.includes(testInput)).toBe(true);

    const unauthorizedInput = 'attacker@evil.com'.trim().toLowerCase();
    expect(emails.includes(unauthorizedInput)).toBe(false);
  });

  it('authorizes jishnuachu951@gmail.com case-insensitively with whitespace trimmed', () => {
    process.env.ADMIN_EMAIL = '  jishnuachu951@gmail.com  , admin@gmail.com ';
    const emails = getAdminEmails();

    expect(emails).toContain('jishnuachu951@gmail.com');
    expect(emails).toContain('admin@gmail.com');

    // Test case-insensitive lookup
    const testInput = '   JishnuAchu951@GMAIL.COM   '.trim().toLowerCase();
    expect(emails.includes(testInput)).toBe(true);

    const unauthorizedInput = 'attacker@evil.com'.trim().toLowerCase();
    expect(emails.includes(unauthorizedInput)).toBe(false);
  });

  it('rejects missing or empty authorization headers with clear error messages', async () => {
    const noHeaderRes = await verifyAdminSession(null);
    expect(noHeaderRes.authorized).toBe(false);
    expect(noHeaderRes.error).toBe('Missing Authorization header');

    const emptyHeaderRes = await verifyAdminSession('Bearer   ');
    expect(emptyHeaderRes.authorized).toBe(false);
    expect(emptyHeaderRes.error).toBe('Missing bearer token');
  });
});
