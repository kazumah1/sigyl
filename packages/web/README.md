# SIGYL Agent Forge

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
1. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_DEBUG=true
```

2. Get your Supabase credentials:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Settings → API
   - Copy Project URL and anon public key

3. Set up GitHub OAuth:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set Homepage URL: `http://localhost:8088`
   - Set Authorization callback URL: `http://localhost:8088/auth/callback`
   - Copy Client ID and Client Secret

4. Configure Supabase Authentication:
   - Go to your Supabase project → Authentication → Providers
   - Enable GitHub provider
   - Add your GitHub OAuth Client ID and Client Secret

5. Set up database tables (run in Supabase SQL Editor):
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

## 🏗️ Architecture Overview

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom dark theme
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
