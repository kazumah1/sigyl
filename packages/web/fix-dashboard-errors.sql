-- Fix Dashboard Errors - Run this in Supabase SQL Editor
-- This script fixes the infinite recursion and missing table issues

-- 1. Create the missing metrics table
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('visit', 'tool_call', 'integration_call')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view MCP servers in their workspaces" ON public.mcp_servers;

-- 3. Create simpler, non-recursive policies
CREATE POLICY "Users can view workspace members for their workspaces" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    workspace_id IN (
      SELECT w.id FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view MCP servers in their workspaces" ON public.mcp_servers
  FOR SELECT USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Add policies for the metrics table
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their workspaces" ON public.metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their workspaces" ON public.metrics
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metrics_workspace_id ON public.metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_server_id ON public.metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON public.metrics(type);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON public.metrics(created_at);

-- 6. Add trigger for updated_at on metrics table (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_metrics_updated_at 
      BEFORE UPDATE ON public.metrics 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 7. Create a simple demo workspace if one doesn't exist (only if we have profiles)
DO $$
DECLARE
  profile_id UUID;
  demo_workspace_id UUID;
BEGIN
  -- Only create demo data if we have existing profiles
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
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO demo_workspace_id;
    
    -- If workspace was created, add a demo server
    IF demo_workspace_id IS NOT NULL THEN
      INSERT INTO public.mcp_servers (id, workspace_id, name, description, status, endpoint_url, deployment_status)
      VALUES (
        gen_random_uuid(),
        demo_workspace_id,
        'Demo MCP Server',
        'A demo MCP server for testing',
        'active',
        'https://demo-server.railway.app',
        'deployed'
      );
    END IF;
  END IF;
END $$; 