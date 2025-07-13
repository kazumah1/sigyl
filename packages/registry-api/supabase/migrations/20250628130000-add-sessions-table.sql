-- Migration: Add sessions table for resumability and session management
-- This table stores session metadata needed for MCP resumability features

CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  package_name TEXT,
  
  -- Session metadata
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  
  -- Client information
  client_ip TEXT,
  user_agent TEXT,
  
  -- Event sequence tracking for resumability
  last_event_sequence INTEGER NOT NULL DEFAULT 0,
  
  -- Session configuration
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_package_name ON public.sessions(package_name);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON public.sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_package ON public.sessions(user_id, package_name);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON public.sessions(user_id, status);

-- GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_sessions_metadata ON public.sessions USING GIN(metadata);

-- Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own sessions
CREATE POLICY "Users can access their own sessions" ON public.sessions
  FOR ALL USING (user_id = auth.uid()::text);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Cleanup function for expired sessions (older than 24 hours of inactivity)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark sessions as expired if inactive for more than 24 hours
  UPDATE public.sessions 
  SET status = 'expired', ended_at = NOW()
  WHERE status = 'active' 
    AND last_activity < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.sessions IS 'Session metadata for MCP resumability and session management';
COMMENT ON COLUMN public.sessions.id IS 'Unique session identifier (format: mcp_timestamp_randomhex)';
COMMENT ON COLUMN public.sessions.last_event_sequence IS 'Last event sequence number for resumability';
COMMENT ON COLUMN public.sessions.metadata IS 'Additional session metadata as JSONB';
COMMENT ON COLUMN public.sessions.status IS 'Session status: active, ended, or expired'; 