# SIGYL

A modern, dark-themed web application for deploying and managing MCP (Model Context Protocol) servers with GitHub OAuth authentication and a dynamic marketplace.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- GitHub account (for OAuth)

### Installation
```bash
git clone <repository-url>
cd sigyl-agent-forge
npm install
```

### Environment Setup
1. Copy the example environment file and configure it:
```bash
cp .env.example .env
```

2. The `.env` file contains shared configuration for the development team:
```env
# Supabase Configuration (Shared across team)
VITE_SUPABASE_URL=https://zcudhsyvfrlfgqqhjrqv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWRoc3l2ZnJsZmdxcWhqcnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MjkzMDMsImV4cCI6MjA2NjQwNTMwM30.Ta6FaWtEVw28AwVN06EUT-dBHGgRYribqwdqWK7H49A

# Debug mode (Optional)
VITE_DEBUG=true

# GitHub App Configuration (Shared across team)
VITE_GITHUB_APP_NAME=sigyl-dev
VITE_GITHUB_APP_ID=1459404
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAwyxzCp7Yy41dUr1g8soUyCHte5MtPaa+iKNFKmyZFDX7+TTT41vgzmk2+CmXwnOGcMpnvwDD19wCsXjcSb21W/n4btOG2x5Kwku5OdagF7JrqpruBAjH+j1Zx2mhNxQguOc+xzHX5NUoJjw0PGAn0lWT+pRTVV2/2dy2TPWfGerqyz9I0jjDRuZkwVMCbhOYjIcGiqA/9j/AwIkD64zEArrz/B/7gItG0yppd+95eJPb9Es6Zsi98GWlQlFFdZ0ofV72jbfgLzQ2OLBIS8mUNr8dGADNmgVCwXR8Px79gIsr32x7TRpoDjrCNzREtEqWx3fB6lkTXLH1z3foCQOSBwIDAQABAoIBAQCViaf3Gi/W/c/kBg+S1jxH/p67UM+X7fsMK7RhxeUftCEEFnLGP24mGD0ytIN/TA5Uuu/0SzzCVeKGYai+oyiieQrctxsbJcF3zpbzdrsgjOarR5tX4fZ+h6UTAZ6w2a4cnaje7BSTUrI5YWVQYQgBwunnUt/qhzLoVJAktQiazKi6LyAGSi6Gi28zkKQndDncmi9QUWdtMIImQjfRtyWQPoz0y3uUe7TbwJPwLZ2d6KKIgK1Pjm5Pqt9u23SDTJGUsFtC6SRvj+8s5wje1p6pIPv4EsIP3wvlchs6l+iWzXXhDegYUuN+7hgh5X6jc81Zw72J2LKlaklTcKSlzak5AoGBAO3cFEU2JujWuAvoXv60Pem6AtV3iSeFQHtN5uK696Vbtwp67CSyKk9chxVE/SSX5vSxFS43znmWnXVle/bbt53WUys+e6TcVbZXUY5Nh9zCME+D+qusEi9AtKWpClHOKiIrRLbV4hi77+L8Xdz5AUJDzlM65InznsE5wg3SWJ3tAoGBANIO+hmh0c30M4SccpSwoV937L4ZxTk1yohuITGXXn7N0qQtL4jDCJyYLBohfgvAFK/UBtfzTwLktECOR4wkzdM0cS8XenmR9BEMtZ4huRM12cxateE6pcMN/K7KZLz/Kf0AVHFjVjUD50Q8rg3/O+2BeBhBndxlBGLSkEhf+5FDAoGAWqbCrvIJeDnFIPypn6bv5bD3vYV2JzK4tYWmFgktsr62ju70KrQgPejErs2BML4Xzm/i459vOJW3YvOPgDCS1TvGrLd+hgFXRUwYEATqX68+nD9vfJfywkGF15EKFs1c73LQGGKBbe3KahbGax4XZbrT2pKaYR0RBxFNLNla3q0CgYBIJurTSRkWxC25/D8DQdR8RWYlOhbbetWRnTpnUHRDoOu7vJn6I4Zs89aPmzcPmMcrhiXrrRSCxq7HeQHiFDGnjnOciMYhQCvpozvvyeiKJoiLnpQ3eM4J6LGqzCFFqRmiel3dSaUWT3j22/x0NzVzOXidw9xN6WVCDyVD5sKnwKBgQCxdgM/FxNMFlYE7IufaRqH4xH6aEmaybB8OPgivZ7EG2X7qGiGxfuGPxzqeS2MKAedsiATkOAaCv+WqKV+EAmZNUVEdQgJdWIYHxpPzUKBWTVl/BSFOlj3bSdEtgHgQ0v60lUkgxl+2dSQLUe80n6tAkhf/VLHZwWXRgRyyfPOHA==\n-----END RSA PRIVATE KEY-----"
GITHUB_CLIENT_SECRET=a20f634c1afc841b69bd68424032c3dc522024cc

# Registry API (Shared across team)
VITE_REGISTRY_API_URL=http://localhost:3000
```

**Note**: This configuration uses a shared Supabase project and GitHub App for the development team. All developers can use the same `.env` file.

2. Get your Supabase credentials:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Settings → API
   - Copy Project URL and anon public key

3. Set up GitHub OAuth and GitHub App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set Homepage URL: `http://localhost:8088`
   - Set Authorization callback URL: `http://localhost:8088/auth/callback`
   - Copy Client ID and Client Secret
   - Create a GitHub App for deployment functionality
   - Generate a private key for the GitHub App
   - Note the App ID

4. Configure Supabase Authentication:
   - Go to your Supabase project → Authentication → Providers
   - Enable GitHub provider
   - Add your GitHub OAuth Client ID and Client Secret

5. Set up the Registry API:
   - Ensure the registry API is running on the specified URL
   - The API should provide MCP server templates and deployment endpoints

6. Set up database tables (run in Supabase SQL Editor):
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

-- Create marketplace_items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  tags TEXT[],
  rating DECIMAL(3,2) DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  github_url TEXT,
  documentation_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Run the Application
```bash
npm run dev
```
Visit `http://localhost:8088`

## 🔧 Environment Variables

### Shared Configuration (All Developers)

This project uses a shared Supabase project and GitHub App for development. All developers can use the same environment configuration.

#### Supabase Configuration
- **`VITE_SUPABASE_URL`**: Shared Supabase project URL
  - Value: `https://zcudhsyvfrlfgqqhjrqv.supabase.co`
- **`VITE_SUPABASE_ANON_KEY`**: Shared Supabase anonymous/public key
  - This is a public key and safe to share

#### GitHub Configuration
- **`VITE_GITHUB_APP_NAME`**: Shared GitHub App name
  - Value: `sigyl-dev`
- **`VITE_GITHUB_APP_ID`**: Shared GitHub App ID
  - Value: `1459404`
- **`GITHUB_PRIVATE_KEY`**: Shared GitHub App private key
  - This key is used for deployment operations
- **`GITHUB_CLIENT_SECRET`**: Shared GitHub OAuth client secret
  - Used for user authentication

#### Registry API
- **`VITE_REGISTRY_API_URL`**: Shared MCP registry API URL
  - Value: `http://localhost:3000`
  - Must be running for MCP template loading and deployments

### Optional Variables
- **`VITE_DEBUG`**: Enable debug mode
  - Set to `true` for development debugging
  - Default: `false`

### Security Notes
- The `.env` file contains shared development credentials
- Never commit the `.env` file to version control (already in `.gitignore`)
- For production, use separate credentials and environment-specific configuration
- The GitHub private key is shared for development but should be rotated regularly

## 🏗️ Architecture Overview

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom dark theme
    * className=“btn-modern hover:bg-neutral-900 hover:text-white”: default outlined button style
    * className=“btn-modern-inverted hover:bg-neutral-900 hover:text-white”: filled white button style
- **Routing**: React Router v6
- **UI Components**: Custom components + shadcn/ui
- **State Management**: React Context (AuthContext)
- **Animations**: CSS animations + Canvas-based math animations

### Backend (Supabase)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with GitHub OAuth
- **Real-time**: Supabase real-time subscriptions
- **Storage**: Supabase Storage (for future file uploads)

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── AgentHighway.tsx # Marketplace animation
│   ├── MathyGraphs.tsx  # Landing page background
│   ├── UserProfile.tsx  # User dropdown
│   └── ProtectedRoute.tsx # Auth protection
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state
├── lib/                 # Utilities and configs
│   └── supabase.ts      # Supabase client
├── pages/               # Page components
│   ├── Index.tsx        # Landing page
│   ├── Marketplace.tsx  # MCP marketplace
│   ├── Deploy.tsx       # Deployment interface
│   ├── Blog.tsx         # Blog page
│   ├── Docs.tsx         # Documentation
│   ├── NotFound.tsx     # 404 page
│   └── AuthCallback.tsx # OAuth callback
├── services/            # Business logic
│   └── deploymentService.ts # Deployment operations
└── App.tsx              # Main app component
```

## 🎨 Design System

### Theme
- **Primary**: Dark theme with vibrant indigo accents
- **Colors**: Black backgrounds, white text, indigo (#6366F1) accents
- **Typography**: Modern sans-serif fonts
- **Animations**: Smooth CSS transitions and canvas-based math animations

### Key Visual Features
- **Landing Page**: Animated mathematical background (MathyGraphs)
- **Marketplace**: Agent highway with flowing lines and animated beads
- **Consistent Header**: Fixed navigation with user profile dropdown
- **Scroll-based Reveals**: Content appears on scroll with animations

## 🔐 Authentication System

### Implementation Status: ✅ Complete
- GitHub OAuth integration via Supabase
- Protected routes for deployment functionality
- User profile dropdown with avatar
- Automatic redirect to login when accessing protected features

### How It Works
1. User clicks "Sign in with GitHub" on Deploy page
2. Redirected to GitHub OAuth
3. Returns to `/auth/callback` with authorization code
4. Supabase exchanges code for access token
5. User session stored in AuthContext
6. Protected routes check authentication status

## 🛍️ Marketplace System

### Implementation Status: 🟡 Partially Complete

#### What's Working:
- ✅ Dynamic agent highway animation
- ✅ Marketplace cards with search/filter
- ✅ Modal popup with MCP details
- ✅ Interactive star rating system (localStorage)
- ✅ Install button with auth check
- ✅ Responsive design with backdrop blur

#### What's Frontend-Only (No Backend):
- **MCP Data**: Currently using hardcoded `marketplaceItems` array
- **Ratings**: Stored in localStorage, not persisted to database
- **Downloads**: Static numbers, not real tracking
- **Search/Filter**: Client-side filtering only

#### What Needs Backend Integration:
- **CSV Import**: Connect to real MCP data sources
- **Rating Persistence**: Store ratings in database
- **Download Tracking**: Real download analytics
- **Search**: Server-side search with pagination

### Adding CSV Integration

To connect real MCP data from CSV files:

1. **Create CSV Structure**:
```csv
name,description,author,tags,rating,downloads,github_url,documentation_url
"Example MCP","A sample MCP server","John Doe","api,database,5.0,1234,https://github.com/example/mcp,https://docs.example.com"
```

2. **Add CSV Loading Service**:
```typescript
// src/services/marketplaceService.ts
export const loadMCPsFromCSV = async (csvUrl: string) => {
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  // Parse CSV and return structured data
  return parseCSV(csvText);
};
```

3. **Update Marketplace Component**:
```typescript
// In Marketplace.tsx
const [mcps, setMcps] = useState([]);

useEffect(() => {
  const loadMCPs = async () => {
    const data = await loadMCPsFromCSV('/public/mcps.csv');
    setMcps(data);
  };
  loadMCPs();
}, []);
```

## 🚀 Deployment System

### Implementation Status: 🟡 Partially Complete

#### What's Working:
- ✅ Deployment form with template selection
- ✅ Real-time deployment status updates
- ✅ Deployment dashboard with progress tracking
- ✅ Integration with authentication system
- ✅ Deployment history storage in database

#### What's Frontend-Only:
- **Actual Deployment**: Currently simulated with setTimeout
- **Cloud Integration**: No real cloud provider integration
- **GitHub Integration**: No real repository creation

#### What Needs Implementation:
- **Real Deployment Pipeline**: Connect to actual cloud providers
- **GitHub API**: Create repositories and deploy code
- **MCP Server Templates**: Real MCP server templates
- **Environment Variables**: Secure environment management

### Deployment Flow
1. User selects MCP template
2. Fills in configuration form
3. Clicks "Deploy"
4. System creates GitHub repository
5. Deploys to cloud provider
6. Returns deployment URL and status

## 📊 Database Schema

### Tables

#### `users`
- `id`: UUID (references auth.users)
- `email`: TEXT
- `github_username`: TEXT
- `github_id`: TEXT
- `avatar_url`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `deployments`
- `id`: UUID
- `user_id`: UUID (references users)
- `name`: TEXT
- `template_id`: TEXT
- `status`: TEXT (pending, deploying, active, failed, stopped)
- `config`: JSONB
- `github_repo`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

#### `marketplace_items`
- `id`: UUID
- `name`: TEXT
- `description`: TEXT
- `author`: TEXT
- `tags`: TEXT[]
- `rating`: DECIMAL(3,2)
- `downloads`: INTEGER
- `github_url`: TEXT
- `documentation_url`: TEXT
- `created_at`: TIMESTAMP

## 🔧 Development Guide

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in header components
4. Follow existing theme patterns

### Adding New Components
1. Create in `src/components/`
2. Use TypeScript interfaces
3. Follow existing styling patterns
4. Add to exports if needed

### Styling Guidelines
- Use Tailwind CSS classes
- Follow dark theme color scheme
- Use backdrop blur for overlays
- Implement smooth animations
- Ensure responsive design

### Authentication Patterns
```typescript
// Check if user is authenticated
const { user } = useAuth();
if (!user) {
  // Redirect to login or show login prompt
}

// Protect routes
<ProtectedRoute>
  <Component />
</ProtectedRoute>
```

## 🚧 TODO / Next Steps

### High Priority
1. **Real Deployment Pipeline**
   - Integrate with cloud providers (AWS, GCP, Azure)
   - Implement GitHub API for repository creation
   - Add real MCP server templates

2. **CSV Integration**
   - Create CSV parser service
   - Add CSV upload functionality
   - Implement real-time CSV updates

3. **Backend API Endpoints**
   - Create REST API for marketplace data
   - Implement search and filtering
   - Add rating persistence

### Medium Priority
1. **Enhanced Marketplace**
   - Add MCP categories and tags
   - Implement advanced search
   - Add user reviews and comments

2. **Deployment Monitoring**
   - Real-time deployment logs
   - Performance monitoring
   - Cost tracking

3. **User Management**
   - User profiles and settings
   - Team collaboration features
   - Usage analytics

### Low Priority
1. **Advanced Features**
   - MCP versioning
   - A/B testing for deployments
   - Integration marketplace

2. **Performance Optimizations**
   - Code splitting
   - Image optimization
   - Caching strategies

## 🐛 Known Issues

1. **Export/Import Mismatches**: Some components use default exports while others use named exports
2. **Environment Variables**: Need proper validation and error handling
3. **Mobile Responsiveness**: Some animations may not work well on mobile
4. **Error Boundaries**: Missing comprehensive error handling

## 📚 API Reference

### Supabase Client
```typescript
import { supabase } from '@/lib/supabase';

// Authentication
const { data: { user } } = await supabase.auth.getUser();
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github'
});

// Database
const { data, error } = await supabase
  .from('deployments')
  .select('*')
  .eq('user_id', user.id);
```

### Auth Context
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, signIn, signOut, loading } = useAuth();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code patterns
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

[Add your license here]

---

**Last Updated**: January 2025
**Status**: Development in Progress
**Next Milestone**: Real deployment pipeline integration

## Dashboard MCP Server List Behavior

- The dashboard now lists all MCP servers (from the `mcp_packages` table) where the `author_id` matches the current user's profile UUID (from the `profiles` table, matched by `github_id`).
- This replaces the previous logic that listed servers by workspace.
- The user's GitHub ID is used to look up their profile UUID, which is then used to filter MCP packages.
- Only MCP servers/packages created by the logged-in user will appear in their dashboard.
