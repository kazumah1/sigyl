# Third-Party MCP Deployment Guide

This guide documents the complete process for adapting and deploying third-party MCPs to the Sigyl platform, based on lessons learned from successfully deploying the weather MCP.

## Prerequisites

### 1. Environment Setup
Ensure these environment variables are properly set in `packages/registry-api/.env`:

```bash
# GitHub Authentication
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Google Cloud (for deployment)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_PROJECT_HASH=your_hash  # Important for URL construction
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY=base64_encoded_key

# Supabase
SUPABASE_URL=https://your_project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Verify GitHub Token Format
The `.env` file must have proper line separation. Check with:
```bash
cd packages/registry-api
cat .env | grep -A1 -B1 GITHUB_TOKEN
```
Each environment variable should be on its own line.

## MCP Adaptation Process

### 1. Analyze the MCP Structure

First, examine the MCP's current structure:
```bash
cd third-party-mcps/[mcp-name]
ls -la
```

Look for:
- `package.json` - Check if it's a Node.js project
- `server.ts` or `server.js` - Main server file
- `sigyl.yaml` - Sigyl configuration (may need creation)
- `tsconfig.json` - TypeScript configuration

### 2. Update package.json

Ensure the package.json has the correct configuration:

```json
{
  "name": "mcp-name",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "build": "tsc",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@modelcontextprotocol/sdk": "latest"
  }
}
```

**Key points:**
- `"type": "module"` is CRITICAL for ES modules
- Must include `express` dependency for HTTP server
- Build script should compile TypeScript to JavaScript

### 3. Create/Update sigyl.yaml

Every MCP needs a proper `sigyl.yaml` file:

```yaml
runtime: node
language: typescript
entryPoint: server.js
secrets:
  - name: API_KEY
    description: API key for the service
tools:
  - name: tool_name
    description: Tool description
    inputSchema:
      type: object
      properties:
        param1:
          type: string
          description: Parameter description
```

### 4. Adapt the server.ts File

The server file needs specific adaptations for Sigyl deployment:

#### A. Import Structure (ES Modules)
```typescript
// ❌ Wrong - CommonJS
const express = require('express');

// ✅ Correct - ES Modules
import express from 'express';
// OR for dynamic imports in HTTP mode
const express = (await import('express')).default;
```

#### B. Environment Variable Handling
Add this function to handle Sigyl's multi-source environment variables:

```typescript
function getEnv(req: any, key: string): string | undefined {
  // 1. Check headers (Sigyl Gateway injects secrets here)
  const headerKey = `x-secret-${key.toLowerCase()}`;
  if (req?.headers?.[headerKey]) {
    return req.headers[headerKey];
  }
  
  // 2. Check request context (for POST requests via gateway)
  if (req?.body?.context?.environment?.[key]) {
    return req.body.context.environment[key];
  }
  
  // 3. Fallback to process.env
  return process.env[key];
}
```

#### C. HTTP Server Setup
Add this HTTP server section for Cloud Run deployment:

```typescript
// HTTP Server for Cloud Run deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const express = (await import('express')).default;
    const app = express();
    
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (_req: any, res: any) => {
      res.json({ status: 'healthy', service: 'mcp-name' });
    });
    
    // MCP endpoint for Sigyl deployment
    app.all('/mcp', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        const { method, params = {} } = body;
        
        switch (method) {
          case 'initialize':
            res.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: {
                  name: 'mcp-name',
                  version: '1.0.0'
                }
              }
            });
            break;
            
          case 'tools/list':
            res.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                tools: [
                  {
                    name: 'tool_name',
                    description: 'Tool description',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        // Define parameters
                      }
                    }
                  }
                ]
              }
            });
            break;
            
          case 'tools/call':
            const { name: toolName, arguments: toolArgs } = params;
            
            // Extract API key using getEnv function
            const apiKey = getEnv(req, 'API_KEY');
            if (!apiKey) {
              return res.json({
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32603,
                  message: 'API_KEY not found in environment'
                }
              });
            }
            
            // Handle tool execution
            if (toolName === 'tool_name') {
              const result = await executeToolFunction(toolArgs, apiKey);
              res.json({
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2)
                    }
                  ]
                }
              });
            } else {
              res.json({
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32601,
                  message: `Unknown tool: ${toolName}`
                }
              });
            }
            break;
            
          default:
            res.json({
              jsonrpc: '2.0',
              id: body.id,
              error: {
                code: -32601,
                message: `Unknown method: ${method}`
              }
            });
        }
      } catch (error) {
        res.json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error'
          }
        });
      }
    });
    
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`MCP server listening on port ${port}`);
    });
  })();
}
```

#### D. Tool Function Implementation
Extract tool logic into standalone functions that can be called from the HTTP bridge:

```typescript
async function executeToolFunction(args: any, apiKey: string) {
  // Implement tool logic here
  // Use apiKey for API calls
  return result;
}
```

## Deployment Process

### 1. Test Local Build
Before deploying, always test the build locally:

```bash
cd third-party-mcps/[mcp-name]
npm install
npm run build
```

If build fails, fix TypeScript errors before proceeding.

### 2. Commit and Push Changes
```bash
git add .
git commit -m "Adapt [mcp-name] for Sigyl deployment with HTTP bridge"
git push origin main
```

### 3. Deploy Using Test Script
```bash
cd packages/registry-api
npx tsx src/scripts/testSingleMCPDeploy.ts [mcp-name]
```

### 4. Verify Deployment
Test the MCP endpoints:

```bash
# Health check
curl https://[deployment-url]/health

# Initialize
curl -X POST 'https://[deployment-url]/mcp' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":false}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'

# List tools
curl -X POST 'https://[deployment-url]/mcp' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Test tool execution
curl -X POST 'https://[deployment-url]/mcp' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"tool_name","arguments":{"param":"value"}}}'
```

## Common Issues and Solutions

### 1. GitHub Authentication Errors

**Error:** `Failed to fetch sigyl.yaml: Not Found`

**Cause:** GitHub token not properly configured or has wrong permissions.

**Solution:**
```bash
# Check token format
echo $GITHUB_TOKEN | cut -c1-20

# Verify .env file formatting
cd packages/registry-api
sed -n '/GITHUB_TOKEN/p' .env
```

### 2. ES Module Errors

**Error:** `ReferenceError: require is not defined in ES module scope`

**Cause:** Using CommonJS `require()` in ES module project.

**Solutions:**
- Add `"type": "module"` to package.json
- Convert `require()` to `import` statements
- Use dynamic imports: `const express = (await import('express')).default`

### 3. TypeScript Compilation Errors

**Error:** Build fails with type errors

**Solutions:**
- Fix type definitions
- Update imports/exports to ES module syntax
- Ensure all dependencies are properly typed
- For quick fix: Use HTTP-only implementation without complex MCP server types

### 4. Container Startup Failures

**Error:** Container exits with code 1

**Causes & Solutions:**
- **Missing PORT environment**: Container must listen on `process.env.PORT || 8080`
- **Startup errors**: Check Cloud Run logs for specific error messages
- **Import errors**: Ensure all imports are ES module compatible

### 5. Health Check Failures

**Error:** Cloud Run shows "Service not ready"

**Solutions:**
- Ensure `/health` endpoint returns 200 status
- Verify server actually starts and listens
- Check that `/mcp` endpoint responds to GET requests

### 6. URL Construction Issues

**Error:** Wrong deployment URL stored in database

**Cause:** Missing `GOOGLE_CLOUD_PROJECT_HASH` environment variable

**Solution:**
```bash
# Set the hash in .env file
echo "GOOGLE_CLOUD_PROJECT_HASH=lrzo3avokq" >> .env
```

### 7. Database Update Failures

**Error:** Package URL not updated after deployment

**Solution:**
```bash
# Run the fix script
cd packages/registry-api
npx tsx src/scripts/fixWeatherMCPUrl.ts
```

## Bulk Deployment Strategy

### 1. Preparation Phase
1. Create a list of all MCPs in `third-party-mcps/`
2. Analyze each MCP's structure and requirements
3. Prioritize by complexity (start with Node.js MCPs)

### 2. Adaptation Phase
For each MCP:
1. Update `package.json` with ES module config
2. Create/update `sigyl.yaml`
3. Adapt `server.ts` with HTTP bridge
4. Test local build
5. Commit and push changes

### 3. Deployment Phase
1. Deploy one MCP at a time using test script
2. Verify each deployment before proceeding
3. Update database records as needed
4. Test Claude Desktop integration

### 4. Verification Phase
1. Health check all deployed MCPs
2. Test core functionality of each
3. Document any deployment-specific configurations
4. Update registry with correct URLs

## Monitoring and Maintenance

### Check Deployment Status
```bash
# List all Cloud Run services
gcloud run services list --region=us-central1

# Check specific service
gcloud run services describe [service-name] --region=us-central1
```

### View Logs
```bash
# Get logs for a service
gcloud logs read "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=[service-name]" \
  --limit=50
```

### Update Deployments
To redeploy after changes:
```bash
# Delete existing service
gcloud run services delete [service-name] --region=us-central1 --quiet

# Deploy again
npx tsx src/scripts/testSingleMCPDeploy.ts [mcp-name]
```

## Success Criteria

A successful MCP deployment should:
1. ✅ Build without TypeScript errors
2. ✅ Deploy to Cloud Run successfully
3. ✅ Respond to health checks
4. ✅ Support all three MCP protocol methods (initialize, tools/list, tools/call)
5. ✅ Handle environment variables correctly
6. ✅ Return proper JSON-RPC responses
7. ✅ Work with Claude Desktop via deep links

## Final Notes

- Always test builds locally before deploying
- Keep the HTTP bridge implementation simple and focused
- Monitor Cloud Run logs for any runtime issues
- Maintain proper error handling in tool implementations
- Document any MCP-specific configuration requirements

This guide should enable systematic deployment of all third-party MCPs with minimal issues. 