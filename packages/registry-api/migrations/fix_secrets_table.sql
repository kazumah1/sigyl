-- Fix mcp_secrets table to reference api_users instead of users
-- This migration fixes the foreign key reference

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS mcp_secrets;

-- Recreate the table with correct references
CREATE TABLE mcp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g. "OPENAI_API_KEY"
  value TEXT NOT NULL,         -- encrypted at rest
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique keys per user
  UNIQUE(user_id, key)
);

-- Create index for faster lookups
CREATE INDEX idx_mcp_secrets_user_id ON mcp_secrets(user_id);
CREATE INDEX idx_mcp_secrets_key ON mcp_secrets(key);

-- Add comments for documentation
COMMENT ON TABLE mcp_secrets IS 'Stores encrypted secrets for MCP server deployments';
COMMENT ON COLUMN mcp_secrets.key IS 'Environment variable name (e.g., OPENAI_API_KEY)';
COMMENT ON COLUMN mcp_secrets.value IS 'Encrypted secret value';
COMMENT ON COLUMN mcp_secrets.user_id IS 'Owner of the secret';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_secrets TO authenticated; 