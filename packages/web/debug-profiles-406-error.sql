-- Debug 406 Error for Profiles Table
-- This script helps diagnose why the profiles query is still failing

-- 1. Check if the profiles table exists and its structure
SELECT '=== PROFILES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled on profiles table
SELECT '=== RLS STATUS ===' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. List all RLS policies on profiles table
SELECT '=== CURRENT RLS POLICIES ===' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check current user and role
SELECT '=== CURRENT USER INFO ===' as info;
SELECT current_user, session_user, current_setting('role', true) as current_role;

-- 5. Check if the specific profile exists
SELECT '=== CHECKING FOR SPECIFIC PROFILE ===' as info;
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
WHERE auth_type = 'github_app' AND auth_user_id = 'github_162946059';

-- 6. Check all GitHub App profiles
SELECT '=== ALL GITHUB APP PROFILES ===' as info;
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
WHERE auth_type = 'github_app'
ORDER BY created_at DESC;

-- 7. Check if there are any profiles with github_id = 162946059
SELECT '=== PROFILES WITH GITHUB_ID 162946059 ===' as info;
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email 
FROM public.profiles 
WHERE github_id = '162946059';

-- 8. Test the exact query that's failing with different approaches
SELECT '=== TESTING DIFFERENT QUERY APPROACHES ===' as info;

-- Test 1: Simple select without filters
SELECT 'Test 1: Simple select' as test_name;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Test 2: Select with auth_type filter only
SELECT 'Test 2: auth_type filter only' as test_name;
SELECT COUNT(*) as github_app_profiles FROM public.profiles WHERE auth_type = 'github_app';

-- Test 3: Select with github_id filter only
SELECT 'Test 3: github_id filter only' as test_name;
SELECT COUNT(*) as matching_github_id FROM public.profiles WHERE github_id = '162946059';

-- Test 4: Select with auth_user_id filter only
SELECT 'Test 4: auth_user_id filter only' as test_name;
SELECT COUNT(*) as matching_auth_user_id FROM public.profiles WHERE auth_user_id = 'github_162946059';

-- Test 5: The exact failing query
SELECT 'Test 5: Exact failing query' as test_name;
SELECT id FROM public.profiles 
WHERE auth_type = 'github_app' AND auth_user_id = 'github_162946059';

-- 9. Check permissions
SELECT '=== PERMISSIONS CHECK ===' as info;
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles';

-- 10. Check if there are any triggers that might be interfering
SELECT '=== TRIGGERS ===' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- 11. Check for any constraints that might be causing issues
SELECT '=== CONSTRAINTS ===' as info;
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints 
WHERE table_name = 'profiles';

-- 12. Show recent activity on profiles table (if audit logs are available)
SELECT '=== RECENT PROFILES DATA ===' as info;
SELECT id, auth_type, auth_user_id, github_id, github_username, username, email, created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10; 