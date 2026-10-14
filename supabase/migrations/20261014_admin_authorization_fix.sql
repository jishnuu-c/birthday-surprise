-- ==============================================================================
-- Birthday Magic — Admin Authorization & RLS Fix Migration
-- ==============================================================================
--
-- This migration fixes the admin authorization issue by:
-- 1. Adding the missing SELECT RLS policy on public.admin_users so authenticated
--    users can check their own admin status without being blocked by RLS.
-- 2. Upgrading public.is_admin() to support:
--    - Direct check in admin_users by UUID (id = auth.uid())
--    - Direct check in admin_users by email (lower(email) = lower(auth.jwt() ->> 'email'))
--    - Supabase app_metadata role (raw_app_meta_data ->> 'role' = 'admin')
--    - Supabase app_metadata is_admin boolean
-- 3. Providing safe auto-enrollment for existing auth.users.
--
-- ==============================================================================

-- 1. Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Add SELECT policy for authenticated users
-- Without this policy, any client query on admin_users returns empty or 403 due to RLS default-deny!
DROP POLICY IF EXISTS "Allow authenticated users to check own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Allow users to read own admin record" ON public.admin_users;

CREATE POLICY "Allow authenticated users to check own admin status"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 3. Upgrade public.is_admin() function
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
    -- Check Supabase app_metadata (tamper-proof, set via Supabase Dashboard / API)
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  ) OR (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
    -- Authorized administrator email
    lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      lower('admin@gmail.com'),
      lower('jishnuachu951@gmail.com')
    )
  );
$$;

-- 4. Assign admin role in auth.users app_metadata (tamper-proof database role)
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE lower(email) IN (lower('admin@gmail.com'), lower('jishnuachu951@gmail.com'));

-- 5. Auto-enrollment query into public.admin_users table:
-- Automatically registers existing admin account from auth.users using its actual UUID (id)
INSERT INTO public.admin_users (id, email)
SELECT id, email 
FROM auth.users
WHERE email IS NOT NULL 
  AND (
    lower(email) IN (lower('admin@gmail.com'), lower('jishnuachu951@gmail.com'))
    OR (raw_app_meta_data ->> 'role') = 'admin'
    OR (raw_app_meta_data ->> 'is_admin')::boolean = true
  )
ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id;
