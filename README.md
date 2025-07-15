# SIGYL MCP Platform

A complete platform for developing, deploying, and managing Model Context Protocol (MCP) servers. Sigyl provides everything you need to build, share, and deploy MCP integrations with  security and scalability.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Clone and Setup

```bash
git clone https://github.com/sigyl-dev/sigyl.git
cd sigyl
npm install
```

### Development

```bash
# Start all services for development
npm run dev:api    # Registry API (http://localhost:3000)
npm run dev:web    # Web Dashboard (http://localhost:8080)

# Build all packages
npm run build

# Run tests
npm run test
```

## 📦 Project Structure

This is a monorepo containing the complete Sigyl platform:

```
sigyl/
├── packages/
│   ├── cli/ts-cli/          # 🔧 TypeScript CLI for MCP development
│   ├── registry-api/        # 🌐 Express.js API server + deployment system
│   ├── web/                 # 💻 React dashboard (frontend)
│   └── sdk/                 # 📚 JavaScript/TypeScript SDK
├── examples/                # 📝 Example MCP servers and usage
└── state/                   # 📋 Planning and project documentation
```

### Package Details

| Package | Description | Status |
|---------|-------------|--------|
| **`@sigyl-dev/cli`** | Official CLI for installing and managing MCP packages | ✅ Production |
| **`@sigyl/registry-api`** | REST API for package registry and deployment | ✅ Production |
| **`@sigyl/web`** | React dashboard for package management | ✅ Production |
| **`@sigyl/sdk`** | Programmatic SDK for registry access | ✅ Production |

## 🏗️ Architecture

### Core Components

1. **Registry API** (`packages/registry-api/`)
   - Express.js REST API
   - PostgreSQL database (Supabase)
   - Google Cloud Run deployment
   - Security validation system
   - GitHub App integration

2. **Web Dashboard** (`packages/web/`)
   - React + TypeScript + Vite
   - Tailwind CSS styling
   - Supabase authentication
   - Sigyl Platform UI

3. **CLI Tool** (`packages/cli/ts-cli/`)
   - TypeScript CLI with Commander.js
   - Zero-config public package installation
   - API key authentication for private packages
   - MCP server scaffolding and development tools

4. **SDK** (`packages/sdk/`)
   - Programmatic access to registry
   - TypeScript types and interfaces
   - Used by CLI and other integrations

### Technology Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth + GitHub OAuth
- **Deployment**: Google Cloud Run + Docker
- **Build System**: TypeScript + npm workspaces

## 🛠️ Development Setup

### Environment Configuration

1. **Registry API** (`packages/registry-api/.env`):
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Optional
PORT=3000
NODE_ENV=development
```

2. **Web Dashboard** (`packages/web/.env`):
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_REGISTRY_API_URL=http://localhost:3000
```

### Running Individual Services

```bash
# Registry API only
cd packages/registry-api
npm run dev

# Web dashboard only  
cd packages/web
npm run dev

# CLI development
cd packages/cli/ts-cli
npm run build
```

### Database Setup

The platform uses Supabase for the database. See `packages/web/supabase/migrations/` for the database schema.

## 📚 Usage Examples

### Installing MCP Packages (End Users)

```bash
# Install the CLI
npm install -g @sigyl-dev/cli

# Install any public MCP package
sigyl install weather-tools
sigyl install database-connector

# For private packages, configure API key
sigyl config
sigyl install my-private-package
```

### Using the SDK (Developers)

```typescript
import { SigylRegistry } from '@sigyl/sdk';

const registry = new SigylRegistry({
  apiKey: 'your-api-key', // Optional for public packages
  baseUrl: 'https://api.sigyl.dev'
});

// Search packages
const packages = await registry.searchPackages('weather');

// Get package details
const pkg = await registry.getPackage('weather-tools');

// Install programmatically
await registry.installPackage('weather-tools');
```

### Deploying MCP Servers

```bash
# Using the web dashboard
1. Go to https://sigyl.dev/deploy
2. Connect your GitHub repository
3. Configure deployment settings
4. Deploy with one click

# Using the API directly
curl -X POST https://api.sigyl.dev/api/v1/deploy \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/user/my-mcp-server"}'
```

## 🔒 Security

Sigyl includes comprehensive security validation:

- **Code analysis** for malicious patterns
- **Dependency scanning** for known vulnerabilities  
- **Container security** with minimal attack surface
- **API key authentication** with scoped permissions
- **Rate limiting** and DDoS protection

## 🚀 Deployment

### Production Deployment

The platform is designed for cloud deployment:

- **API**: Google Cloud Run (auto-scaling)
- **Frontend**: Static hosting (Vercel/Netlify compatible)
- **Database**: Supabase (managed PostgreSQL)
- **Container Registry**: Google Container Registry

### Docker Support

```bash
# Build production images
docker build -f Dockerfile-sample.txt -t sigyl-api .

# Run with docker-compose
docker-compose up
```

### Development Workflow

1. **Code Quality**: TypeScript strict mode, ESLint, Prettier
2. **Testing**: Jest for unit tests, integration tests for APIs
3. **Build**: All packages must build successfully
4. **Deployment**: Automated deployment via GitHub Actions

## 📖 Documentation

- **API Documentation**: See `packages/registry-api/README.md`
- **CLI Documentation**: See `packages/cli/ts-cli/README.md` 
- **Web Documentation**: See `packages/web/README.md`
- **SDK Documentation**: See `packages/sdk/README.md`

---

**Sigyl** - The complete platform for Model Context Protocol development and deployment. 