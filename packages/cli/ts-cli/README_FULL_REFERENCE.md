# Sigyl CLI & SDK Full Reference

---

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration & Authentication](#configuration--authentication)
- [CLI Usage & Command Reference](#cli-usage--command-reference)
- [SDK Usage & API Reference](#sdk-usage--api-reference)
- [Advanced Usage & Developer Workflows](#advanced-usage--developer-workflows)
- [Security & Best Practices](#security--best-practices)
- [Troubleshooting](#troubleshooting)
- [MCP Server Templates & Integration](#mcp-server-templates--integration)
- [Links & Resources](#links--resources)

---

## Overview

**Sigyl** provides a unified platform for discovering, installing, and integrating Model Context Protocol (MCP) tools and servers. It consists of:
- **CLI**: `@sigyl-dev/cli` — for installing, managing, and integrating MCP packages.
- **SDK**: `@sigyl-dev/sdk` — for programmatic access to the registry, tool invocation, and package management.

---

## Quick Start

### CLI
```bash
# Install and use any public MCP package instantly
npx @sigyl-dev/cli install <package-name>
```

### SDK
```bash
npm install @sigyl-dev/sdk
```
```typescript
import { connect } from '@sigyl-dev/sdk';
const summarize = await connect('text-summarizer', 'summarize');
const result = await summarize({ text: 'Long text...', maxLength: 100 });
```

---

## Installation

### CLI
```bash
# Global install (optional)
npm install -g @sigyl-dev/cli
# Or use with npx (recommended for most users)
npx @sigyl-dev/cli install <package-name>
```

### SDK
```bash
npm install @sigyl-dev/sdk
```

---

## Configuration & Authentication

### CLI
- **Public packages**: No config needed.
- **Private packages or custom registry**:
  1. Run `sigyl config` and follow prompts for registry URL and API key.
  2. API key: Get from [sigyl.dev/dashboard](https://sigyl.dev/dashboard).
- **View config**: `sigyl config show`
- **Reset config**: `sigyl config reset`
- **Config file**: `~/.sigyl/config.json` (macOS/Linux), `%USERPROFILE%\.sigyl\config.json` (Windows)
- **Env vars** (for dev):
  ```bash
  export SIGYL_REGISTRY_URL="http://localhost:3000"
  export SIGYL_API_KEY="sk_your_key_here"
  ```

### SDK
- Pass `apiKey` and `registryUrl` in config objects or use environment variables.
- Example:
  ```typescript
  import { MCPConnectSDK } from '@sigyl-dev/sdk';
  const sdk = new MCPConnectSDK({
    registryUrl: 'https://api.sigyl.dev/api/v1',
    apiKey: process.env.SIGYL_API_KEY,
    requireAuth: true
  });
  ```

---

## CLI Usage & Command Reference

### Common Commands
- `sigyl install <package>`: Install MCP package (supports `--client`, `--list`, `--remove`)
- `sigyl config`: Configure registry URL and API key
- `sigyl config show`: Show current config
- `sigyl config reset`: Reset config to defaults
- `sigyl integrate [directory]`: Integrate MCP endpoints into an existing Express app
- `sigyl scan [directory]`: Scan Express app and generate standalone MCP server
- `sigyl init`: Create a template MCP server
- `sigyl dev [directory]`: Start dev mode with hot reload
- `sigyl inspect [server-path]`: Launch MCP Inspector UI
- `sigyl clean`: Remove generated files
- `sigyl build`: Build MCP server from TypeScript to JavaScript

### Install Command Options
- `--client <client>`: Target client (`claude`, `vscode`, `cursor`)
- `--list`: List installed MCP servers
- `--remove <name>`: Remove an MCP server
- `--env <key=value>`: Set environment variables
- `--cwd <path>`: Set working directory
- `--profile <profile>`: Use a named profile
- `--key <key>`: Use a specific API key

### Integration Command
- Adds MCP endpoints to your Express app.
- Outputs integration code and usage instructions.
- Example:
  ```bash
  sigyl integrate ./my-express-app --out .sigyl-mcp --endpoint /mcp --language typescript
  # Then add to your app:
  import { addMCPEndpoints } from './.sigyl-mcp/integration'
  addMCPEndpoints(app)
  ```

### Scan/Init/Dev
- `scan`: Generates a new MCP server from an existing Express app.
- `init`: Creates a template MCP server (with sample tool).
- `dev`: Hot-reloads MCP server and Express app for rapid development.

### Inspect
- `inspect`: Launches a UI to test your MCP server or endpoint.

### Clean/Build
- `clean`: Removes generated files.
- `build`: Compiles TypeScript MCP server to JavaScript.

---

## SDK Usage & API Reference

### Core Functions
- `connect(packageName, toolName, options?)`: Connect to a tool in a package.
- `connectDirect(toolUrl, options?)`: Connect directly to a tool by URL.
- `searchPackages(query?, tags?, limit?, offset?, config?)`: Search for packages.
- `getPackage(name, config?)`: Get details about a package.
- `invoke(toolUrl, input, config?)`: Manually invoke a tool by URL.
- `registerMCP(packageData, apiKey?, config?)`: Register a new MCP package (requires API key).

### SDK Class
- `MCPConnectSDK`: Advanced usage for managing connections, searching, and registering packages.
- Example:
  ```typescript
  import { MCPConnectSDK } from '@sigyl-dev/sdk';
  const sdk = new MCPConnectSDK({ registryUrl, apiKey, requireAuth: true });
  const results = await sdk.searchPackages('text', ['nlp'], 5);
  const allTools = await sdk.connectAll('text-processor');
  const summary = await allTools.summarize({ text: 'Hello world' });
  ```

### Types
- All types are exported: `MCPPackage`, `MCPTool`, `PackageWithDetails`, `ToolFunction`, `SDKConfig`, etc.

---

## Advanced Usage & Developer Workflows

### CLI
- **Custom MCP server**: Use `sigyl init` or `sigyl scan` to generate a new server, then customize `server.ts` and `sigyl.yaml`.
- **Integration**: Use `sigyl integrate` to add MCP endpoints to an existing Express app.
- **Dev mode**: Use `sigyl dev` for hot-reload development.
- **Environment variables**: Use for local dev/testing.

### SDK
- **Authenticated operations**: Pass `requireAuth: true` and an API key.
- **Registering packages**: Use `registerMCP` with full package/tool schema.
- **Direct tool invocation**: Use `connectDirect` or `invoke` for custom endpoints.
- **TypeScript support**: All types are exported for type-safe development.

---

## Security & Best Practices

- **Never commit API keys** to version control.
- **Use environment variables** for secrets.
- **Rotate API keys** regularly.
- **Use different keys** for dev and prod.
- **Monitor API usage** via the Sigyl dashboard.
- **CLI**: All usage is tracked and rate-limited by the registry API.

---

## Troubleshooting

- **Package not found**: Ensure the package exists in the registry. See [sigyl.dev/marketplace](https://sigyl.dev/marketplace).
- **Authentication failed**: Check your API key and registry URL. Get a new key at [sigyl.dev/dashboard](https://sigyl.dev/dashboard).
- **Connection issues**: Check your internet connection and registry URL.
- **CLI errors**: Use `sigyl config show` to verify your config.
- **SDK errors**: Ensure your API key and registry URL are correct.

---

## MCP Server Templates & Integration

### Template Files
- `sigyl.yaml`: MCP server config (JSON Schema for tool/server options)
- `server.ts`: Example MCP server (Express + MCP SDK)

#### Example `sigyl.yaml`
```yaml
runtime: node
language: typescript
startCommand:
  type: http
  configSchema:
    type: object
    required:
      - apiKey
      - environment
    properties:
      apiKey:
        type: string
        title: MCP API Key
        description: Your MCP API key (required)
      serviceName:
        type: string
        title: Service Name
        default: my-mcp-service
        description: Name of the MCP-compatible service
      logLevel:
        type: string
        title: Log Level
        default: info
        enum:
          - debug
          - info
          - warn
          - error
        description: Logging verbosity level
      timeout:
        type: number
        title: Timeout
        description: Request timeout in seconds
        default: 30
        minimum: 1
        maximum: 300
      enableMetrics:
        type: boolean
        title: Enable Metrics
        description: Enable metrics collection
        default: false
      allowedClients:
        type: array
        title: Allowed Clients
        description: List of client IDs allowed to access the server
        items:
          type: string
        default: []
      customSettings:
        type: object
        title: Custom Settings
        description: Advanced custom settings for the server
        properties:
          maxConnections:
            type: number
            default: 100
          useCache:
            type: boolean
            default: true
        default: {}
      environment:
        type: string
        title: Environment
        description: Deployment environment
        enum:
          - development
          - staging
          - production
        default: development
```

#### Example `server.ts`
```typescript
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"

export default function createStatelessServer({ config }: { config: any }) {
  const server = new McpServer({ name: "generated-mcp-server", version: "1.0.0" });
  server.tool(
    "reverseString",
    "Reverse a string value",
    { value: z.string().describe("String to reverse") },
    async ({ value }) => ({ content: [{ type: "text", text: value.split("").reverse().join("") }] })
  );
  return server.server;
}

const app = express();
app.use(express.json());
app.post('/mcp', async (req, res) => {
  const server = createStatelessServer({ config: {} });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
const port = process.env.PORT || 8080;
app.listen(port, () => { console.log("MCP Server listening on port " + port); });
```

---

## Links & Resources

- [Marketplace](https://sigyl.dev/marketplace)
- [Dashboard](https://sigyl.dev/dashboard)
- [Documentation](https://docs.sigyl.dev)
- [Discord Support](https://discord.gg/sigyl)

---

**Suggested Page Splits for Multi-Page Docs:**
- Getting Started (Quick Start, Installation, Config)
- CLI Reference (All commands, options, troubleshooting)
- SDK Reference (API, types, advanced usage)
- MCP Server Development (Templates, integration, best practices)
- Security & Troubleshooting
- Links & Further Reading 