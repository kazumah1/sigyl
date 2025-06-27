# Sigyl MCP Platform - Technical Implementation Guide

**Last Updated:** December 18, 2024

---

## 🎯 Project Overview
The Sigyl MCP Platform enables developers to deploy Model Context Protocol (MCP) servers through a web interface with GitHub integration. The stack includes Supabase (PostgreSQL), Express (TypeScript), React (Vite), Docker, and a CLI. The platform is designed for secure, cost-effective, and scalable deployment using Google Cloud Run.

---

## 🚨 Current Issues & Fixes

### Supabase 406 Error - DEBUGGING IN PROGRESS
- **Issue:** Dashboard throws 406 (Not Acceptable) errors when querying `profiles` table
- **Error:** `GET /rest/v1/profiles?select=id&auth_type=eq.github_app&auth_user_id=eq.github_162946059 406 (Not Acceptable)`
- **Root Cause:** Row Level Security (RLS) policies on the `profiles` table were too restrictive for GitHub App users.

**Debugging Tools Created:**
- `packages/web/debug-profiles-406-error.sql` - Diagnostic script
- `packages/web/fix-profiles-rls-406-error.sql` - RLS policy fix
- `packages/web/fix-profiles-rls-nuclear.sql` - Nuclear option to disable RLS
- Enhanced logging in `workspaceService.ts`

**Current Status:** Issue persists after initial fix attempt

**Next Steps:**
1. Run diagnostic SQL script in Supabase
2. If RLS is the issue, run nuclear fix
3. Check browser console logs
4. If issue persists, investigate column structure, permissions, etc.

---

## 📦 Tech Stack Status
| Component         | Stack                        | Status & Notes                                  |
|-------------------|------------------------------|-------------------------------------------------|
| Registry DB       | Supabase (PostgreSQL)        | ✅ COMPLETE - See schema below                  |
| API Layer         | Express (TypeScript)         | ✅ COMPLETE & OPERATIONAL                       |
| CLI               | oclif (TypeScript)           | 🟡 MOSTLY COMPLETE (missing deploy)             |
| Container Hosting | Docker + Railway/Cloud Run   | 🚧 Placeholder, Cloud Run migration in progress |
| Frontend          | React + Tailwind (Vite)      | ✅ MCP EXPLORER + DEPLOY UI COMPLETE            |

---

## 🏗️ Implementation Status

### ✅ Completed Components
- **Registry API (Express):** Full CRUD, GitHub App endpoints, secrets manager, health checks, validation, CORS/security middleware
- **Database Schema (Supabase):**
  - Tables: `mcp_packages`, `mcp_deployments`, `mcp_tools`, `mcp_secrets`, `api_users`, `profiles`, `workspaces`, `metrics`
  - Features: RLS, foreign keys, JSONB fields, encryption, indexes
- **Frontend Authentication:** GitHub App flow, multi-account, session management
- **MCP Explorer & Marketplace:** Search, filter, detail pages, tool listings, deployment status
- **Secrets Manager:** AES-256-GCM encryption, CRUD, user isolation, UI integration
- **YAML Secrets Parsing:** YAML validation, secrets extraction, DB storage, API endpoints

### 🟡 Partially Complete
- **Deployment Flow:** UI complete, backend simulation only
- **Container Builder:** Placeholder only, no real Docker logic
- **CLI Tool:** Structure complete, missing deploy command

### ❌ Not Implemented
- **Real Hosting Integration:** No real container deployment or health monitoring
- **Gateway Service:** No MCP proxy/routing, secrets injection, or load balancing

---

## 🗄️ Database Schema (Supabase)
```sql
-- Core tables for MCP platform
mcp_packages (id, name, description, version, tools, required_secrets, created_at)
mcp_deployments (id, package_id, deployment_url, status, health, created_at)
mcp_tools (id, package_id, name, description, input_schema, created_at)
mcp_secrets (id, user_id, name, value_encrypted, created_at)
api_users (id, user_id, api_key_hash, created_at)
profiles (id, github_id, username, email, created_at)
workspaces (id, name, owner_id, created_at)
metrics (id, deployment_id, request_count, error_count, created_at)
```
- **RLS Policies:** Custom policies for secure access (see debugging section above)
- **Indexes & Relationships:** Foreign keys, indexes on user IDs, installation IDs

---

## 🧩 API Endpoints
```typescript
// Core MCP Registry endpoints
POST   /api/v1/packages              // Create new package
GET    /api/v1/packages/search       // Search packages
GET    /api/v1/packages/:name        // Get package details
GET    /api/v1/packages              // List all packages

// GitHub App integration
GET    /api/v1/github/installations/:id/repositories
GET    /api/v1/github/installations/:id/repositories/:owner/:repo/mcp
POST   /api/v1/github/installations/:id/deploy

// Secrets management
POST   /api/v1/secrets               // Create secret
GET    /api/v1/secrets               // List user secrets
PUT    /api/v1/secrets/:id           // Update secret
DELETE /api/v1/secrets/:id           // Delete secret
```

---

## 🖥️ Frontend Architecture
```
src/
├── components/
│   ├── marketplace/          // MCP discovery and browsing
│   ├── deploy/               // Deployment wizard
│   └── auth/                 // GitHub App authentication
├── services/
│   ├── deploymentService.ts  // Deployment orchestration
│   ├── registryService.ts    // Registry API integration
│   └── secretsService.ts     // Secrets management
└── pages/
    ├── Marketplace.tsx       // Main marketplace
    ├── Deploy.tsx            // Deployment flow
    └── Secrets.tsx           // Secrets management
```

---

## 🏗️ Deployment & Configuration

### Local Development Setup
```bash
# 1. Start Registry API
cd packages/registry-api
npm install
npm run dev  # localhost:3000

# 2. Start Frontend
cd packages/web
npm install
npm run dev  # localhost:8082

# 3. Configure Environment
# Copy .env.example to .env and configure:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - GITHUB_APP_ID
# - GITHUB_APP_PRIVATE_KEY
# - SECRETS_ENCRYPTION_KEY
```

### Database Setup
```bash
# 1. Run migrations
cd packages/registry-api
npm run migrate

# 2. Seed with sample data (optional)
npm run seed
```

### Production Deployment
```bash
# 1. Deploy to Railway/Cloud Run
# 2. Configure environment variables
# 3. Set up GitHub App webhook
# 4. Configure custom domain (optional)
```

---

## 🏗️ Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Frontend      │    │   Registry API   │    │     Database        │
│   (Vercel)      │────│ (Google Cloud    │────│    (Supabase)       │
│                 │    │     Run)         │    │   (Managed SaaS)    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

---

## 🔒 Security Features
- GitHub App permissions (repository access only)
- Encrypted secrets storage in Supabase
- MCP security validation before deployment
- Non-root Docker containers
- HTTPS enforcement
- Input validation and sanitization
- Service account least-privilege access

---

## 📋 Immediate Next Steps
- Implement real container building and deployment (replace simulation)
- Integrate with Cloud Run for production hosting
- Add health monitoring and log streaming
- Complete CLI deploy command and registry API integration
- Finalize RLS and Supabase security policies
- Complete documentation for all deployment and configuration steps