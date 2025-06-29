-- Migration: Create emails table for contact form submissions
CREATE TABLE IF NOT EXISTS public.emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  purpose text NOT NULL,
  message text NOT NULL
); 