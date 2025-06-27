-- Update mcp_secrets table to add description and mcp_server_id fields
-- This migration adds the missing fields needed for the new secrets interface

-- Add description field
ALTER TABLE mcp_secrets 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add mcp_server_id field
ALTER TABLE mcp_secrets 
ADD COLUMN IF NOT EXISTS mcp_server_id TEXT;

-- Add updated_at field if it doesn't exist
ALTER TABLE mcp_secrets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for mcp_server_id lookups
CREATE INDEX IF NOT EXISTS idx_mcp_secrets_mcp_server_id ON mcp_secrets(mcp_server_id);

-- Add comments for documentation
COMMENT ON COLUMN mcp_secrets.description IS 'Optional description of what this secret is used for';
COMMENT ON COLUMN mcp_secrets.mcp_server_id IS 'Optional MCP server ID this secret is associated with';
COMMENT ON COLUMN mcp_secrets.updated_at IS 'Timestamp when the secret was last updated';

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_mcp_secrets_updated_at'
    ) THEN
        CREATE TRIGGER update_mcp_secrets_updated_at 
            BEFORE UPDATE ON mcp_secrets 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 