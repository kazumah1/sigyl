-- Add required_secrets field to mcp_packages table
-- This field will store the secrets that an MCP server requires, as defined in its mcp.yaml

ALTER TABLE public.mcp_packages 
ADD COLUMN IF NOT EXISTS required_secrets JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the field
COMMENT ON COLUMN public.mcp_packages.required_secrets IS 
'Array of required secrets for this MCP server, as defined in mcp.yaml. Each secret has name, description, required (boolean), and type fields.';

-- Create an index for efficient querying of packages by required secrets
CREATE INDEX IF NOT EXISTS idx_mcp_packages_required_secrets 
ON public.mcp_packages USING GIN (required_secrets);

-- Update the updated_at trigger to include required_secrets changes
-- (This assumes the existing trigger already handles JSONB fields) 