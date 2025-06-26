-- Fix Profile Table Structure and Queries
-- This script checks and fixes the profiles table structure

-- 1. Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
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
    
    -- Add github_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'github_id') THEN
        ALTER TABLE public.profiles ADD COLUMN github_id TEXT;
        RAISE NOTICE 'Added github_id column to profiles table';
    ELSE
        RAISE NOTICE 'github_id column already exists';
    END IF;
    
    -- Add github_username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'github_username') THEN
        ALTER TABLE public.profiles ADD COLUMN github_username TEXT;
        RAISE NOTICE 'Added github_username column to profiles table';
    ELSE
        RAISE NOTICE 'github_username column already exists';
    END IF;
END $$;

-- 3. Update existing profiles to have proper auth_type and auth_user_id
UPDATE public.profiles 
SET auth_type = 'supabase', auth_user_id = id 
WHERE auth_type IS NULL OR auth_user_id IS NULL;

-- 4. Update GitHub App profiles to have proper auth_type and auth_user_id
UPDATE public.profiles 
SET auth_type = 'github_app', auth_user_id = github_id 
WHERE github_id IS NOT NULL AND auth_type != 'github_app';

-- 5. Show current profiles data
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Test the query that was failing
SELECT id FROM public.profiles 
WHERE auth_type = 'github_app' AND auth_user_id = 'github_162946059';

-- 7. Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position; 