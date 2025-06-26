-- User Installations Table
-- Links users to their GitHub App installations
CREATE TABLE IF NOT EXISTS user_installations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    github_username TEXT NOT NULL,
    installation_id BIGINT NOT NULL,
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, installation_id),
    FOREIGN KEY (installation_id) REFERENCES github_installations(installation_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_installations_user_id ON user_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_installations_github_username ON user_installations(github_username);
CREATE INDEX IF NOT EXISTS idx_user_installations_installation_id ON user_installations(installation_id);

-- Update trigger for updated_at
CREATE TRIGGER update_user_installations_updated_at 
    BEFORE UPDATE ON user_installations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 