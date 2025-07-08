# Bulk MCP Deployment Guide

This guide explains how to bulk deploy all MCP servers from the `sigyl-dev` GitHub organization to populate the Sigyl registry.

## Overview

The bulk deployment system uses a **local cloning approach** with **comprehensive validation** for maximum reliability and efficiency:

1. **Clone all repositories** locally using GitHub App authentication
2. **Scan for configuration files** (sigyl.yaml, smithery.yaml) in the local copies
3. **Validate configurations** against the deployment schema and automatically fix common issues
4. **Convert configurations** from smithery.yaml to sigyl.yaml format if needed
5. **Deploy each MCP server** to Google Cloud Run using the existing deployment infrastructure
6. **Register deployments** in the Sigyl registry database
7. **Clean up** local repositories after deployment

This approach is much more reliable than the API-based approach as it:
- Avoids GitHub API rate limits
- Allows for easy local file manipulation
- Provides comprehensive configuration validation
- Automatically fixes common configuration issues
- Provides clear guidance for manual fixes
- Enables batch operations

## Configuration Validation

The system performs comprehensive validation of all configuration files against the expected deployment schema:

### Expected Configuration Format

The deployment system expects `sigyl.yaml` files with this structure:

```yaml
runtime: node          # Required: "node" or "container"
language: typescript   # Optional: "typescript" or "javascript" (for node runtime)
startCommand:          # Optional but recommended
  type: http          # Required: must be "http" for MCP servers
  configSchema:       # Optional: defines secrets/config schema
    type: object
    properties:
      apiKey:
        type: string
        description: "Your API key"
    required: ["apiKey"]
  exampleConfig:      # Optional: example configuration
    apiKey: "sk-example123"
```

### Automatic Fixes

The system automatically fixes these common issues:

1. **Runtime conversion**: `runtime: typescript` → `runtime: node` + `language: typescript`
2. **Missing startCommand.type**: Automatically sets to `"http"`
3. **Schema conversion**: Converts `smithery.yaml` to `sigyl.yaml` format
4. **Format validation**: Ensures all fields match expected types

### Manual Fix Suggestions

For issues that can't be automatically fixed, the system provides clear suggestions:

- Invalid runtime values (must be "node" or "container")
- Invalid language values (must be "typescript" or "javascript")
- Missing or invalid field types
- Best practice recommendations

### Validation Report

During analysis, you'll see detailed validation reports like:

```
✅ Found MCP server: sigyl-dev/mcp-weather (sigyl.yaml)
  📋 Configuration analysis:
    ✅ format: Converted from smithery.yaml to sigyl.yaml format
    ✅ runtime: Changed runtime from "typescript" to "node" with language: "typescript"
    ✅ startCommand.type: Set startCommand.type to "http" (required for MCP servers)
    ⚠️ startCommand.configSchema: No configSchema found in startCommand
      💡 Suggestion: Add configSchema to define required API keys and configuration
```

## Prerequisites

Before running the bulk deployment, ensure you have:

### Required Environment Variables

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_github_app_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: User ID for deployment attribution
DEPLOYMENT_USER_ID=optional_user_id
```

### Required Services

1. **GitHub App** installed on the `sigyl-dev` organization with repository access
2. **Google Cloud Run** API enabled with proper authentication
3. **Supabase** database with required tables (mcp_packages, mcp_deployments, etc.)
4. **Node.js dependencies** installed (`js-yaml`, `zod` for validation)

## Usage

### Option 1: Using the npm script (Recommended)

```bash
cd packages/registry-api
npm run bulk-deploy
```

### Option 2: Direct execution

```bash
cd packages/registry-api
npx tsx src/scripts/runBulkDeploy.ts
```

### Option 3: Using the setup checker first

```bash
cd packages/registry-api
npx tsx src/scripts/checkBulkDeploySetup.ts
npx tsx src/scripts/runBulkDeploy.ts
```

## How It Works

### 1. Repository Discovery
- Authenticates with GitHub App
- Lists all repositories in the `sigyl-dev` organization
- Clones all repositories to a local working directory (`bulk-deploy-repos/`)

### 2. Configuration Analysis and Validation
- Scans each local repository for `sigyl.yaml` and `smithery.yaml` files
- Validates configurations against the expected deployment schema
- Reports validation issues with specific error messages and suggestions
- Automatically fixes common issues when possible

### 3. Schema Migration and Fixing
If a repository has issues:
- Converts `smithery.yaml` to `sigyl.yaml` format
- Automatically fixes common configuration problems
- Creates/updates `sigyl.yaml` locally
- Commits and pushes fixes for repositories with no remaining errors
- Provides clear guidance for manual fixes needed

### 4. Deployment
For each discovered MCP server:
- Skips repositories with configuration errors that need manual fixes
- Uses the existing deployment infrastructure for valid configurations
- Deploys to Google Cloud Run
- Registers in the Sigyl registry database
- Includes proper error handling and retry logic

### 5. Cleanup and Reporting
- Removes all local repository clones
- Generates a comprehensive deployment report with validation details
- Reports summary of auto-fixes and manual fixes needed

## Configuration Schema Migration

The system automatically converts and validates configurations:

**Smithery Format (Auto-converted):**
```yaml
runtime: typescript
startCommand:
  type: http
  configSchema:
    type: object
```

**Sigyl Format (Expected):**
```yaml
runtime: node
language: typescript
startCommand:
  type: http
  configSchema:
    type: object
```

**Common Auto-fixes:**
- `runtime: typescript` → `runtime: node` + `language: typescript`
- Missing `startCommand.type` → `type: http`
- Invalid schema formats → Corrected structure

## Output

The deployment process provides:

1. **Real-time validation feedback** with specific issues and fixes
2. **Auto-fix confirmations** for issues that were automatically resolved
3. **Manual fix suggestions** for issues requiring attention
4. **Summary statistics** (total, successful, failed, config errors, auto-fixed)
5. **Detailed error reporting** for failed deployments
6. **Deployment URLs** for successful deployments
7. **JSON report** saved to `bulk-deployment-report-{timestamp}.json` with validation details

### Example Output

```
📊 Deployment Summary:
   Total repositories: 8
   Successfully deployed: 6
   Failed to deploy: 0
   Configuration errors: 2
   Auto-fixed configurations: 4

⚠️ 2 repositories have configuration errors that need manual fixes
🔧 4 repositories had configurations automatically fixed

❌ Repositories needing manual fixes:
   - sigyl-dev/mcp-broken: runtime: Invalid runtime "python". Must be "node" or "container"
     💡 Suggestion: Change runtime to "node" for Node.js projects or "container" for Docker projects

✅ Successful deployments:
   - sigyl-dev/mcp-weather: https://server.sigyl.dev/@sigyl-dev/mcp-weather
   - sigyl-dev/mcp-calendar: https://server.sigyl.dev/@sigyl-dev/mcp-calendar
```

## Error Handling

The system includes comprehensive error handling:

- **Configuration validation** catches schema mismatches before deployment
- **Automatic fixing** resolves common issues without manual intervention
- **GitHub authentication** errors are caught and reported
- **Repository cloning** failures don't stop the entire process
- **Deployment failures** are tracked and reported individually
- **Cleanup** always runs, even if deployment fails

## Troubleshooting

### Common Configuration Issues

1. **Invalid Runtime Values**
   ```
   ❌ runtime: Invalid runtime "python". Must be "node" or "container"
   ```
   **Fix**: Change to `runtime: node` or `runtime: container`

2. **Missing startCommand.type**
   ```
   ✅ startCommand.type: Set startCommand.type to "http" (automatically fixed)
   ```
   **Fixed automatically**

3. **Legacy Smithery Format**
   ```
   ✅ format: Converted from smithery.yaml to sigyl.yaml format (automatically fixed)
   ```
   **Fixed automatically**

### Manual Fixes Required

When the system reports configuration errors that need manual fixes:

1. **Check the detailed error messages** in the console output
2. **Follow the provided suggestions** for each error
3. **Edit the configuration files** in the respective repositories
4. **Re-run the deployment** after making fixes

### Common Authentication Issues

1. **GitHub App Authentication Errors**
   - Verify GitHub App credentials
   - Check installation permissions
   - Ensure GitHub App is installed on `sigyl-dev` organization

2. **Google Cloud Authentication Errors**
   - Check Google Cloud credentials and permissions
   - Verify Cloud Run API is enabled
   - Ensure service account has proper permissions

3. **Supabase Connection Issues**
   - Verify Supabase URL and service role key
   - Check database table permissions
   - Ensure required tables exist

### Getting Help

If you encounter issues:

1. **Check the validation report** for specific configuration errors
2. **Review the deployment report** for detailed error messages
3. **Run the setup checker** to validate all prerequisites
4. **Follow the auto-fix suggestions** for configuration issues
5. **Check the console output** for step-by-step progress

## Best Practices

### Before Running Deployment

1. **Run the setup checker** to validate your environment
2. **Test with a small subset** if unsure about configurations
3. **Review existing configurations** manually for complex projects
4. **Backup important repositories** if making significant changes

### Configuration Best Practices

1. **Use specific runtime values**: `node` or `container` only
2. **Include configSchema** for secrets management
3. **Specify language** for node runtime projects
4. **Use http type** for startCommand (required for MCP servers)

### After Deployment

1. **Review the deployment report** for any issues
2. **Test deployed endpoints** to ensure functionality
3. **Monitor Cloud Run services** for health status
4. **Update configurations** based on validation suggestions

This comprehensive system ensures robust, reliable bulk deployment of your MCP servers with intelligent validation and automatic problem resolution. 