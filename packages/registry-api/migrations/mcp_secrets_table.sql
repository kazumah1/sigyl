-- Create mcp_secrets table for MVP secrets manager
CREATE TABLE IF NOT EXISTS mcp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g. "OPENAI_API_KEY"
  value TEXT NOT NULL,         -- encrypted at rest
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique keys per user
  UNIQUE(user_id, key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mcp_secrets_user_id ON mcp_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_secrets_key ON mcp_secrets(key);

-- Add comments for documentation
COMMENT ON TABLE mcp_secrets IS 'Stores encrypted secrets for MCP server deployments';
COMMENT ON COLUMN mcp_secrets.key IS 'Environment variable name (e.g., OPENAI_API_KEY)';
COMMENT ON COLUMN mcp_secrets.value IS 'Encrypted secret value';
COMMENT ON COLUMN mcp_secrets.user_id IS 'Owner of the secret';

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_secrets TO authenticated; 