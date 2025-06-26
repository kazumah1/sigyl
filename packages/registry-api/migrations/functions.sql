-- Database Functions Migration

-- Function to increment download count for a package
CREATE OR REPLACE FUNCTION increment_downloads(package_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE mcp_packages 
    SET downloads_count = downloads_count + 1,
        updated_at = NOW()
    WHERE id = package_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at column (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at if they don't exist
DO $$
BEGIN
    -- Check if trigger exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_mcp_packages_updated_at'
    ) THEN
        CREATE TRIGGER update_mcp_packages_updated_at 
            BEFORE UPDATE ON mcp_packages 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_mcp_tools_updated_at'
    ) THEN
        CREATE TRIGGER update_mcp_tools_updated_at 
            BEFORE UPDATE ON mcp_tools 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_mcp_deployments_updated_at'
    ) THEN
        CREATE TRIGGER update_mcp_deployments_updated_at 
            BEFORE UPDATE ON mcp_deployments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$; 