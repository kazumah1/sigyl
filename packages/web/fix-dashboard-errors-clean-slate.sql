-- Clean Slate Fix for Dashboard Errors - Run this in Supabase SQL Editor
-- This script drops and recreates all problematic tables from scratch

-- 1. DROP ALL PROBLEMATIC TABLES AND POLICIES
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view MCP servers in their workspaces" ON public.mcp_servers;
DROP POLICY IF EXISTS "Users can view metrics for their workspaces" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert metrics for their workspaces" ON public.metrics;
DROP POLICY IF EXISTS "Simple workspaces policy" ON public.workspaces;
DROP POLICY IF EXISTS "Simple workspace members policy" ON public.workspace_members;
DROP POLICY IF EXISTS "Simple mcp servers policy" ON public.mcp_servers;
DROP POLICY IF EXISTS "Simple metrics policy" ON public.metrics;
DROP POLICY IF EXISTS "Own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Own workspace servers" ON public.mcp_servers;
DROP POLICY IF EXISTS "Own workspace metrics" ON public.metrics;

-- Drop triggers
DROP TRIGGER IF EXISTS update_metrics_updated_at ON public.metrics;

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.metrics CASCADE;
DROP TABLE IF EXISTS public.mcp_servers CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- 2. RECREATE TABLES FROM SCRATCH

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE public.workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create mcp_servers table
CREATE TABLE public.mcp_servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  endpoint_url TEXT,
  deployment_status TEXT DEFAULT 'not_deployed' CHECK (deployment_status IN ('not_deployed', 'deploying', 'deployed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create metrics table
CREATE TABLE public.metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('visit', 'tool_call', 'integration_call')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS ON ALL TABLES
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

-- 4. CREATE ULTRA SIMPLE POLICIES (NO CROSS-REFERENCES)
-- Allow users to see workspaces they own
CREATE POLICY "Own workspaces" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

-- Allow users to see workspace memberships where they are the user
CREATE POLICY "Own memberships" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to see servers in workspaces they own
CREATE POLICY "Own workspace servers" ON public.mcp_servers
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Allow users to see metrics for workspaces they own
CREATE POLICY "Own workspace metrics" ON public.metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- 5. CREATE INDEXES
CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_mcp_servers_workspace_id ON public.mcp_servers(workspace_id);
CREATE INDEX idx_metrics_workspace_id ON public.metrics(workspace_id);
CREATE INDEX idx_metrics_server_id ON public.metrics(server_id);
CREATE INDEX idx_metrics_type ON public.metrics(type);
CREATE INDEX idx_metrics_created_at ON public.metrics(created_at);

-- 6. ADD TRIGGERS FOR updated_at (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_workspaces_updated_at 
      BEFORE UPDATE ON public.workspaces 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
      
    CREATE TRIGGER update_workspace_members_updated_at 
      BEFORE UPDATE ON public.workspace_members 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
      
    CREATE TRIGGER update_mcp_servers_updated_at 
      BEFORE UPDATE ON public.mcp_servers 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 7. CREATE DEMO DATA
DO $$
DECLARE
  profile_id UUID;
  demo_workspace_id UUID;
  demo_server_id UUID;
BEGIN
  -- Get an existing profile
  SELECT id INTO profile_id FROM public.profiles LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    -- Create demo workspace
    INSERT INTO public.workspaces (id, name, slug, description, owner_id)
    VALUES (
      gen_random_uuid(),
      'Demo Workspace',
      'demo-workspace',
      'Demo workspace for testing',
      profile_id
    )
    RETURNING id INTO demo_workspace_id;
    
    -- Add a demo server
    INSERT INTO public.mcp_servers (id, workspace_id, name, description, status, endpoint_url, deployment_status)
    VALUES (
      gen_random_uuid(),
      demo_workspace_id,
      'Demo MCP Server',
      'A demo MCP server for testing',
      'active',
      'https://demo-server.railway.app',
      'deployed'
    )
    RETURNING id INTO demo_server_id;
    
    -- Add some sample metrics
    INSERT INTO public.metrics (workspace_id, server_id, type, metadata, created_at) 
    SELECT 
      demo_workspace_id as workspace_id,
      demo_server_id as server_id,
      CASE 
        WHEN random() < 0.4 THEN 'visit'
        WHEN random() < 0.7 THEN 'tool_call'
        ELSE 'integration_call'
      END as type,
      '{}'::jsonb as metadata,
      NOW() - (random() * interval '30 days') as created_at
    FROM generate_series(1, 50);
    
    RAISE NOTICE 'Demo data created successfully';
  ELSE
    RAISE NOTICE 'No profiles found, skipping demo data creation';
  END IF;
END $$; 