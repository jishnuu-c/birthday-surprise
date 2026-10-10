-- Birthday Magic Database Schema (Supabase PostgreSQL)

-- 1. Create birthday_pages table
CREATE TABLE IF NOT EXISTS public.birthday_pages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    recipient_name TEXT NOT NULL,
    is_published BOOLEAN DEFAULT false,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index on slug for fast lookup
CREATE INDEX IF NOT EXISTS idx_birthday_pages_slug ON public.birthday_pages(slug);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_published ON public.birthday_pages(is_published);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.birthday_pages ENABLE ROW LEVEL SECURITY;

-- 4. Policies:
-- Public can read published birthday pages without authentication
CREATE POLICY "Public read access for published birthday pages"
ON public.birthday_pages
FOR SELECT
USING (is_published = true);

-- Allow upsert for creator / editor
CREATE POLICY "Allow creator inserts and updates"
ON public.birthday_pages
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Storage bucket for uploaded birthday photos, audio, and videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-media', 'birthday-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies:
CREATE POLICY "Public Access for birthday media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'birthday-media');

CREATE POLICY "Allow public uploads for birthday media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'birthday-media');
