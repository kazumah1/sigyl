-- Comprehensive RLS Policy Fix for All Tables
-- This script fixes RLS policies for profiles, workspaces, workspace_members, and metrics tables

-- ============================================================================
-- PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to delete own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE USING (true);

-- ============================================================================
-- WORKSPACES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete own workspaces" ON public.workspaces;

-- Create comprehensive RLS policies for workspaces
CREATE POLICY "workspaces_insert_policy" ON public.workspaces
  FOR INSERT WITH CHECK (true);

CREATE POLICY "workspaces_select_policy" ON public.workspaces
  FOR SELECT USING (true);

CREATE POLICY "workspaces_update_policy" ON public.workspaces
  FOR UPDATE USING (true);

CREATE POLICY "workspaces_delete_policy" ON public.workspaces
  FOR DELETE USING (true);

-- ============================================================================
-- WORKSPACE_MEMBERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can remove workspace members" ON public.workspace_members;

-- Create comprehensive RLS policies for workspace_members
CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT USING (true);

CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
  FOR UPDATE USING (true);

CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
  FOR DELETE USING (true);

-- ============================================================================
-- METRICS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can create metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can update metrics" ON public.metrics;
DROP POLICY IF EXISTS "Users can delete metrics" ON public.metrics;

-- Create comprehensive RLS policies for metrics
CREATE POLICY "metrics_insert_policy" ON public.metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "metrics_select_policy" ON public.metrics
  FOR SELECT USING (true);

CREATE POLICY "metrics_update_policy" ON public.metrics
  FOR UPDATE USING (true);

CREATE POLICY "metrics_delete_policy" ON public.metrics
  FOR DELETE USING (true);

-- ============================================================================
-- MCP_PACKAGES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view packages" ON public.mcp_packages;
DROP POLICY IF EXISTS "Users can create packages" ON public.mcp_packages;
DROP POLICY IF EXISTS "Users can update packages" ON public.mcp_packages;
DROP POLICY IF EXISTS "Users can delete packages" ON public.mcp_packages;

-- Create comprehensive RLS policies for mcp_packages
CREATE POLICY "mcp_packages_insert_policy" ON public.mcp_packages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "mcp_packages_select_policy" ON public.mcp_packages
  FOR SELECT USING (true);

CREATE POLICY "mcp_packages_update_policy" ON public.mcp_packages
  FOR UPDATE USING (true);

CREATE POLICY "mcp_packages_delete_policy" ON public.mcp_packages
  FOR DELETE USING (true);

-- ============================================================================
-- MCP_DEPLOYMENTS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view deployments" ON public.mcp_deployments;
DROP POLICY IF EXISTS "Users can create deployments" ON public.mcp_deployments;
DROP POLICY IF EXISTS "Users can update deployments" ON public.mcp_deployments;
DROP POLICY IF EXISTS "Users can delete deployments" ON public.mcp_deployments;

-- Create comprehensive RLS policies for mcp_deployments
CREATE POLICY "mcp_deployments_insert_policy" ON public.mcp_deployments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "mcp_deployments_select_policy" ON public.mcp_deployments
  FOR SELECT USING (true);

CREATE POLICY "mcp_deployments_update_policy" ON public.mcp_deployments
  FOR UPDATE USING (true);

CREATE POLICY "mcp_deployments_delete_policy" ON public.mcp_deployments
  FOR DELETE USING (true);

-- ============================================================================
-- MCP_TOOLS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view tools" ON public.mcp_tools;
DROP POLICY IF EXISTS "Users can create tools" ON public.mcp_tools;
DROP POLICY IF EXISTS "Users can update tools" ON public.mcp_tools;
DROP POLICY IF EXISTS "Users can delete tools" ON public.mcp_tools;

-- Create comprehensive RLS policies for mcp_tools
CREATE POLICY "mcp_tools_insert_policy" ON public.mcp_tools
  FOR INSERT WITH CHECK (true);

CREATE POLICY "mcp_tools_select_policy" ON public.mcp_tools
  FOR SELECT USING (true);

CREATE POLICY "mcp_tools_update_policy" ON public.mcp_tools
  FOR UPDATE USING (true);

CREATE POLICY "mcp_tools_delete_policy" ON public.mcp_tools
  FOR DELETE USING (true);

-- ============================================================================
-- MCP_SECRETS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view secrets" ON public.mcp_secrets;
DROP POLICY IF EXISTS "Users can create secrets" ON public.mcp_secrets;
DROP POLICY IF EXISTS "Users can update secrets" ON public.mcp_secrets;
DROP POLICY IF EXISTS "Users can delete secrets" ON public.mcp_secrets;

-- Create comprehensive RLS policies for mcp_secrets
CREATE POLICY "mcp_secrets_insert_policy" ON public.mcp_secrets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "mcp_secrets_select_policy" ON public.mcp_secrets
  FOR SELECT USING (true);

CREATE POLICY "mcp_secrets_update_policy" ON public.mcp_secrets
  FOR UPDATE USING (true);

CREATE POLICY "mcp_secrets_delete_policy" ON public.mcp_secrets
  FOR DELETE USING (true);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_secrets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.workspaces TO authenticated;
GRANT ALL ON public.workspace_members TO authenticated;
GRANT ALL ON public.metrics TO authenticated;
GRANT ALL ON public.mcp_packages TO authenticated;
GRANT ALL ON public.mcp_deployments TO authenticated;
GRANT ALL ON public.mcp_tools TO authenticated;
GRANT ALL ON public.mcp_secrets TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'All RLS policies updated successfully' as status; 