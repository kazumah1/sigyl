# SIGIL MCP Registry & Hosting Platform - Web Frontend

A modern, React-based web application that provides the user interface for the SIGIL MCP (Model Context Protocol) Registry & Hosting Platform. This frontend enables developers to deploy, discover, and manage MCP servers through an intuitive, dark-themed interface with GitHub OAuth authentication.

## 🎯 Product Overview

**SIGIL** is an end-to-end platform for MCP (Model Context Protocol) package management and deployment, consisting of:

### Core Platform Components
- **Registry API** (`packages/registry-api`) - Express + PostgreSQL backend for package management
- **Web Frontend** (`packages/web-frontend`) - React interface for deployment and discovery  
- **CLI Tool** (`packages/cli`) - Command-line interface for developers
- **Container Builder** (`packages/container-builder`) - Docker containerization service
- **Hosting Integration** - Railway/Render deployment pipeline

### Key Features
- **🚀 One-Click Deployment**: Deploy MCP servers directly from GitHub repositories
- **🔍 Package Discovery**: Browse and search MCP packages in a visual marketplace
- **🔐 GitHub Integration**: OAuth authentication with repository access
- **📊 Real-time Monitoring**: Track deployment status and health
- **🎨 Modern UI**: Dark theme with animated backgrounds and responsive design
- **♟️ Interactive Elements**: 3D chess components and mathematical visualizations

## 🏗️ Frontend Architecture

### Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: shadcn/ui + Radix UI primitives
- **3D Graphics**: Three.js with React Three Fiber
- **Authentication**: Supabase Auth with GitHub OAuth
- **State Management**: React Context + Custom Hooks
- **Routing**: React Router v6
- **API Integration**: Fetch API with TypeScript types

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui component library
│   ├── chess/           # 3D chess game components
│   ├── AgentHighway.tsx # Marketplace animation
│   ├── Chess3D.tsx      # Interactive 3D chess pieces
│   ├── DeployWizard.tsx # Step-by-step deployment interface
│   ├── DeploymentDashboard.tsx # User deployment management
│   ├── InteractiveBackground.tsx # Animated backgrounds
│   ├── MathyGraphs.tsx  # Mathematical visualization
│   ├── OpeningAnimation.tsx # Landing page animations
│   ├── ProtectedRoute.tsx # Authentication guards
│   ├── ThemeToggle.tsx  # Theme switching controls
│   └── UserProfile.tsx  # User dropdown menu
├── contexts/            # React context providers
│   ├── AuthContext.tsx  # GitHub OAuth authentication
│   └── ThemeContext.tsx # Theme management
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
│   ├── supabase.ts      # Supabase client setup
│   └── github.ts        # GitHub API integration
├── pages/               # Application pages
│   ├── Index.tsx        # Landing page with animations
│   ├── Marketplace.tsx  # MCP package discovery
│   ├── Deploy.tsx       # Deployment interface
│   ├── Blog.tsx         # Editorial blog content
│   ├── Docs.tsx         # Documentation browser
│   ├── AuthCallback.tsx # OAuth callback handler
│   └── NotFound.tsx     # 404 error page
├── services/            # Business logic services
│   ├── deploymentService.ts # MCP deployment logic
│   └── deploymentService 2.ts # Enhanced deployment features
└── types/               # TypeScript type definitions
```

## 🔐 Authentication System

### GitHub OAuth Integration
- **Provider**: Supabase Auth with GitHub OAuth
- **Scopes**: `read:user`, `user:email`, `repo` (for deployment access)
- **Flow**: OAuth 2.0 with PKCE for secure authentication
- **Session Management**: Automatic token refresh and persistence

### Authentication Features
- **Protected Routes**: Deploy functionality requires authentication
- **User Profiles**: Automatic profile creation with GitHub metadata
- **Repository Access**: Private repository support for MCP detection
- **Secure Sessions**: Row-level security with Supabase

### Database Schema
```sql
-- Users table with GitHub integration
users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  github_username TEXT,
  github_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Deployments tracking
deployments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'deploying', 'active', 'failed', 'stopped')),
  github_repo TEXT,
  deployment_url TEXT,
  created_at TIMESTAMP
)
```

## 🚀 Deployment System

### MCP Server Deployment Pipeline
1. **Repository Selection**: Browse user's GitHub repositories
2. **MCP Detection**: Automatic detection of `mcp.yaml` configuration files
3. **Configuration**: Environment variables and deployment settings
4. **Container Build**: Docker containerization (via Container Builder service)
5. **Hosting Deploy**: Deployment to Railway/Render platforms
6. **Registry Registration**: Automatic registration in MCP Registry API

### Deployment Features
- **GitHub Integration**: Direct repository access and branch selection
- **Template Support**: Pre-built MCP server templates
- **Custom Configuration**: Environment variables and advanced settings
- **Real-time Status**: Live deployment progress and health monitoring
- **Deployment Dashboard**: Manage multiple deployments with status tracking

### Integration with Registry API
```typescript
// Deployment service integration
const REGISTRY_API_BASE = 'http://localhost:3000/api/v1'

// Register deployed MCP in registry
await fetch(`${REGISTRY_API_BASE}/packages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: mcpName,
    description: mcpDescription,
    github_url: repoUrl,
    deployment_url: deploymentUrl,
    tools: extractedTools
  })
})
```

## 🛍️ Marketplace System

### Package Discovery
- **Visual Marketplace**: Grid-based package browser with animated highway
- **Search & Filter**: Real-time search with tag-based filtering
- **Package Details**: Modal popups with comprehensive package information
- **Interactive Ratings**: Star-based rating system with localStorage persistence
- **Installation Flow**: One-click deployment from marketplace packages

### Marketplace Features
- **Agent Highway Animation**: Flowing lines with animated beads
- **MCP Detection Badges**: Visual indicators for MCP-compatible repositories
- **Category Organization**: Tag-based package categorization
- **Author Information**: GitHub integration for package authors
- **Download Tracking**: Package popularity metrics

### Data Integration
```typescript
// Package data structure
interface MarketplaceItem {
  id: string
  name: string
  description: string
  author: string
  tags: string[]
  rating: number
  downloads: number
  github_url: string
  documentation_url?: string
}
```

## 🎨 Design System

### Visual Theme
- **Primary Colors**: Dark backgrounds with vibrant indigo (#6366F1) accents
- **Secondary Colors**: Pink (#EC4899), green (#10B981), purple (#8B5CF6)
- **Theme Variants**: Vibrant, sunset, ocean, forest color schemes
- **Typography**: Modern sans-serif with hierarchical sizing
- **Animations**: Smooth CSS transitions and Canvas-based effects

### Interactive Elements
- **3D Chess Components**: Interactive chess pieces with Three.js
- **Animated Backgrounds**: Mathematical graphs and topological networks
- **Hover Effects**: Smooth scaling and color transitions
- **Loading States**: Geometric loading animations
- **Page Transitions**: Smooth navigation between routes

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch Interactions**: Mobile-friendly 3D controls
- **Adaptive Layouts**: Flexible component arrangements
- **Performance**: Optimized animations for mobile devices

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn package manager
- Supabase account (for authentication and database)
- GitHub OAuth app (for authentication)

### Environment Configuration
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Registry API Integration
VITE_REGISTRY_API_URL=http://localhost:3000/api/v1

# Debug Mode
VITE_DEBUG=true
```

### Installation & Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### GitHub OAuth Setup
1. Create GitHub OAuth App at https://github.com/settings/developers
2. Set Authorization callback URL: `http://localhost:8080/auth/callback`
3. Configure Supabase with GitHub OAuth credentials
4. Enable GitHub provider in Supabase Authentication settings

## 🧰 Key Components

### DeployWizard (`components/DeployWizard.tsx`)
Multi-step deployment interface with:
- Repository selection and MCP detection
- Environment variable configuration
- Deployment progress tracking
- Integration with Registry API

### DeploymentDashboard (`components/DeploymentDashboard.tsx`)
User deployment management featuring:
- Deployment status monitoring
- Health check integration
- Deployment history and logs
- Quick deployment actions

### Chess3D (`components/Chess3D.tsx`)
Interactive 3D chess component with:
- Three.js rendering with realistic lighting
- Mouse/touch interaction for piece movement
- Theme-aware color schemes
- Smooth animations and transitions

### InteractiveBackground (`components/InteractiveBackground.tsx`)
Animated background system featuring:
- Multiple theme variants (vibrant, sunset, ocean, forest)
- Mathematical graph visualizations
- Performance-optimized canvas rendering
- Responsive design adaptation

## 🌐 API Integration

### Registry API Integration
- **Base URL**: `http://localhost:3000/api/v1`
- **Endpoints**: `/packages`, `/packages/search`, `/packages/:name`
- **Authentication**: Supabase JWT tokens
- **Error Handling**: Comprehensive error management with fallbacks

### GitHub API Integration
- **Repository Access**: List public and private repositories
- **MCP Detection**: Automatic scanning for MCP configuration files
- **Branch Management**: Support for multiple branches
- **File Access**: Direct file content retrieval for analysis

### Supabase Integration
- **Authentication**: GitHub OAuth with automatic profile creation
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: Live deployment status updates
- **Storage**: Future file upload capabilities

## 🚀 Production Deployment

### Build Configuration
```bash
# Production build with optimizations
npm run build

# Build artifacts in dist/ directory
# - Optimized React bundle
# - CSS with Tailwind purging
# - Asset optimization and minification
```

### Environment Variables (Production)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_REGISTRY_API_URL=https://api.yourdomain.com/api/v1
```

### Hosting Platforms
- **Vercel**: Recommended for React/Vite applications
- **Netlify**: Alternative with good React support
- **Railway**: Integrated with platform hosting
- **GitHub Pages**: For static deployments

## 🧪 Testing Strategy

### Component Testing
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Component interaction testing
- **3D Component Tests**: Three.js rendering validation
- **Authentication Tests**: OAuth flow simulation

### End-to-End Testing
- **Deployment Flow**: Full deployment pipeline testing
- **Marketplace**: Package discovery and installation
- **Authentication**: GitHub OAuth integration
- **Cross-browser**: Multiple browser compatibility

## 📈 Performance Optimization

### Loading Performance
- **Code Splitting**: Route-based lazy loading
- **Asset Optimization**: Image compression and WebP support
- **Bundle Analysis**: Webpack bundle analyzer integration
- **CDN Integration**: Static asset delivery optimization

### Runtime Performance
- **React Optimization**: Proper memo usage and state management
- **3D Rendering**: Optimized Three.js scene management
- **Animation Performance**: RequestAnimationFrame for smooth animations
- **Mobile Optimization**: Touch-friendly interactions and reduced complexity

## 🔒 Security Considerations

### Authentication Security
- **OAuth Best Practices**: PKCE flow with secure token storage
- **Session Management**: Automatic token refresh and validation
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive form validation with Zod

### Data Security
- **Row Level Security**: Database-level access control
- **API Security**: Request validation and rate limiting
- **Environment Variables**: Secure credential management
- **Error Handling**: No sensitive information in error messages

## 🛠️ Development Tools

### Code Quality
- **TypeScript**: Full type safety across the application
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit validation

### Development Experience
- **Vite**: Fast development server with HMR
- **React DevTools**: Component debugging and profiling
- **Supabase Studio**: Database management and monitoring
- **GitHub Integration**: Direct repository access and management

## 📚 Documentation

### User Documentation
- **Setup Guide**: Complete environment configuration
- **Deployment Tutorial**: Step-by-step deployment instructions
- **API Reference**: Integration documentation for developers
- **Troubleshooting**: Common issues and solutions

### Developer Documentation
- **Architecture Guide**: System design and component relationships
- **Contributing Guide**: Development workflow and standards
- **API Documentation**: Comprehensive endpoint documentation
- **Component Library**: UI component usage examples

## 🤝 Integration Points

### Registry API (`packages/registry-api`)
- **Package Registration**: Automatic MCP package registration
- **Search Integration**: Real-time package discovery
- **Deployment Tracking**: Status monitoring and health checks
- **User Management**: Authentication and authorization

### CLI Tool (`packages/cli`)
- **Command Integration**: Shared deployment logic
- **Configuration Sync**: Consistent deployment settings
- **Status Updates**: Unified deployment monitoring
- **Development Workflow**: Local development integration

### Container Builder (`packages/container-builder`)
- **Docker Integration**: Containerization pipeline
- **Build Management**: Automated build processes
- **Deployment Pipeline**: Hosting platform integration
- **Status Reporting**: Build and deployment status updates

---

**Status**: ✅ **Production Ready** - Comprehensive MCP deployment and discovery platform

The web frontend provides a complete user interface for the SIGIL MCP Registry & Hosting Platform, featuring modern React architecture, comprehensive GitHub integration, and a beautiful user experience for MCP server deployment and discovery.
