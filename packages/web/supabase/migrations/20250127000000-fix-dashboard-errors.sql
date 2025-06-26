-- Fix Dashboard Errors Migration
-- This migration addresses the 404 and 500 errors in the dashboard

-- 1. Create the missing metrics table that analyticsService.ts expects
CREATE TABLE IF NOT EXISTS public.metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('visit', 'tool_call', 'integration_call')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fix the infinite recursion in workspace_members policy
-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view workspace members for their workspaces" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    workspace_id IN (
      SELECT w.id FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );

-- 3. Add missing policies for the metrics table
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their workspaces" ON public.metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their workspaces" ON public.metrics
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- 4. Add missing policies for workspaces table
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;

-- Create a simpler policy that includes ownership
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_metrics_workspace_id ON public.metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_server_id ON public.metrics(server_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON public.metrics(type);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON public.metrics(created_at);

-- 6. Insert some sample data for demo purposes
INSERT INTO public.metrics (workspace_id, server_id, type, metadata, created_at) 
SELECT 
  w.id as workspace_id,
  ms.id as server_id,
  CASE 
    WHEN random() < 0.4 THEN 'visit'
    WHEN random() < 0.7 THEN 'tool_call'
    ELSE 'integration_call'
  END as type,
  '{}'::jsonb as metadata,
  NOW() - (random() * interval '30 days') as created_at
FROM public.workspaces w
LEFT JOIN public.mcp_servers ms ON ms.workspace_id = w.id
WHERE w.slug = 'demo-workspace'
LIMIT 100
ON CONFLICT DO NOTHING;

-- 7. Ensure demo workspace exists
INSERT INTO public.workspaces (id, name, slug, description, owner_id)
VALUES (
  'demo-workspace-id',
  'Demo Workspace',
  'demo-workspace',
  'Demo workspace for testing',
  (SELECT id FROM public.profiles LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- 8. Ensure demo MCP server exists
INSERT INTO public.mcp_servers (id, workspace_id, name, description, status, endpoint_url, deployment_status)
VALUES (
  'demo-server-id',
  'demo-workspace-id',
  'Demo MCP Server',
  'A demo MCP server for testing',
  'active',
  'https://demo-server.railway.app',
  'deployed'
)
ON CONFLICT DO NOTHING;

-- 9. Add trigger for updated_at on metrics table
CREATE TRIGGER update_metrics_updated_at 
  BEFORE UPDATE ON public.metrics 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 