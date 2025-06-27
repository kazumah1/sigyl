-- Nuclear Fix for Profiles Table 406 Error
-- This script completely disables RLS on the profiles table to test if that's the issue

-- 1. First, let's see what we're working with
SELECT '=== CURRENT STATE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check current RLS status
SELECT '=== RLS STATUS BEFORE ===' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. List all current RLS policies
SELECT '=== CURRENT RLS POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. NUCLEAR OPTION: Completely disable RLS on profiles table
SELECT '=== DISABLING RLS ===' as info;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 5. Drop all RLS policies
SELECT '=== DROPPING ALL RLS POLICIES ===' as info;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;

-- 6. Grant all permissions
SELECT '=== GRANTING PERMISSIONS ===' as info;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- 7. Ensure the auth_type and auth_user_id columns exist
SELECT '=== ENSURING COLUMNS EXIST ===' as info;
DO $$ 
BEGIN
    -- Add auth_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auth_type') THEN
        ALTER TABLE public.profiles ADD COLUMN auth_type TEXT DEFAULT 'supabase';
        RAISE NOTICE 'Added auth_type column to profiles table';
    ELSE
        RAISE NOTICE 'auth_type column already exists';
    END IF;
    
    -- Add auth_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auth_user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN auth_user_id TEXT;
        RAISE NOTICE 'Added auth_user_id column to profiles table';
    ELSE
        RAISE NOTICE 'auth_user_id column already exists';
    END IF;
END $$;

-- 8. Update existing profiles to have proper auth_type and auth_user_id
SELECT '=== UPDATING EXISTING PROFILES ===' as info;
UPDATE public.profiles 
SET auth_type = 'supabase', auth_user_id = id 
WHERE auth_type IS NULL OR auth_user_id IS NULL;

-- Update GitHub App profiles to have proper auth_type and auth_user_id
UPDATE public.profiles 
SET auth_type = 'github_app', auth_user_id = github_id 
WHERE github_id IS NOT NULL AND auth_type != 'github_app';

-- 9. Test the problematic query
SELECT '=== TESTING THE FAILING QUERY ===' as info;
SELECT id FROM public.profiles 
WHERE auth_type = 'github_app' AND auth_user_id = 'github_162946059';

-- 10. Test alternative queries
SELECT '=== TESTING ALTERNATIVE QUERIES ===' as info;

-- Test with github_id
SELECT id FROM public.profiles 
WHERE github_id = '162946059';

-- Test simple select
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Test auth_type filter
SELECT COUNT(*) as github_app_profiles FROM public.profiles WHERE auth_type = 'github_app';

-- 11. Show current profiles data
SELECT '=== CURRENT PROFILES DATA ===' as info;
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 12. Verify RLS is disabled
SELECT '=== RLS STATUS AFTER ===' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 13. Show final table structure
SELECT '=== FINAL TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT '=== NUCLEAR FIX COMPLETE ===' as info;
SELECT 'RLS has been completely disabled on the profiles table. If the 406 error persists, the issue is not with RLS policies.' as message; 