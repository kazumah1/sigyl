-- GitHub App Installations Table
CREATE TABLE IF NOT EXISTS github_installations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    installation_id BIGINT UNIQUE NOT NULL,
    account_login TEXT NOT NULL,
    account_type TEXT NOT NULL,
    repositories TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GitHub Repositories Table
CREATE TABLE IF NOT EXISTS github_repositories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    installation_id BIGINT NOT NULL,
    repo_id BIGINT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    private BOOLEAN DEFAULT false,
    has_mcp BOOLEAN DEFAULT false,
    mcp_files TEXT[] DEFAULT '{}',
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(installation_id, repo_id),
    FOREIGN KEY (installation_id) REFERENCES github_installations(installation_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_github_installations_account ON github_installations(account_login);
CREATE INDEX IF NOT EXISTS idx_github_repositories_installation ON github_repositories(installation_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_owner ON github_repositories(owner);
CREATE INDEX IF NOT EXISTS idx_github_repositories_has_mcp ON github_repositories(has_mcp);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_github_installations_updated_at 
    BEFORE UPDATE ON github_installations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_repositories_updated_at 
    BEFORE UPDATE ON github_repositories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 