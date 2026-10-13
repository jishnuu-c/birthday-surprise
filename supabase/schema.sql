-- ==============================================================================
-- Birthday Magic — Production Database Schema & Security Policies (Supabase)
-- ==============================================================================
--
-- INSTRUCTIONS FOR DEPLOYMENT:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" tab.
-- 3. Paste and run this script. It is completely idempotent and safe to rerun.
-- 4. Never use the "service_role" secret key in client-side code or Vite env vars!
--    Only use the public "anon" / "publishable" key.
--
-- ==============================================================================

-- 1. Create birthday_pages table (Preserves existing table and all stored rows)
CREATE TABLE IF NOT EXISTS public.birthday_pages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add user_id column if table already existed without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'birthday_pages' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.birthday_pages ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_birthday_pages_slug ON public.birthday_pages(slug);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_user_id ON public.birthday_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_published ON public.birthday_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_updated_at ON public.birthday_pages(updated_at DESC);

-- 3. Enable Row Level Security (RLS) on birthday_pages
ALTER TABLE public.birthday_pages ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies before re-creating (ensures idempotent rerun)
DROP POLICY IF EXISTS "Public read access for published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Allow creator inserts and updates" ON public.birthday_pages;
DROP POLICY IF EXISTS "Published pages are publicly readable or owner can read own drafts" ON public.birthday_pages;
DROP POLICY IF EXISTS "Authenticated users can create their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can update their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can delete their own birthday pages" ON public.birthday_pages;

-- 4. Secure RLS Policies for birthday_pages:

-- (A) SELECT: Anyone can view published pages. Authenticated owners can read their own drafts and published pages.
CREATE POLICY "Published pages are publicly readable or owner can read own drafts"
ON public.birthday_pages
FOR SELECT
USING (
    is_published = true 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- (B) INSERT: Authenticated users can only insert pages they own.
CREATE POLICY "Authenticated users can create their own birthday pages"
ON public.birthday_pages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- (C) UPDATE: Owners can only update pages they own (or claim unowned legacy pages).
CREATE POLICY "Users can update their own birthday pages"
ON public.birthday_pages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- (D) DELETE: Owners can only delete pages they own.
CREATE POLICY "Users can delete their own birthday pages"
ON public.birthday_pages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. Supabase Storage Setup: 'birthday-media' bucket
-- ==============================================================================

-- Create public storage bucket for photos, audios, and video messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'birthday-media', 
    'birthday-media', 
    true,
    52428800, -- 50MB maximum file size limit
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/aac', 'audio/webm', 'audio/webm;codecs=opus', 'audio/flac',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/aac', 'audio/webm', 'audio/webm;codecs=opus', 'audio/flac',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'
    ]::text[];

-- Clean up any existing storage policies before re-creating
DROP POLICY IF EXISTS "Public Access for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Public read for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete birthday media" ON storage.objects;

-- (A) SELECT: Anyone can read media from the public birthday-media bucket
CREATE POLICY "Public read for birthday media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'birthday-media');

-- (B) INSERT: Authenticated users can only upload media inside their own user-ID folder
CREATE POLICY "Authenticated users can upload birthday media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'birthday-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- (C) UPDATE: Authenticated users can only update media inside their own user-ID folder
CREATE POLICY "Authenticated users can update birthday media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'birthday-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'birthday-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- (D) DELETE: Authenticated users can only delete media inside their own user-ID folder
CREATE POLICY "Authenticated users can delete birthday media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'birthday-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
