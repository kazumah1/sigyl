# @sigyl-dev/sdk

Developer SDK for the Sigyl MCP Registry and Hosting Platform. This SDK provides a clean, developer-friendly interface for discovering and searching for MCP (Model Context Protocol) servers and tools. **It does not handle protocol-level tool invocation or server connection.**

## 🚀 Quick Start

```bash
npm install @sigyl-dev/sdk
```

```typescript
import { SigylSDK, searchMCP, getMCP, getAllServers, getMCPUrl, semanticMCP, semanticTools } from '@sigyl-dev/sdk';

const sdk = new SigylSDK({
  apiKey: 'sk_your_api_key_here', // Optional, for authenticated endpoints
  timeout: 15000 // Optional
});

// Search for MCP servers (packages) by keyword
const results = await searchMCP('summarize');
console.log(results.packages);

// Semantic search for MCP servers based on a prompt
const semanticResults = await sdk.semanticMCP('summarize this text');
console.log(semanticResults);

// Semantic search for tools across all MCP servers
const toolResults = await sdk.semanticTools('OCR image to text');
console.log(toolResults);

// Get MCP server URL by name
const mcpInfo = await sdk.getMCPUrl('text-summarizer');
console.log(mcpInfo?.url);

// Get MCP server details by name
const details = await getMCP('my-mcp-server');
console.log(details);
```

## 🔐 Authentication

- The SDK supports API key authentication for secure operations.
- Some endpoints require authentication, while others are public.
- **API keys are obtained from your Sigyl dashboard.**

### Using an API Key

```typescript
const sdk = new SigylSDK({
  apiKey: 'sk_your_api_key_here'
});
```

## 📚 API Reference

### SigylSDK Methods

- `searchMCP(query, tags?, limit?, offset?)` — Search for MCP servers by keyword/tag.
- `getMCP(name)` — Get detailed info about a specific MCP server.
- `getMCPUrl(name)` — Retrieve the MCP server URL and metadata by name.
- `semanticMCP(query, count?)` — Semantic search for MCP servers (e.g., by user prompt).
- `semanticTools(query, count?)` — Semantic search for tools across all MCP servers.
- `searchAllPackages(limit?)` — List all MCP servers (public operation).
- `getAllServers()` — List all MCP servers (admin operation, requires admin API key).
- `updateConfig(newConfig)` — Update SDK configuration.
- `getConfig()` — Get current SDK configuration.

### Types Exported

- `MCPPackage`, `MCPTool`, `MCPDeployment`, `PackageWithDetails`, `PackageSearchResult`, `SDKConfig`, `ConnectOptions`, `APIResponse`, `PackageSearchQuery`

## 🔧 Configuration

- The SDK **always connects to the official Sigyl registry** at `https://api.sigyl.dev/api/v1`.
- Only `apiKey`, `timeout`, and `requireAuth` are configurable.

```typescript
const sdk = new SigylSDK({
  apiKey: 'sk_your_api_key_here',
  timeout: 10000, // Optional
  requireAuth: true // Optional
});
```

## 📝 Example Usage

### Search for MCP Servers
```