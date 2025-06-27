-- Gateway Sessions Table
-- Stores temporary gateway connections with user secrets for MCP server proxying

CREATE TABLE IF NOT EXISTS gateway_sessions (
    id TEXT PRIMARY KEY,
    mcp_server_url TEXT NOT NULL,
    user_secrets JSONB NOT NULL DEFAULT '{}',
    additional_config JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gateway_sessions_expires_at ON gateway_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_gateway_sessions_created_at ON gateway_sessions(created_at);

-- Add comments for documentation
COMMENT ON TABLE gateway_sessions IS 'Temporary gateway sessions for MCP server proxying with user secrets';
COMMENT ON COLUMN gateway_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN gateway_sessions.mcp_server_url IS 'Target MCP server URL';
COMMENT ON COLUMN gateway_sessions.user_secrets IS 'User secrets to inject (encrypted)';
COMMENT ON COLUMN gateway_sessions.additional_config IS 'Additional configuration for the MCP server';
COMMENT ON COLUMN gateway_sessions.expires_at IS 'When this session expires';

-- Update trigger for updated_at
CREATE TRIGGER update_gateway_sessions_updated_at 
    BEFORE UPDATE ON gateway_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON gateway_sessions TO authenticated;

-- Create a function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_gateway_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM gateway_sessions 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (if using pg_cron)
-- SELECT cron.schedule('cleanup-gateway-sessions', '*/15 * * * *', 'SELECT cleanup_expired_gateway_sessions();'); 