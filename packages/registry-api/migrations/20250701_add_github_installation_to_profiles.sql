-- Add GitHub App installation info to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_installation_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_app_installed BOOLEAN DEFAULT FALSE;
