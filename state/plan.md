# Sigyl MCP Platform - Project Plan

## Project Overview
Migrating from Railway to Google Cloud Run for 60-75% cost savings while maintaining all functionality. The platform enables users to deploy MCP (Model Context Protocol) servers with a simplified configuration approach.

## Key Changes from Smithery
1. **Configuration**: Using `sigyl.yaml` instead of `mcp.yaml`
2. **Runtime Types**: `node|container` instead of `typescript`  
3. **Tool Loading**: Lazy loading at runtime instead of YAML definitions
4. **Hosting**: Google Cloud Run instead of Railway

## Current Status: ✅ READY FOR LAUNCH

### ✅ Completed Major Components

**1. Configuration Schema Migration**
- ✅ Created `SigylConfig` types supporting `node` and `container` runtimes
- ✅ Implemented `fetchSigylYaml` function
- ✅ Added support for 3 complexity levels as requested

**2. Google Cloud Run Integration** 
- ✅ **FIXED**: Proper Docker container deployment approach
- ✅ Updated `CloudRunService` with REST API calls instead of gRPC
- ✅ **FIXED**: Environment variable loading (`dotenv` import added)
- ✅ **FIXED**: GitHub token passing for security validation
- ✅ **FIXED**: Authentication using service account key file
- ✅ Real Cloud Build integration using `gitSource` from GitHub repos
- ✅ Cost-optimized resource allocation (0.25 vCPU, 512MB RAM, scale-to-zero)

**3. Security Integration**
- ✅ **FIXED**: Security validation working with GitHub token
- ✅ Repository analysis with proper authentication
- ✅ Security scoring and blocking for unsafe deployments

**4. Deployment Pipeline**
- ✅ **FIXED**: Complete deployment flow from GitHub App → Security → Build → Deploy
- ✅ GitHub App integration for repository access
- ✅ Secrets management and environment variable injection

**5. Documentation**
- ✅ Comprehensive setup guide: `packages/container-builder/GOOGLE_CLOUD_SETUP.md`
- ✅ Step-by-step Google Cloud configuration instructions

### 🔧 Recent Critical Fixes

**TypeScript Template Cloud Run Compatibility**
- ✅ Fixed: TypeScript template MCP server now generates with HttpServerTransport and listens on process.env.PORT, making it Cloud Run compatible (updated CLI @init.ts and generator logic).

**Octokit v2+ Compatibility**
- ✅ Fixed: Octokit v2+ compatibility for fetching sigyl.yaml and mcp.yaml from GitHub (updated fetchSigylYaml and fetchMCPYaml).

**Dockerfile Build/Prune**
- ✅ Fixed: Dockerfile now installs devDependencies for build, then prunes for production, ensuring tsc is available during build.

**Dockerfile Debug Step**
- ✅ Fixed: Dockerfile debug step to list files after build for troubleshooting.

**Environment Variable Handling**
- ✅ Fixed: Environment variable handling and Cloud Run reserved variable filtering.

**Supabase Integration and IAM Automation**
- ✅ Fixed: Deploy flow now fully connects Google Cloud Run deployments to Supabase tables
    - author_id is now always a valid UUID from the profiles table (GitHub ID is mapped automatically)
    - required_secrets and optional_secrets are extracted from sigyl.yaml and stored in the registry
    - Tool input schemas are auto-extracted from Zod and stored
- ✅ Fixed: IAM policy for Cloud Run services is now programmatically updated to allow unauthenticated invocations (allUsers as run.invoker)
    - Robust logging and verification ensure unauthenticated access is enabled after every deploy
    - No more manual UI steps required for public endpoints

### 🛠️ Outstanding/To-Do

- 🔧 Ensure all CLI-generated templates (including blank and scan modes) use HttpServerTransport for HTTP/Cloud Run compatibility.
- 🔧 Consider refactoring CLI to always use generator logic for all templates, avoiding static template drift.
- 🔧 Add more robust error handling and user feedback for missing or misconfigured sigyl.yaml in the deployment pipeline.
- 🔧 Continue to monitor for any edge cases in build/deploy flow, especially with custom user repos or non-standard project structures.
- [ ] Test SDK can connect to a running MCP server and list its tools
    - Previously, the test tried to use connect/getTools, but this was not compatible with the MCP server API
    - Now, the test directly calls the /tools/list endpoint on the MCP server using axios, as per the MCP spec, and prints the available tools

### 🚀 Launch Readiness

**Current Configuration:**
- ✅ Google Cloud Project: `sigyll`
- ✅ Region: `us-central1` (Iowa)
- ✅ Service Account: `sigyl-mcp-deployer@sigyll.iam.gserviceaccount.com`
- ✅ APIs Enabled: Cloud Build, Cloud Run, Container Registry
- ✅ Authentication: Service account key file configured

**Deployment Flow:**
1. ✅ User connects GitHub App → Repository access
2. ✅ Security validation → Repository analysis with GitHub token  
3. ✅ Cloud Build → Docker image creation from GitHub source
4. ✅ Container Registry → Image storage in `gcr.io/sigyll/`
5. ✅ Cloud Run → Serverless deployment with auto-scaling

**Cost Optimization:**
- ✅ Scale-to-zero when not in use
- ✅ 0.25 vCPU, 512MB RAM (perfect for MCP servers)
- ✅ Pay-per-request pricing model
- ✅ Expected 60-75% savings vs Railway

### 🚦 Launch Readiness

- All critical technical blockers for Cloud Run migration are resolved.
- Platform is ready for production launch, pending final user acceptance and documentation review.

The Sigyl MCP Platform migration to Google Cloud Run is complete and ready for production use!