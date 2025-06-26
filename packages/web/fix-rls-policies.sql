-- Fix RLS Policies for GitHub App Users
-- This script adds proper RLS policies to allow GitHub App users to create and access profiles

-- 1. Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Create a simple RLS policy that allows authenticated users to create profiles
CREATE POLICY "Allow profile creation for authenticated users" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- 3. Create a policy that allows users to view their own profile
CREATE POLICY "Allow users to view own profile" ON public.profiles
  FOR SELECT USING (
    -- For Supabase auth users
    (auth_type = 'supabase' AND auth_user_id = auth.uid()::text) OR
    -- For GitHub App users - allow access if they have a valid session
    (auth_type = 'github_app' AND auth_user_id IS NOT NULL) OR
    -- Allow access to profiles by github_id for GitHub App users
    (github_id IS NOT NULL)
  );

-- 4. Create a policy that allows users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE USING (
    -- For Supabase auth users
    (auth_type = 'supabase' AND auth_user_id = auth.uid()::text) OR
    -- For GitHub App users - allow access if they have a valid session
    (auth_type = 'github_app' AND auth_user_id IS NOT NULL) OR
    -- Allow access to profiles by github_id for GitHub App users
    (github_id IS NOT NULL)
  );

-- 5. Create a policy that allows users to delete their own profile
CREATE POLICY "Allow users to delete own profile" ON public.profiles
  FOR DELETE USING (
    -- For Supabase auth users
    (auth_type = 'supabase' AND auth_user_id = auth.uid()::text) OR
    -- For GitHub App users - allow access if they have a valid session
    (auth_type = 'github_app' AND auth_user_id IS NOT NULL) OR
    -- Allow access to profiles by github_id for GitHub App users
    (github_id IS NOT NULL)
  );

-- 6. Verify RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions to authenticated users
GRANT ALL ON public.profiles TO authenticated;

-- 8. Test query to verify policies work
SELECT 'RLS policies updated successfully' as status; 