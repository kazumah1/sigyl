# Sigyl SDK Documentation

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Importing and Instantiating](#importing-and-instantiating)
- [Class: `SigylSDK`](#class-sigylsdk)
  - [Constructor](#constructor)
  - [Methods](#methods)
- [Types](#types)
- [Example Usage](#example-usage)
- [Authentication & Configuration](#authentication--configuration)
- [Best Practices & Notes](#best-practices--notes)

---

## Overview
The Sigyl SDK provides a simple interface for discovering, searching, and retrieving metadata about MCP servers (Model Context Protocol servers) from the Sigyl registry. It is designed for developers who want to integrate, search, or connect to MCP servers, but **does not** handle package creation or deployment.

---

## Installation
```bash
npm install @sigyl-dev/sdk
```

---

## Importing and Instantiating
```ts
import { SigylSDK } from '@sigyl-dev/sdk';

const sdk = new SigylSDK({
  apiKey: 'YOUR_API_KEY', // Optional, only needed for admin endpoints
  requireAuth: false,     // Default: false
  timeout: 10000          // Default: 10000ms
});
```

---

## Class: `SigylSDK`

### Constructor
```ts
new SigylSDK(config?: SDKConfig)
```
- `config` (optional):
  - `apiKey?: string` — Your API key for authenticated/admin endpoints
  - `requireAuth?: boolean` — If true, requires API key for all requests (default: false)
  - `timeout?: number` — Request timeout in ms (default: 10000)

### Methods

#### `searchMCP`
```ts
searchMCP(query?: string, tags?: string[], limit?: number, offset?: number): Promise<MCPSearchResult>
```
- **Parameters:**
  - `query?: string` — Search string (default: undefined)
  - `tags?: string[]` — Filter by tags (default: undefined)
  - `limit?: number` — Max results (default: 20)
  - `offset?: number` — Pagination offset (default: 0)
- **Returns:** `Promise<MCPSearchResult>`

#### `getMCP`
```ts
getMCP(name: string): Promise<PackageWithDetails>
```
- **Parameters:**
  - `name: string` — Name of the MCP server
- **Returns:** `Promise<PackageWithDetails>`

#### `searchAllPackages`
```ts
searchAllPackages(limit?: number): Promise<MCPServer[]>
```
- **Parameters:**
  - `limit?: number` — Max results (default: 100)
- **Returns:** `Promise<MCPServer[]>`

#### `getAllServers`
```ts
getAllServers(): Promise<MCPServer[]>
```
- **Returns:** `Promise<MCPServer[]>` (admin only)

#### `updateConfig`
```ts
updateConfig(newConfig: Partial<SDKConfig>): void
```
- **Parameters:**
  - `newConfig: Partial<SDKConfig>` — Update SDK config

#### `getConfig`
```ts
getConfig(): SDKConfig
```
- **Returns:** `SDKConfig` (current config)

#### `getMCPUrl`
```ts
getMCPUrl(name: string): Promise<{ url: string; package: MCPServer } | null>
```
- **Parameters:**
  - `name: string` — Name of the MCP server
- **Returns:** `Promise<{ url: string; package: MCPServer } | null>`

#### `semanticMCP`
```ts
semanticMCP(query: string, count?: number): Promise<MCPServer[]>
```
- **Parameters:**
  - `query: string` — Natural language search
  - `count?: number` — Max results (default: 1)
- **Returns:** `Promise<MCPServer[]>`

#### `semanticTools`
```ts
semanticTools(query: string, count?: number): Promise<Array<MCPTool & { mcp_server: MCPServer }>>
```
- **Parameters:**
  - `query: string` — Natural language search
  - `count?: number` — Max results (default: 1)
- **Returns:** `Promise<Array<MCPTool & { mcp_server: MCPServer }>>`

---

## Types

### `MCPServer`
```ts
interface MCPServer {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author_id?: string;
  source_api_url?: string;
  tags?: string[];
  downloads_count: number;
  created_at: string;
  updated_at: string;
}
```

### `PackageWithDetails`
```ts
interface PackageWithDetails extends MCPServer {
  deployments: MCPDeployment[];
  tools: MCPTool[];
}
```

### `MCPDeployment`
```ts
interface MCPDeployment {
  id: string;
  package_id: string;
  deployment_url: string;
  status: 'active' | 'inactive' | 'failed';
  health_check_url?: string;
  last_health_check?: string;
  created_at: string;
}
```

### `MCPTool`
```ts
interface MCPTool {
  id: string;
  package_id: string;
  tool_name?: string;
  description?: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
}
```

### `MCPSearchQuery`
```ts
interface MCPSearchQuery {
  q?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
```

### `MCPSearchResult`
```ts
interface MCPSearchResult {
  packages: MCPServer[];
  total: number;
  limit: number;
  offset: number;
}
```

### `SDKConfig`
```ts
interface SDKConfig {
  registryUrl?: string;
  timeout?: number;
  apiKey?: string;
  requireAuth?: boolean;
}
```

---

## Example Usage

### Import and Instantiate
```ts
import { SigylSDK } from '@sigyl-dev/sdk';
const sdk = new SigylSDK();
```

### Search for MCP Servers
```ts
const results = await sdk.searchMCP('image processing');
console.log(results.packages); // Array of MCPServer
```

### Get Details for a Specific MCP Server
```ts
const details = await sdk.getMCP('my-mcp-server');
console.log(details.tools); // Array of MCPTool
console.log(details.deployments); // Array of MCPDeployment
```

### Get the URL for a Server (for use with modelcontextprotocol/sdk Client)
```ts
const mcpInfo = await sdk.getMCPUrl('my-mcp-server');
if (mcpInfo) {
  const { url, package: server } = mcpInfo;
  // Use `url` with the Model Context Protocol SDK Client
}
```

### Semantic Search for Servers
```ts
const servers = await sdk.semanticMCP('OCR and PDF tools', 3);
console.log(servers);
```

### Semantic Search for Tools
```ts
const tools = await sdk.semanticTools('extract text from images', 5);
for (const tool of tools) {
  console.log(tool.tool_name, tool.mcp_server.name, tool.description);
}
```

---

## Authentication & Configuration
- Most endpoints are public, but some (like `getAllServers`) require an API key with admin permissions.
- You can update the SDK config at runtime using `updateConfig`.

---

## Best Practices & Notes
- Use `searchMCP` for lightweight search; use `getMCP` for full details.
- Use `getMCPUrl` to retrieve the endpoint for direct integration with MCP servers.
- The SDK does not support package creation or deployment.
- Types are provided for TypeScript support and can be imported as needed.

--- 