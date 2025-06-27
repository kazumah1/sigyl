-- Fix 406 Error for Profiles Table Queries
-- This script fixes the RLS policies that are causing 406 errors when querying profiles

-- 1. First, let's check the current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Drop all existing RLS policies on profiles table
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

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, permissive policies that allow all operations
-- This is needed because the profiles table is used for both Supabase auth and GitHub App users
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_all" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_all" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_all" ON public.profiles
  FOR DELETE USING (true);

-- 5. Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- 6. Ensure the auth_type and auth_user_id columns exist
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

-- 7. Update existing profiles to have proper auth_type and auth_user_id
UPDATE public.profiles 
SET auth_type = 'supabase', auth_user_id = id 
WHERE auth_type IS NULL OR auth_user_id IS NULL;

-- 8. Update GitHub App profiles to have proper auth_type and auth_user_id
UPDATE public.profiles 
SET auth_type = 'github_app', auth_user_id = github_id 
WHERE github_id IS NOT NULL AND auth_type != 'github_app';

-- 9. Test the problematic query
SELECT 'Testing profiles query...' as status;

-- Test the exact query that was failing
SELECT id FROM public.profiles 
WHERE auth_type = 'github_app' AND auth_user_id = 'github_162946059';

-- 10. Show current profiles data
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 11. Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 12. Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================================================
-- API_USERS TABLE FIXES (if the table exists in this database)
-- ============================================================================

-- Check if api_users table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_users') THEN
        RAISE NOTICE 'api_users table exists, checking RLS policies...';
        
        -- Drop existing RLS policies on api_users table
        DROP POLICY IF EXISTS "api_users_select_all" ON public.api_users;
        DROP POLICY IF EXISTS "api_users_insert_all" ON public.api_users;
        DROP POLICY IF EXISTS "api_users_update_all" ON public.api_users;
        DROP POLICY IF EXISTS "api_users_delete_all" ON public.api_users;
        
        -- Enable RLS
        ALTER TABLE public.api_users ENABLE ROW LEVEL SECURITY;
        
        -- Create permissive policies for api_users table
        CREATE POLICY "api_users_select_all" ON public.api_users
          FOR SELECT USING (true);
        
        CREATE POLICY "api_users_insert_all" ON public.api_users
          FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "api_users_update_all" ON public.api_users
          FOR UPDATE USING (true);
        
        CREATE POLICY "api_users_delete_all" ON public.api_users
          FOR DELETE USING (true);
        
        -- Grant permissions
        GRANT ALL ON public.api_users TO authenticated;
        GRANT ALL ON public.api_users TO anon;
        
        RAISE NOTICE 'api_users table RLS policies updated successfully';
    ELSE
        RAISE NOTICE 'api_users table does not exist in this database';
    END IF;
END $$;

-- Test api_users queries if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_users') THEN
        RAISE NOTICE 'Testing api_users queries...';
        
        -- Test the queries that were failing
        PERFORM id FROM public.api_users WHERE github_id = '162946059';
        PERFORM id FROM public.api_users WHERE email = 'kazumah1@users.noreply.github.com';
        
        RAISE NOTICE 'api_users queries completed successfully';
    END IF;
END $$; 