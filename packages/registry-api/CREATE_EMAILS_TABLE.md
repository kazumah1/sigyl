# Create Emails Table for Bulk Email Marketing

## Instructions

1. Go to your Supabase Dashboard: https://app.supabase.com/project/[your-project-id]/sql
2. Copy and paste the SQL below into the SQL editor
3. Click "Run" to execute

## SQL Commands

```sql
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
```

## Test the Table

After running the SQL above, test it with:

```sql
-- Insert a test record
INSERT INTO emails (name, email, purpose, message, source) 
VALUES ('Test User', 'test@example.com', 'demo', 'Test message', 'contact_form');

-- Query the table
SELECT * FROM emails;

-- Test the stats function
SELECT * FROM get_email_stats();

-- Clean up test record
DELETE FROM emails WHERE email = 'test@example.com';
```

## API Endpoints Available After Creation

Once the table is created, these API endpoints will be available:

- `GET /api/v1/emails/stats` - Get email statistics (admin only)
- `GET /api/v1/emails/subscribers` - Get all subscribers with pagination (admin only)  
- `GET /api/v1/emails/export` - Export subscribers as CSV (admin only)
- `POST /api/v1/emails/subscribe` - Add email to mailing list
- `PUT /api/v1/emails/unsubscribe/:email` - Unsubscribe email
- `DELETE /api/v1/emails/:id` - Delete email (admin only)

## Usage Examples

### Get Email Statistics
```bash
curl -X GET "http://localhost:3000/api/v1/emails/stats" \
  -H "Authorization: Bearer your-admin-api-key"
```

### Export Subscribers
```bash
curl -X GET "http://localhost:3000/api/v1/emails/export?purpose=demo" \
  -H "Authorization: Bearer your-admin-api-key"
```

### Subscribe to Newsletter
```bash
curl -X POST "http://localhost:3000/api/v1/emails/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","purpose":"newsletter","source":"website"}'
```

## Features

✅ **Contact Form Integration** - Automatically stores contact form submissions  
✅ **Bulk Email Export** - Export subscriber lists as CSV for email marketing tools  
✅ **Subscription Management** - Subscribe/unsubscribe functionality  
✅ **Segmentation** - Filter by purpose (demo, enterprise, etc.) and source  
✅ **Analytics** - Email statistics and signup tracking  
✅ **Duplicate Prevention** - Unique constraint on email+source  
✅ **GDPR Compliance** - Unsubscribe and delete functionality 