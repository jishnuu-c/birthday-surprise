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

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create birthday_pages table (Preserves existing table and all stored rows)
CREATE TABLE IF NOT EXISTS public.birthday_pages (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    payment_id TEXT,
    is_admin_created BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add columns if table already existed without them
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

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'birthday_pages' 
          AND column_name = 'is_paid'
    ) THEN
        ALTER TABLE public.birthday_pages ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'birthday_pages' 
          AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.birthday_pages ADD COLUMN payment_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'birthday_pages' 
          AND column_name = 'is_admin_created'
    ) THEN
        ALTER TABLE public.birthday_pages ADD COLUMN is_admin_created BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Preserve all existing published pages
UPDATE public.birthday_pages
SET is_paid = true
WHERE is_published = true AND is_paid = false;

-- 2. Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_birthday_pages_slug ON public.birthday_pages(slug);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_user_id ON public.birthday_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_published ON public.birthday_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_paid ON public.birthday_pages(is_paid);
CREATE INDEX IF NOT EXISTS idx_birthday_pages_updated_at ON public.birthday_pages(updated_at DESC);

-- 3. Secret Edit Tokens Table (SHA-256 Hashed Tokens)
CREATE TABLE IF NOT EXISTS public.surprise_edit_tokens (
    surprise_id TEXT PRIMARY KEY REFERENCES public.birthday_pages(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.surprise_edit_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Payments Table (Razorpay ₹40 transactions)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surprise_id TEXT REFERENCES public.birthday_pages(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL DEFAULT 4000, -- 4000 paise = ₹40
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created', -- 'created', 'paid', 'failed', 'cancelled'
    customer_email TEXT,
    customer_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_surprise_id ON public.payments(surprise_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check their own admin status in admin_users
DROP POLICY IF EXISTS "Allow authenticated users to check own admin status" ON public.admin_users;
CREATE POLICY "Allow authenticated users to check own admin status"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Admin check helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() 
       OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) OR (
    -- Check Supabase app_metadata
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  ) OR (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  ) OR (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      lower('admin@gmail.com'),
      lower('jishnuachu951@gmail.com')
    )
  );
$$;

-- 6. Row Level Security Policies

-- surprise_edit_tokens: Public CANNOT read tokens under any circumstances!
DROP POLICY IF EXISTS "Deny all public reads on edit tokens" ON public.surprise_edit_tokens;
DROP POLICY IF EXISTS "Admins can view edit tokens" ON public.surprise_edit_tokens;

CREATE POLICY "Deny all public reads on edit tokens"
ON public.surprise_edit_tokens
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Admins can view edit tokens"
ON public.surprise_edit_tokens
FOR SELECT
TO authenticated
USING (public.is_admin());

-- payments: Only admin can read payment records
DROP POLICY IF EXISTS "Deny public select on payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view payments" ON public.payments;

CREATE POLICY "Deny public select on payments"
ON public.payments
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Admins can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_admin());

-- birthday_pages:
ALTER TABLE public.birthday_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Allow creator inserts and updates" ON public.birthday_pages;
DROP POLICY IF EXISTS "Published pages are publicly readable or owner can read own drafts" ON public.birthday_pages;
DROP POLICY IF EXISTS "Authenticated users can create their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can update their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can delete their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Anyone can read published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Admins can manage all birthday pages" ON public.birthday_pages;

-- Anyone can view published pages (public visitors never need login)
CREATE POLICY "Anyone can read published birthday pages"
ON public.birthday_pages
FOR SELECT
USING (
    is_published = true 
    OR public.is_admin()
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Admin can manage all birthday pages
CREATE POLICY "Admins can manage all birthday pages"
ON public.birthday_pages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. Secure Functions for Token-based Editing and Verification

CREATE OR REPLACE FUNCTION public.verify_edit_token(p_surprise_id TEXT, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_input_hash TEXT;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN false;
    END IF;

    IF public.is_admin() THEN
        RETURN true;
    END IF;

    SELECT token_hash INTO v_stored_hash
    FROM public.surprise_edit_tokens
    WHERE surprise_id = p_surprise_id;

    IF v_stored_hash IS NULL THEN
        RETURN false;
    END IF;

    v_input_hash := encode(digest(p_token, 'sha256'), 'hex');
    RETURN v_stored_hash = v_input_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_surprise_with_token(
    p_id TEXT,
    p_token TEXT,
    p_slug TEXT,
    p_recipient_name TEXT,
    p_config JSONB,
    p_is_published BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_authorized BOOLEAN;
    v_updated_at TIMESTAMPTZ := timezone('utc'::text, now());
    v_is_pub BOOLEAN;
BEGIN
    v_authorized := public.verify_edit_token(p_id, p_token);
    
    IF NOT v_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Invalid or missing edit token for this surprise');
    END IF;

    IF p_is_published IS NOT NULL THEN
        v_is_pub := p_is_published;
    ELSE
        SELECT is_published INTO v_is_pub FROM public.birthday_pages WHERE id = p_id;
    END IF;

    UPDATE public.birthday_pages
    SET slug = p_slug,
        recipient_name = p_recipient_name,
        config = p_config,
        is_published = coalesce(v_is_pub, false),
        updated_at = v_updated_at
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id, 'updated_at', v_updated_at);
END;
$$;

-- 8. Storage: 'birthday-media' bucket setup
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

DROP POLICY IF EXISTS "Public read for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete birthday media" ON storage.objects;

CREATE POLICY "Public read for birthday media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'birthday-media');

CREATE POLICY "Allow uploads for birthday media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'birthday-media');

CREATE POLICY "Admins can delete birthday media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'birthday-media' AND public.is_admin());
