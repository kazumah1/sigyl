-- Fix GitHub App User Authentication
-- This migration modifies the profiles table to support both Supabase auth users and GitHub App users

-- 1. First, backup existing data (if any)
CREATE TABLE IF NOT EXISTS profiles_backup AS SELECT * FROM public.profiles;

-- 2. Drop the problematic foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Modify the profiles table to support both auth types
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'supabase' CHECK (auth_type IN ('supabase', 'github_app')),
  ADD COLUMN IF NOT EXISTS auth_user_id TEXT; -- Store the original auth ID (UUID for Supabase, github_xxx for GitHub App)

-- 4. Update existing profiles to have proper auth_type
UPDATE public.profiles 
SET auth_type = 'supabase', auth_user_id = id 
WHERE auth_type IS NULL OR auth_user_id IS NULL;

-- 5. Create a new unique constraint that allows both auth types
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_auth_unique 
  UNIQUE (auth_type, auth_user_id);

-- 6. Update the workspaces table to reference profiles properly
ALTER TABLE public.workspaces 
  DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

ALTER TABLE public.workspaces 
  ADD CONSTRAINT workspaces_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. Update workspace_members table
ALTER TABLE public.workspace_members 
  DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE public.workspace_members 
  ADD CONSTRAINT workspace_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. Create a function to handle GitHub App user profile creation
CREATE OR REPLACE FUNCTION public.create_github_app_profile(
  github_id TEXT,
  github_username TEXT,
  email TEXT,
  full_name TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Generate a new UUID for the profile
  profile_id := gen_random_uuid();
  
  -- Insert the GitHub App user profile
  INSERT INTO public.profiles (
    id,
    auth_type,
    auth_user_id,
    email,
    username,
    full_name,
    github_username,
    github_id,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    profile_id,
    'github_app',
    github_id,
    email,
    github_username,
    full_name,
    github_username,
    github_id,
    avatar_url,
    NOW(),
    NOW()
  );
  
  RETURN profile_id;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists, return the existing ID
    SELECT id INTO profile_id 
    FROM public.profiles 
    WHERE auth_type = 'github_app' AND auth_user_id = github_id;
    RETURN profile_id;
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create a function to get or create GitHub App user profile
CREATE OR REPLACE FUNCTION public.get_or_create_github_app_profile(
  github_id TEXT,
  github_username TEXT,
  email TEXT,
  full_name TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to find existing profile
  SELECT id INTO profile_id 
  FROM public.profiles 
  WHERE auth_type = 'github_app' AND auth_user_id = github_id;
  
  -- If not found, create new profile
  IF profile_id IS NULL THEN
    profile_id := public.create_github_app_profile(github_id, github_username, email, full_name, avatar_url);
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update RLS policies to work with both auth types
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    (auth_type = 'supabase' AND auth_user_id = auth.uid()::text) OR
    (auth_type = 'github_app' AND auth_user_id = current_setting('app.github_user_id', true))
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    (auth_type = 'supabase' AND auth_user_id = auth.uid()::text) OR
    (auth_type = 'github_app' AND auth_user_id = current_setting('app.github_user_id', true))
  );

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_type ON public.profiles(auth_type);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_github_id ON public.profiles(github_id);

-- 12. Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles supporting both Supabase auth and GitHub App auth';
COMMENT ON COLUMN public.profiles.auth_type IS 'Type of authentication: supabase or github_app';
COMMENT ON COLUMN public.profiles.auth_user_id IS 'Original auth ID (UUID for Supabase, github_xxx for GitHub App)';
COMMENT ON FUNCTION public.create_github_app_profile IS 'Creates a new GitHub App user profile';
COMMENT ON FUNCTION public.get_or_create_github_app_profile IS 'Gets existing or creates new GitHub App user profile';

-- 13. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_github_app_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_github_app_profile TO authenticated; 