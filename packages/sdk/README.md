# @sigyl-dev/sdk

Developer SDK for the Sigyl MCP Registry and Hosting Platform. This SDK provides a clean, developer-friendly interface for discovering and searching for MCP (Model Context Protocol) servers and tools. **It does not handle protocol-level tool invocation or server connection.**

## 🚀 Quick Start

```bash
npm install @sigyl-dev/sdk
```

```typescript
import { MCPConnectSDK } from '@sigyl-dev/sdk';

const sdk = new MCPConnectSDK({
  apiKey: 'sk_your_api_key_here', // Optional, for authenticated endpoints
  timeout: 15000 // Optional
});

// Search for MCP servers (packages) by keyword
const results = await sdk.searchPackages('summarize');
console.log(results.packages);

// Semantic search for MCP servers based on a prompt
const semanticResults = await sdk.semanticSearchMCPServers('summarize this text');
console.log(semanticResults);

// Semantic search for tools across all MCP servers
const toolResults = await sdk.semanticSearchTools('OCR image to text');
console.log(toolResults);

// Get MCP server URL by name
const mcpInfo = await sdk.getMCPServerUrlByName('text-summarizer');
console.log(mcpInfo?.url);
```

## 🔐 Authentication

- The SDK supports API key authentication for secure operations.
- Some endpoints require authentication, while others are public.
- **API keys are obtained from your Sigyl dashboard.**

### Using an API Key

```typescript
const sdk = new MCPConnectSDK({
  apiKey: 'sk_your_api_key_here'
});
```

## 📚 API Reference

### MCPConnectSDK Methods

- `searchPackages(query, tags?, limit?, offset?)` — Search for MCP servers by keyword/tag.
- `getPackage(name)` — Get detailed info about a specific MCP server.
- `getMCPServerUrlByName(name)` — Retrieve the MCP server URL and metadata by name.
- `semanticSearchMCPServers(query, count?)` — Semantic search for MCP servers (e.g., by user prompt).
- `semanticSearchTools(query, count?)` — Semantic search for tools across all MCP servers.
- `searchAllPackages(limit?)` — List all MCP servers (public operation).
- `getAllPackages()` — List all MCP servers (admin operation, requires admin API key).
- `updateConfig(newConfig)` — Update SDK configuration.
- `getConfig()` — Get current SDK configuration.

### Types Exported

- `MCPPackage`, `MCPTool`, `MCPDeployment`, `PackageWithDetails`, `PackageSearchResult`, `SDKConfig`, `ConnectOptions`, `APIResponse`, `PackageSearchQuery`

## 🔧 Configuration

- The SDK **always connects to the official Sigyl registry** at `https://api.sigyl.dev/api/v1`.
- Only `apiKey`, `timeout`, and `requireAuth` are configurable.

```typescript
const sdk = new MCPConnectSDK({
  apiKey: 'sk_your_api_key_here',
  timeout: 10000, // Optional
  requireAuth: true // Optional
});
```

## 📝 Example Usage

### Search for MCP Servers
```typescript
const results = await sdk.searchPackages('image');
console.log(results.packages.map(pkg => pkg.name));
```

### Semantic Search for MCP Servers
```typescript
const servers = await sdk.semanticSearchMCPServers('translate English to French');
console.log(servers);
```

### Semantic Search for Tools
```typescript
const tools = await sdk.semanticSearchTools('extract entities from text', 3);
for (const tool of tools) {
  console.log(tool.tool_name, tool.mcp_server.name, tool.description);
}
```

### Get MCP Server URL by Name
```typescript
const info = await sdk.getMCPServerUrlByName('text-summarizer');
if (info) {
  console.log('MCP URL:', info.url);
}
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Watch for changes
npm run dev

# Clean build artifacts
npm run clean
```

## ⚠️ Migration Note

**This SDK no longer provides protocol-level tool invocation or direct MCP server connection.**
- For tool invocation, use the official Model Context Protocol SDK (e.g., `@modelcontextprotocol/sdk`).
- This SDK is now focused on discovery, search, and metadata lookup for the Sigyl registry only.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 