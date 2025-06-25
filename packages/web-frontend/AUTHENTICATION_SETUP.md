# GitHub OAuth Authentication Setup

This guide will help you set up GitHub OAuth authentication for the SIGYL application.

## Prerequisites

1. A GitHub account
2. A Supabase account (free tier works fine)
3. Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Note down your project URL and anon key from the API settings

## Step 2: Configure GitHub OAuth

1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "OAuth Apps"
3. Click "New OAuth App"
4. Fill in the following details:
   - **Application name**: SIGYL Agent Forge
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Authorization callback URL**: `http://localhost:5173/auth/callback`
   - **Description**: MCP Server Deployment Platform

5. Click "Register application"
6. Note down the **Client ID** and **Client Secret**

## Step 3: Configure Supabase Authentication

1. In your Supabase dashboard, go to "Authentication" > "Providers"
2. Find "GitHub" and click "Edit"
3. Enable GitHub authentication
4. Enter your GitHub OAuth credentials:
   - **Client ID**: Your GitHub OAuth app client ID
   - **Client Secret**: Your GitHub OAuth app client secret
5. Save the configuration

## Step 4: Set Up Environment Variables

1. Create a `.env` file in your project root
2. Add the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace the placeholder values with your actual Supabase project URL and anon key.

## Step 5: Set Up Database Tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  github_username TEXT,
  github_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'active', 'failed', 'stopped')),
  config JSONB,
  github_repo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own deployments" ON deployments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployments" ON deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments" ON deployments
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, github_username, github_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'sub',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Step 6: Configure GitHub OAuth Scopes

The application requests the following GitHub scopes:
- `read:user` - Read user profile information
- `user:email` - Read user email addresses
- `repo` - Full access to repositories (for deployment)

These scopes are configured in the `AuthContext.tsx` file.

## Step 7: Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to the Deploy page
3. You should see an authentication prompt
4. Click "Sign in with GitHub"
5. Complete the GitHub OAuth flow
6. You should be redirected back to the Deploy page as an authenticated user

## Production Deployment

For production deployment:

1. Update your GitHub OAuth app settings:
   - **Homepage URL**: Your production domain
   - **Authorization callback URL**: `https://yourdomain.com/auth/callback`

2. Update your Supabase project settings:
   - Go to "Authentication" > "URL Configuration"
   - Set your production domain in the Site URL
   - Add your production domain to the redirect URLs

3. Set your production environment variables

## Security Considerations

1. **Environment Variables**: Never commit your `.env` file to version control
2. **OAuth Secrets**: Keep your GitHub OAuth client secret secure
3. **Row Level Security**: The database is configured with RLS to ensure users can only access their own data
4. **HTTPS**: Always use HTTPS in production for secure OAuth flows

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**: Make sure your callback URL exactly matches what's configured in GitHub
2. **"Missing environment variables" error**: Check that your `.env` file is in the project root and contains the correct values
3. **Database errors**: Ensure you've run the SQL setup script in your Supabase project
4. **Authentication not working**: Check that GitHub OAuth is enabled in your Supabase dashboard

### Debug Mode

To enable debug logging, add this to your `.env` file:

```env
VITE_DEBUG=true
```

This will log authentication events to the browser console.

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase and GitHub OAuth configurations
3. Ensure all environment variables are set correctly
4. Check that the database tables and policies are created properly 