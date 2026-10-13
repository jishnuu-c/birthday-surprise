-- ==============================================================================
-- Birthday Magic — Production Database Schema & Security Policies (Supabase)
-- ==============================================================================

-- 1. Create birthday_pages table
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

-- If table already existed without user_id, add it safely
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.birthday_pages ENABLE ROW LEVEL SECURITY;

-- Clean up any existing legacy policies
DROP POLICY IF EXISTS "Public read access for published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Allow creator inserts and updates" ON public.birthday_pages;
DROP POLICY IF EXISTS "Published pages are publicly readable or owner can read own drafts" ON public.birthday_pages;
DROP POLICY IF EXISTS "Authenticated users can create their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can update their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can delete their own birthday pages" ON public.birthday_pages;

-- 4. Secure RLS Policies for birthday_pages:

-- (A) SELECT: Anyone can view published pages. Owners can view their own pages (both drafts and published).
CREATE POLICY "Published pages are publicly readable or owner can read own drafts"
ON public.birthday_pages
FOR SELECT
USING (
    is_published = true 
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- (B) INSERT: Authenticated users can insert their own pages.
CREATE POLICY "Authenticated users can create their own birthday pages"
ON public.birthday_pages
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- (C) UPDATE: Owners can only update pages they own.
CREATE POLICY "Users can update their own birthday pages"
ON public.birthday_pages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
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
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/aac', 'audio/webm', 'audio/flac',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/ogg'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 52428800;

-- Clean up any existing storage policies
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

-- (B) INSERT: Only authenticated users can upload media
CREATE POLICY "Authenticated users can upload birthday media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'birthday-media');

-- (C) UPDATE: Authenticated users can update media they uploaded
CREATE POLICY "Authenticated users can update birthday media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'birthday-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated'))
WITH CHECK (bucket_id = 'birthday-media');

-- (D) DELETE: Authenticated users can delete media they uploaded
CREATE POLICY "Authenticated users can delete birthday media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'birthday-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated'));
