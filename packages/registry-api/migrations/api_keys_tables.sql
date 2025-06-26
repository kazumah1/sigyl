-- API Key Management Tables

-- Users Table (for API key management)
CREATE TABLE IF NOT EXISTS api_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    github_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL, -- First 8 characters for display
    name TEXT NOT NULL, -- User-friendly name for the key
    permissions TEXT[] DEFAULT '{}', -- Array of permissions: ['read', 'write', 'admin']
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means never expires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES api_users(id) ON DELETE CASCADE
);

-- API Key Usage Log (for monitoring and rate limiting)
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at);

-- Update trigger for updated_at
CREATE TRIGGER update_api_users_updated_at 
    BEFORE UPDATE ON api_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate API key hash
CREATE OR REPLACE FUNCTION generate_api_key_hash(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(hmac(api_key::bytea, 'sigyl-api-secret'::bytea, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(api_key TEXT)
RETURNS TABLE(
    key_id UUID,
    user_id UUID,
    permissions TEXT[],
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ak.id,
        ak.user_id,
        ak.permissions,
        ak.is_active
    FROM api_keys ak
    WHERE ak.key_hash = generate_api_key_hash(api_key)
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to log API key usage
CREATE OR REPLACE FUNCTION log_api_key_usage(
    p_key_id UUID,
    p_endpoint TEXT,
    p_method TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_key_usage (
        key_id, endpoint, method, status_code, 
        response_time_ms, ip_address, user_agent
    ) VALUES (
        p_key_id, p_endpoint, p_method, p_status_code,
        p_response_time_ms, p_ip_address, p_user_agent
    );
    
    -- Update last_used timestamp
    UPDATE api_keys 
    SET last_used = NOW() 
    WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql; 