-- Create mcp-logos storage bucket and policies
-- This migration sets up the storage bucket for MCP package logos

-- Create the mcp-logos bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mcp-logos', 'mcp-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table for this bucket
-- (RLS is typically enabled by default, but ensuring it's on)

-- Policy to allow authenticated users to upload files to their own package folders
CREATE POLICY "Users can upload logos to their own packages" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'mcp-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mcp_packages p 
      WHERE p.author_id = auth.uid() 
      AND split_part(name, '/', 1)::uuid = p.id
    )
  );

-- Policy to allow authenticated users to update/replace logos in their own package folders
CREATE POLICY "Users can update logos in their own packages" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'mcp-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mcp_packages p 
      WHERE p.author_id = auth.uid() 
      AND split_part(name, '/', 1)::uuid = p.id
    )
  );

-- Policy to allow authenticated users to delete logos from their own package folders
CREATE POLICY "Users can delete logos from their own packages" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'mcp-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mcp_packages p 
      WHERE p.author_id = auth.uid() 
      AND split_part(name, '/', 1)::uuid = p.id
    )
  );

-- Policy to allow everyone to view/download logos (since bucket is public)
CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'mcp-logos'); 