-- Session-based metrics migration
-- This creates tables for storing raw session events and processed session analytics

-- Create raw_session_events table for storing complete request/response data
CREATE TABLE IF NOT EXISTS public.raw_session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_sequence INTEGER NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Complete request/response data stored as JSONB
  request_data JSONB NOT NULL,
  response_data JSONB NOT NULL,
  system_data JSONB NOT NULL,
  error_data JSONB,
  
  -- Additional metadata
  client_ip TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique session_id + event_sequence
  UNIQUE(session_id, event_sequence)
);

-- Create session_analytics table for processed session insights
CREATE TABLE IF NOT EXISTS public.session_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package_name TEXT NOT NULL,
  
  -- Session metadata
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  total_events INTEGER NOT NULL,
  
  -- Processed analytics stored as JSONB
  conversation_flow JSONB NOT NULL,
  events JSONB NOT NULL,
  llm_usage JSONB NOT NULL,
  performance JSONB NOT NULL,
  search_signals JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_session_events_session_id ON public.raw_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_user_id ON public.raw_session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_package_name ON public.raw_session_events(package_name);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_timestamp ON public.raw_session_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_created_at ON public.raw_session_events(created_at);

CREATE INDEX IF NOT EXISTS idx_session_analytics_session_id ON public.session_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON public.session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_package_name ON public.session_analytics(package_name);
CREATE INDEX IF NOT EXISTS idx_session_analytics_started_at ON public.session_analytics(started_at);
CREATE INDEX IF NOT EXISTS idx_session_analytics_processed_at ON public.session_analytics(processed_at);

-- Create GIN indexes for JSONB columns to enable efficient queries
CREATE INDEX IF NOT EXISTS idx_raw_session_events_request_data ON public.raw_session_events USING GIN (request_data);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_response_data ON public.raw_session_events USING GIN (response_data);
CREATE INDEX IF NOT EXISTS idx_raw_session_events_system_data ON public.raw_session_events USING GIN (system_data);

CREATE INDEX IF NOT EXISTS idx_session_analytics_conversation_flow ON public.session_analytics USING GIN (conversation_flow);
CREATE INDEX IF NOT EXISTS idx_session_analytics_events ON public.session_analytics USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_session_analytics_llm_usage ON public.session_analytics USING GIN (llm_usage);
CREATE INDEX IF NOT EXISTS idx_session_analytics_performance ON public.session_analytics USING GIN (performance);
CREATE INDEX IF NOT EXISTS idx_session_analytics_search_signals ON public.session_analytics USING GIN (search_signals);

-- Enable Row Level Security
ALTER TABLE public.raw_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for raw_session_events
CREATE POLICY "Users can view own session events" ON public.raw_session_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow inserting session events" ON public.raw_session_events
  FOR INSERT WITH CHECK (true); -- Allow wrapper to insert events

-- RLS Policies for session_analytics
CREATE POLICY "Users can view own session analytics" ON public.session_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow inserting session analytics" ON public.session_analytics
  FOR INSERT WITH CHECK (true); -- Allow backend processing

CREATE POLICY "Allow updating session analytics" ON public.session_analytics
  FOR UPDATE USING (true); -- Allow backend processing

-- Create a function to clean up old raw session events (for storage management)
CREATE OR REPLACE FUNCTION cleanup_old_session_events()
RETURNS void AS $$
BEGIN
  -- Delete raw session events older than 90 days
  DELETE FROM public.raw_session_events
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Keep session analytics for longer (1 year)
  DELETE FROM public.session_analytics
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- SELECT cron.schedule('cleanup-session-events', '0 2 * * 0', 'SELECT cleanup_old_session_events();'); 