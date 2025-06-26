-- Aggressive Fix for Dashboard Errors - Run this in Supabase SQL Editor
-- This script completely removes problematic RLS policies and creates simple ones

-- 1. Create the missing metrics table
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('visit', 'tool_call', 'integration_call')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COMPLETELY REMOVE ALL PROBLEMATIC RLS POLICIES
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view MCP servers in their workspaces" ON public.mcp_servers;
DROP POLICY IF EXISTS "Users can view metrics for their workspaces" ON public.metrics;
DROP POLICY IF EXISTS "Users can insert metrics for their workspaces" ON public.metrics;

-- 3. Create VERY SIMPLE policies that avoid any recursion
-- For workspaces: users can see workspaces they own OR are members of
CREATE POLICY "Simple workspaces policy" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- For workspace_members: users can see memberships they're part of
CREATE POLICY "Simple workspace members policy" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- For mcp_servers: users can see servers in their workspaces
CREATE POLICY "Simple mcp servers policy" ON public.mcp_servers
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- For metrics: users can see metrics for their workspaces
CREATE POLICY "Simple metrics policy" ON public.metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metrics_workspace_id ON public.metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_server_id ON public.metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON public.metrics(type);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON public.metrics(created_at);

-- 5. Add trigger for updated_at on metrics table (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_metrics_updated_at 
      BEFORE UPDATE ON public.metrics 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6. Create demo data with proper UUIDs
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
      )
      RETURNING id INTO demo_server_id;
      
      -- Add some sample metrics
      IF demo_server_id IS NOT NULL THEN
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
      END IF;
    END IF;
  END IF;
END $$; 