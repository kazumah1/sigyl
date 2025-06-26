
-- Create table for MCP package ratings
CREATE TABLE public.mcp_package_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES mcp_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(package_id, user_id)
);

-- Create table for MCP package downloads tracking
CREATE TABLE public.mcp_package_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES mcp_packages(id) ON DELETE CASCADE,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to mcp_packages table
ALTER TABLE public.mcp_packages 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.mcp_package_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_package_downloads ENABLE ROW LEVEL SECURITY;

-- RLS policies for ratings
CREATE POLICY "Anyone can view ratings" 
  ON public.mcp_package_ratings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create their own ratings" 
  ON public.mcp_package_ratings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" 
  ON public.mcp_package_ratings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS policies for downloads
CREATE POLICY "Users can view their own downloads" 
  ON public.mcp_package_downloads 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can log downloads" 
  ON public.mcp_package_downloads 
  FOR INSERT 
  WITH CHECK (true);

-- Function to update package rating average
CREATE OR REPLACE FUNCTION update_package_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mcp_packages 
  SET rating = (
    SELECT COALESCE(AVG(rating), 0.0)::DECIMAL(3,2)
    FROM mcp_package_ratings 
    WHERE package_id = COALESCE(NEW.package_id, OLD.package_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.package_id, OLD.package_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating when ratings change
CREATE TRIGGER update_package_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON mcp_package_ratings
  FOR EACH ROW EXECUTE FUNCTION update_package_rating();

-- Insert sample data
INSERT INTO mcp_packages (name, description, author_id, version, tags, downloads_count, category, verified, logo_url, screenshots, tools, rating, last_updated) VALUES
('PostgreSQL Connector', 'Seamless PostgreSQL database integration with advanced query capabilities and connection pooling.', (SELECT id FROM profiles LIMIT 1), '2.1.4', ARRAY['database', 'postgresql', 'sql'], 15420, 'database', true, '/placeholder.svg', '[]'::jsonb, '["query", "connect", "pool"]'::jsonb, 4.8, now() - interval '2 days'),
('Shopify MCP Server', 'Complete Shopify integration for product management, orders, and customer data synchronization.', (SELECT id FROM profiles LIMIT 1), '1.8.2', ARRAY['ecommerce', 'shopify', 'retail'], 8930, 'ecommerce', true, '/placeholder.svg', '[]'::jsonb, '["products", "orders", "customers"]'::jsonb, 4.6, now() - interval '5 days'),
('REST API Gateway', 'Universal REST API connector with authentication, rate limiting, and request transformation.', (SELECT id FROM profiles LIMIT 1), '3.0.1', ARRAY['api', 'rest', 'gateway'], 12850, 'api', false, '/placeholder.svg', '[]'::jsonb, '["request", "transform", "auth"]'::jsonb, 4.7, now() - interval '1 day'),
('Google Analytics Bridge', 'Real-time Google Analytics data access with custom reporting and event tracking capabilities.', (SELECT id FROM profiles LIMIT 1), '1.5.0', ARRAY['analytics', 'google', 'reporting'], 6740, 'analytics', true, '/placeholder.svg', '[]'::jsonb, '["report", "track", "analyze"]'::jsonb, 4.5, now() - interval '3 days'),
('Email Automation Hub', 'Multi-provider email service integration supporting SendGrid, Mailgun, and AWS SES.', (SELECT id FROM profiles LIMIT 1), '2.3.1', ARRAY['email', 'automation', 'sendgrid'], 4560, 'communication', true, '/placeholder.svg', '[]'::jsonb, '["send", "template", "track"]'::jsonb, 4.4, now() - interval '1 week'),
('File Storage Manager', 'Unified file storage interface supporting AWS S3, Google Cloud Storage, and Azure Blob.', (SELECT id FROM profiles LIMIT 1), '1.9.3', ARRAY['storage', 'cloud', 's3'], 3920, 'storage', false, '/placeholder.svg', '[]'::jsonb, '["upload", "download", "manage"]'::jsonb, 4.6, now() - interval '4 days');
