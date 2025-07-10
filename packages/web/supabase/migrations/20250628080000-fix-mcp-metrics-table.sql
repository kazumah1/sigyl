-- Fix MCP metrics table to match analytics endpoint expectations
-- Drop the old mcp_metrics table and recreate with proper schema

DROP TABLE IF EXISTS public.mcp_metrics CASCADE;

-- Create new mcp_metrics table matching what wrapper sends
CREATE TABLE public.mcp_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  mcp_method TEXT,
  tool_name TEXT,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  response_time_ms INTEGER,
  client_ip TEXT,
  user_agent TEXT,
  has_secrets BOOLEAN DEFAULT false,
  secret_count INTEGER DEFAULT 0,
  performance_tier TEXT CHECK (performance_tier IN ('fast', 'medium', 'slow')),
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  request_size_bytes INTEGER,
  user_satisfaction_signal TEXT,
  complexity_score TEXT,
  experiment_variant TEXT DEFAULT 'default',
  memory_usage_mb DECIMAL(10,2),
  cpu_time_ms DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_mcp_metrics_user_id ON public.mcp_metrics(user_id);
CREATE INDEX idx_mcp_metrics_package_name ON public.mcp_metrics(package_name);
CREATE INDEX idx_mcp_metrics_event_type ON public.mcp_metrics(event_type);
CREATE INDEX idx_mcp_metrics_created_at ON public.mcp_metrics(created_at);
CREATE INDEX idx_mcp_metrics_performance ON public.mcp_metrics(performance_tier, response_time_ms);

-- Enable RLS
ALTER TABLE public.mcp_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own metrics
CREATE POLICY "Users can view own metrics" ON public.mcp_metrics
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Allow inserting metrics (for the wrapper)
CREATE POLICY "Allow metrics insertion" ON public.mcp_metrics
  FOR INSERT WITH CHECK (true);

-- Note: Leaving existing 'metrics' table untouched to avoid conflicts
-- The analytics system will use 'mcp_metrics' for new detailed analytics 