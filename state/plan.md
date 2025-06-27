# Sigyl MCP Platform - Technical Implementation Guide

**Last Updated:** December 18, 2024

---

## 🎯 Project Overview
The Sigyl MCP Platform enables developers to deploy Model Context Protocol (MCP) servers through a web interface with GitHub integration. The stack includes Supabase (PostgreSQL), Express (TypeScript), React (Vite), Docker, and a CLI. The platform is designed for secure, cost-effective, and scalable deployment using Google Cloud Run.

---

## 🚨 Current Issues & Fixes

### GitHub App Installation 500 Error Fix - DECEMBER 18, 2024
- **Issue:** "Failed to fetch repositories: 500 Internal Server Error" when trying to access repositories
- **Root Cause:** Installation ID `73223497` returning 404 "Not Found" when creating GitHub App access token
- **Symptoms:** 
  - Console shows `Found existing GitHub App installations in database: 2`
  - API logs: `RequestError [HttpError]: Not Found - create-an-installation-access-token-for-an-app`
  - Database contains stale installation IDs that no longer exist on GitHub
- **Fix Applied:**
  - Enhanced API endpoint debugging to show GitHub App credentials and installation details
  - Added `clearInvalidInstallations()` function to AuthContext to clear stale installation data
  - Updated `DeployWizardWithGitHubApp` to detect installation errors (500/404)
  - Added user-friendly error handling with "Clear Installation & Reinstall" button
  - When invalid installation detected, users can clear localStorage and database cache for fresh setup
- **Status:** ✅ FIXED - Users now have self-service option to resolve invalid GitHub App installations

### Database Schema Issues - DECEMBER 18, 2024
- **Issue:** Multiple 404 errors when accessing Supabase `users` and 406 errors on `profiles` table
- **Symptoms:**
  - `GET /rest/v1/profiles?select=* 406 (Not Acceptable)`
  - `GET /rest/v1/users?select=* 404 (Not Found)`
  - User profile creation failing during OAuth login
- **Root Cause:** Table doesn't exist or RLS policies are blocking access
- **Status:** 🔍 NEEDS INVESTIGATION - May need database schema review or RLS policy fixes

### GitHub App Session Restoration Fix - DECEMBER 18, 2024
- **Issue:** After OAuth login, returning users lost GitHub App access on page reload
- **Symptoms:** Console showed `hasAccounts: true` but `hasToken: false`, users prompted to reinstall GitHub App
- **Root Cause:** `loadExistingGitHubAppAccounts()` was restoring account data but not the critical localStorage session variables
- **Fix Applied:**
  - Enhanced `loadExistingGitHubAppAccounts()` to restore complete GitHub App session state
  - Now properly sets `github_app_user`, `github_app_access_token`, `github_app_installation_id`, and `github_app_install_time` in localStorage
  - This ensures `isGitHubAppSessionValid()` returns true for restored sessions
  - Works for both localStorage-cached accounts and database-restored accounts
- **Status:** ✅ FIXED - GitHub App access now properly restored after OAuth login

### Sign Out Functionality Fix - DECEMBER 18, 2024
- **Issue:** Sign out button not working properly, users remained signed in
- **Symptoms:** Sign out called but state not cleared, user still authenticated, GitHub App card reappeared
- **Root Cause:** Supabase signOut() was failing silently and preventing state cleanup, auth state change handler interference
- **Fix Applied:**
  - Enhanced signOut() function with comprehensive state clearing
  - Clear React state BEFORE calling Supabase signOut to prevent race conditions
  - Added error handling so sign out completes even if Supabase fails
  - Clear all GitHub App localStorage keys and React state
  - Force page redirect to `/login` after sign out completion
  - Robust error handling ensures sign out always completes
- **Status:** ✅ FIXED - Sign out now properly clears all state and redirects to login

### GitHub App Deployment 400 Error - FIXED
- **Issue:** Deployment endpoint was returning 400 Bad Request
- **Error:** `POST /installations/73241759/deploy - 400 - 31ms`
- **Root Cause:** Frontend was missing required `repoUrl` field in deployment request
- **Fix Applied:**
  - Updated `deployMCPWithApp()` in `packages/web/src/lib/githubApp.ts` to include `repoUrl`
  - Added detailed logging to deployment endpoint in `packages/registry-api/src/routes/githubApp.ts`
  - Enhanced error handling in frontend to show backend error messages
- **Status:** ✅ FIXED - Deployment requests now include all required fields

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

## 🎨 UI/UX Improvements

### Blue Accent Color Implementation - DECEMBER 18, 2024
- **Objective:** Add trustworthy blue accent colors to replace the current black/white theme
- **Implementation:** 
  - Added 4 blue color palettes to `tailwind.config.ts`: Classic Blue, Trust Blue, Ocean Blue, and Navy Blue
  - Each palette includes 11 shades (50-950) for comprehensive color options
  - Created `BlueColorTester` component at `/colors` route for interactive color testing
  - Added safelist to Tailwind config to ensure dynamic color classes are included in build
- **Color Palettes Added:**
  - `blue-*` - Standard, reliable blue tones
  - `trust-blue-*` - Light, approachable blue tones  
  - `ocean-blue-*` - Deep, professional blue tones
  - `navy-blue-*` - Corporate, serious blue tones
- **Testing:** Interactive component displays each palette with UI examples (buttons, badges, links, cards)
- **Next Steps:** Select preferred blue shade and implement across existing UI components

### Blue Accent Color Selection & Implementation - COMPLETED
- **Selected Color:** Classic Blue 500 (`#3b82f6`) for trustworthiness and professional appeal
- **Implementation Completed:**
  - Updated primary button styles in `index.css` to use blue-500 with blue-600 hover
  - Applied blue-500 to main CTAs: "Get Started Free", "Deploy Now" buttons on Index page
  - Updated "Install & Deploy" button in PackageDetails component
  - Applied blue-500 to important action buttons in NotFound and Secrets pages
  - Updated hover states and accent colors to use blue-400 for consistency
  - Maintained existing blue color palettes for future use
- **Cleanup:** Removed BlueColorTester component and /colors route after selection
- **Status:** ✅ COMPLETE - Blue accent color successfully implemented across key UI elements

### UI/UX Fixes & CORS Resolution - DECEMBER 18, 2024
- **Button Functionality Fixed:**
  - Added navigation logic to "Get Started Free" button → routes to `/deploy`
  - Added navigation logic to "View Documentation" button → routes to `/docs`
  - Updated "View Documentation" button styling with transparent background, white border, and white text
  - Added smooth hover effect that inverts to white background with black text
- **CORS Configuration Fixed:**
  - Updated `packages/registry-api/src/middleware/security.ts` to include `localhost:8080`
  - Frontend runs on port 8080 (per vite.config.ts) but CORS was only allowing 3000/5173
  - Added both HTTP and HTTPS variants for development
- **Status:** ✅ COMPLETE - Navigation working and CORS errors resolved

### Authentication Flow Separation - DECEMBER 18, 2024
- **Problem:** Login page was forcing GitHub App installation on every login (terrible UX for returning users)
- **Solution:** Separated login and signup flows:
  - **Login Tab:** Regular GitHub OAuth via Supabase for returning users (no app reinstallation)
  - **Sign Up Tab:** GitHub App installation flow for new users (grants repository access)
  - **Admin Access:** Moved to collapsible section to reduce UI clutter
- **Implementation:**
  - Updated `packages/web/src/pages/Login.tsx` with tabbed interface
  - Added `handleGitHubLogin()` for regular OAuth using `supabase.auth.signInWithOAuth`
  - Kept existing `handleGitHubAppSignup()` for first-time setup
  - Used blue-500 for login button, white for signup to match design system
- **Status:** ✅ COMPLETE - Much better UX for returning users

### GitHub App Access Restoration Fix - DECEMBER 18, 2024
- **Problem:** After regular GitHub OAuth login, users were still prompted to install GitHub App on deploy page
- **Root Cause:** AuthContext wasn't checking for existing GitHub App installations when OAuth users logged in
- **Solution:** Enhanced AuthContext to restore GitHub App access for OAuth users:
  - Added `loadExistingGitHubAppAccounts()` function that checks both localStorage and database
  - Queries `github_installations` table by `account_login` (GitHub username)
  - Restores `githubAccounts` and `activeGitHubAccount` state
  - Stores restored accounts in localStorage for faster future access
- **Implementation:** 
  - Updated `packages/web/src/contexts/AuthContext.tsx`
  - Function runs when OAuth users log in and during initial session loading
  - Database query: `supabase.from('github_installations').select('*').eq('account_login', githubUsername)`
- **Status:** ✅ COMPLETE - Returning users now have seamless GitHub App access after OAuth login

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