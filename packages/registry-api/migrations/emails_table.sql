-- Create emails table for contact form submissions and mailing list
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL, -- demo, enterprise, feature, investor, misc
  message TEXT NOT NULL,
  source TEXT DEFAULT 'contact_form', -- contact_form, waitlist, newsletter, etc.
  subscribed BOOLEAN DEFAULT TRUE, -- for unsubscribe functionality
  email_verified BOOLEAN DEFAULT FALSE, -- for email verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate emails from same source
  UNIQUE(email, source)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_email ON emails(email);
CREATE INDEX IF NOT EXISTS idx_emails_purpose ON emails(purpose);
CREATE INDEX IF NOT EXISTS idx_emails_source ON emails(source);
CREATE INDEX IF NOT EXISTS idx_emails_subscribed ON emails(subscribed);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at);

-- Add comments for documentation
COMMENT ON TABLE emails IS 'Stores contact form submissions and mailing list for bulk email campaigns';
COMMENT ON COLUMN emails.name IS 'Full name of the person who submitted the form';
COMMENT ON COLUMN emails.email IS 'Email address for contact and marketing';
COMMENT ON COLUMN emails.purpose IS 'Reason for contact: demo, enterprise, feature, investor, misc';
COMMENT ON COLUMN emails.message IS 'Message content from contact form';
COMMENT ON COLUMN emails.source IS 'Source of the email: contact_form, waitlist, newsletter, etc.';
COMMENT ON COLUMN emails.subscribed IS 'Whether user is subscribed to marketing emails';
COMMENT ON COLUMN emails.email_verified IS 'Whether email address has been verified';

-- Create trigger for updated_at
CREATE TRIGGER update_emails_updated_at 
    BEFORE UPDATE ON emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON emails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emails TO anon;

-- Create view for marketing purposes (active subscribers only)
CREATE OR REPLACE VIEW marketing_emails AS
SELECT 
    id,
    name,
    email,
    purpose,
    source,
    created_at
FROM emails 
WHERE subscribed = TRUE 
ORDER BY created_at DESC;

-- Grant permissions on view
GRANT SELECT ON marketing_emails TO authenticated;

-- Create function to get email statistics
CREATE OR REPLACE FUNCTION get_email_stats()
RETURNS TABLE(
    total_emails BIGINT,
    subscribed_emails BIGINT,
    by_purpose JSONB,
    by_source JSONB,
    recent_signups BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM emails) as total_emails,
        (SELECT COUNT(*) FROM emails WHERE subscribed = TRUE) as subscribed_emails,
        (SELECT jsonb_object_agg(purpose, count) 
         FROM (SELECT purpose, COUNT(*) as count FROM emails GROUP BY purpose) p) as by_purpose,
        (SELECT jsonb_object_agg(source, count) 
         FROM (SELECT source, COUNT(*) as count FROM emails GROUP BY source) s) as by_source,
        (SELECT COUNT(*) FROM emails WHERE created_at > NOW() - INTERVAL '7 days') as recent_signups;
END;
$$ LANGUAGE plpgsql; 