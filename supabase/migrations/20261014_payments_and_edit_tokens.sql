-- ==============================================================================
-- Birthday Magic — Payments & Secure Edit Token Migration (Supabase)
-- ==============================================================================
--
-- Safe, idempotent migration to support:
-- 1. ₹40 Razorpay payment integration
-- 2. Secret Edit Access Tokens (hashed with SHA-256)
-- 3. Elimination of public user logins while preserving Admin Dashboard
-- 4. Backward-compatible preservation of all existing published birthday surprises
--
-- ==============================================================================

-- 1. Safely add is_paid and payment_id columns to birthday_pages
DO $$
BEGIN
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

-- Backfill: All existing published pages before this migration are marked is_paid = true
-- so no existing shared birthday link is ever locked or broken!
UPDATE public.birthday_pages
SET is_paid = true
WHERE is_published = true AND is_paid = false;

-- 2. Create surprise_edit_tokens table for unguessable edit access
-- NOTE: Plain tokens are NEVER stored in the database. Only sha256(token) is stored.
CREATE TABLE IF NOT EXISTS public.surprise_edit_tokens (
    surprise_id TEXT PRIMARY KEY REFERENCES public.birthday_pages(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on surprise_edit_tokens
ALTER TABLE public.surprise_edit_tokens ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Deny all public reads on edit tokens" ON public.surprise_edit_tokens;
DROP POLICY IF EXISTS "Admins can view edit tokens" ON public.surprise_edit_tokens;

-- Public visitors can NEVER select or view edit tokens under any circumstances!
CREATE POLICY "Deny all public reads on edit tokens"
ON public.surprise_edit_tokens
FOR SELECT
TO anon
USING (false);

-- 3. Create payments table to securely track Razorpay transactions
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surprise_id TEXT REFERENCES public.birthday_pages(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL DEFAULT 4000, -- ₹40 in paise (40 * 100)
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

DROP POLICY IF EXISTS "Deny public select on payments" ON public.payments;
CREATE POLICY "Deny public select on payments"
ON public.payments
FOR SELECT
TO anon
USING (false);

-- 4. Create admin_users table for administrator privileges
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin check helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ) OR (
    -- Allow configured admin email via auth token
    auth.jwt() ->> 'email' = 'admin@birthdaymagic.com'
  );
$$;

-- Allow admin full SELECT on payments
DROP POLICY IF EXISTS "Admins can view payments" ON public.payments;
CREATE POLICY "Admins can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Allow admin full SELECT on surprise_edit_tokens
CREATE POLICY "Admins can view edit tokens"
ON public.surprise_edit_tokens
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 5. Updated RLS on birthday_pages
DROP POLICY IF EXISTS "Public read access for published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Allow creator inserts and updates" ON public.birthday_pages;
DROP POLICY IF EXISTS "Published pages are publicly readable or owner can read own drafts" ON public.birthday_pages;
DROP POLICY IF EXISTS "Authenticated users can create their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can update their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Users can delete their own birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Anyone can read published birthday pages" ON public.birthday_pages;
DROP POLICY IF EXISTS "Admins can manage all birthday pages" ON public.birthday_pages;

-- Anyone can read published pages (or admin can read all drafts)
CREATE POLICY "Anyone can read published birthday pages"
ON public.birthday_pages
FOR SELECT
USING (
    is_published = true 
    OR public.is_admin()
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Admin can insert, update, delete anything
CREATE POLICY "Admins can manage all birthday pages"
ON public.birthday_pages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. Helper Security Functions for edit tokens (using pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify if an edit token matches the stored SHA-256 hash
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

    -- If caller is authenticated admin, allow access
    IF public.is_admin() THEN
        RETURN true;
    END IF;

    SELECT token_hash INTO v_stored_hash
    FROM public.surprise_edit_tokens
    WHERE surprise_id = p_surprise_id;

    IF v_stored_hash IS NULL THEN
        -- If page has no token (e.g. legacy page or admin page), check if user is admin
        RETURN false;
    END IF;

    v_input_hash := encode(digest(p_token, 'sha256'), 'hex');
    RETURN v_stored_hash = v_input_hash;
END;
$$;

-- Securely save/update a birthday surprise using the secret edit token
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
    -- Verify token or admin authorization
    v_authorized := public.verify_edit_token(p_id, p_token);
    
    IF NOT v_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Invalid or missing edit token for this surprise');
    END IF;

    -- Determine published state
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

-- 7. Media storage bucket policies for public creators
-- Allow upload into birthday-media without requiring public user account
DROP POLICY IF EXISTS "Public read for birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete birthday media" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads for birthday media" ON storage.objects;

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
