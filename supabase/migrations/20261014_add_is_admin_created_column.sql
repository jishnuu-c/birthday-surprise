-- ==============================================================================
-- Birthday Magic — Add is_admin_created and Payment Columns Migration
-- ==============================================================================
--
-- This migration safely adds:
-- 1. is_admin_created BOOLEAN NOT NULL DEFAULT FALSE to public.birthday_pages
-- 2. is_paid BOOLEAN NOT NULL DEFAULT FALSE to public.birthday_pages
-- 3. payment_id TEXT to public.birthday_pages
-- 4. Ensures public.surprise_edit_tokens, public.payments, and public.admin_users tables exist
-- 5. Reloads PostgREST schema cache so columns are immediately visible to clients
--
-- Preservation Guarantee:
-- - Uses ADD COLUMN IF NOT EXISTS (never modifies or drops existing data)
-- - Preserves all existing records in public.birthday_pages
-- - Backfills is_paid = true for all already-published pages
-- ==============================================================================

-- 1. Safely add is_admin_created and payment tracking columns to birthday_pages
ALTER TABLE public.birthday_pages 
ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.birthday_pages 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.birthday_pages 
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- 2. Preserve existing published surprises by marking them is_paid = true
UPDATE public.birthday_pages
SET is_paid = true
WHERE is_published = true;

-- 3. Create surprise_edit_tokens table if not exists (for secure editing tokens)
CREATE TABLE IF NOT EXISTS public.surprise_edit_tokens (
    surprise_id TEXT PRIMARY KEY REFERENCES public.birthday_pages(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.surprise_edit_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all public reads on edit tokens" ON public.surprise_edit_tokens;
CREATE POLICY "Deny all public reads on edit tokens"
ON public.surprise_edit_tokens
FOR SELECT
TO anon
USING (false);

-- 4. Create payments table if not exists
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surprise_id TEXT REFERENCES public.birthday_pages(id) ON DELETE SET NULL,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL DEFAULT 4000,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public select on payments" ON public.payments;
CREATE POLICY "Deny public select on payments"
ON public.payments
FOR SELECT
TO anon
USING (false);

-- 5. Create admin_users table if not exists
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to check own admin status" ON public.admin_users;
CREATE POLICY "Allow authenticated users to check own admin status"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 6. Auto-enroll existing admin account from auth.users (matches admin@gmail.com)
INSERT INTO public.admin_users (id, email)
SELECT id, email 
FROM auth.users
WHERE lower(email) IN (lower('admin@gmail.com'), lower('jishnuachu951@gmail.com'))
ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id;

-- 7. Assign admin role in auth.users app_metadata
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE lower(email) IN (lower('admin@gmail.com'), lower('jishnuachu951@gmail.com'));

-- 8. Create or update public.is_admin() helper function
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

-- 9. Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
