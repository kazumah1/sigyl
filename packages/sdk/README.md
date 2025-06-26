# @sigyl/sdk

Developer SDK for Sigyl MCP Registry and Hosting Platform. This SDK provides a clean, developer-friendly interface for discovering, connecting to, and using MCP (Model Context Protocol) tools.

## 🚀 Quick Start

```bash
npm install @sigyl/sdk
```

```typescript
import { connect, searchPackages, getPackage } from '@sigyl/sdk';

// Connect to a tool from the registry
const summarize = await connect('text-summarizer', 'summarize', {
  registryUrl: 'http://localhost:3000/api/v1'
});

const result = await summarize({ 
  text: "Long text to summarize...",
  maxLength: 100 
});
```

## 🔐 Authentication

The SDK supports API key authentication for secure operations. Some operations require authentication while others can be public.

### Getting an API Key

1. Sign up at [Sigyl Platform](https://sigyl.dev)
2. Go to your dashboard
3. Generate an API key
4. Use the key in your SDK configuration

### Using Authentication

```typescript
import { MCPConnectSDK } from '@sigyl/sdk';

// Initialize with API key
const sdk = new MCPConnectSDK({
  registryUrl: 'http://localhost:3000/api/v1',
  apiKey: 'sk_your_api_key_here',
  requireAuth: true, // Require authentication for all operations
  timeout: 15000
});

// All operations will now use authentication
const packages = await sdk.getAllPackages();
```

### Authentication Levels

| Operation | Default | With `requireAuth: true` |
|-----------|---------|-------------------------|
| `searchPackages()` | Public | Requires API key |
| `getPackage()` | Public | Requires API key |
| `connect()` | Public | Requires API key |
| `registerMCP()` | **Always requires API key** | Requires API key |
| `invoke()` | Depends on tool | Depends on tool |

## 📚 API Reference

### Core Functions

#### `connect(packageName, toolName, options?)`
Connect to a specific tool in a package from the registry.

```typescript
const tool = await connect('text-processor', 'summarize', {
  registryUrl: 'http://localhost:3000/api/v1',
  apiKey: 'sk_your_api_key_here', // Optional
  timeout: 10000
});

const result = await tool({ text: "Hello world" });
```

#### `connectDirect(toolUrl, options?)`
Connect directly to a tool by URL.

```typescript
const tool = await connectDirect('https://my-tool.com/summarize', {
  timeout: 10000
});

const result = await tool({ text: "Hello world" });
```

#### `searchPackages(query?, tags?, limit?, offset?, config?)`
Search for packages in the registry.

```typescript
const results = await searchPackages('text', ['nlp'], 10, 0, {
  registryUrl: 'http://localhost:3000/api/v1',
  apiKey: 'sk_your_api_key_here', // Optional
  requireAuth: true // Optional: require authentication
});

console.log(`Found ${results.total} packages`);
```

#### `getPackage(name, config?)`
Get detailed information about a specific package.

```typescript
const package = await getPackage('text-summarizer', {
  registryUrl: 'http://localhost:3000/api/v1',
  apiKey: 'sk_your_api_key_here' // Optional
});

console.log('Available tools:', package.tools.map(t => t.tool_name));
```

#### `invoke(toolUrl, input, config?)`
Manually invoke a tool by URL.

```typescript
const result = await invoke('https://my-tool.com/summarize', {
  text: "Hello world"
}, {
  apiKey: 'sk_your_api_key_here' // Optional
});
```

#### `registerMCP(packageData, apiKey?, config?)`
Register a new MCP package in the registry. **Always requires authentication.**

```typescript
const newPackage = await registerMCP({
  name: 'my-tool',
  description: 'A cool tool',
  tags: ['nlp', 'text'],
  tools: [{
    tool_name: 'process',
    description: 'Process text',
    input_schema: { text: 'string' }
  }]
}, 'sk_your_api_key_here'); // Required
```

### SDK Class

For more advanced usage, use the `MCPConnectSDK` class:

```typescript
import { MCPConnectSDK } from '@sigyl/sdk';

const sdk = new MCPConnectSDK({
  registryUrl: 'http://localhost:3000/api/v1',
  apiKey: 'sk_your_api_key_here', // Optional
  requireAuth: true, // Optional: require authentication for all operations
  timeout: 15000
});

// Search for packages
const results = await sdk.searchPackages('text', ['nlp'], 5);

// Connect to all tools in a package
const allTools = await sdk.connectAll('text-processor');
const summary = await allTools.summarize({ text: "Hello world" });
```

## 🔧 Configuration

### SDKConfig
```typescript
interface SDKConfig {
  registryUrl?: string;  // Default: 'http://localhost:3000/api/v1'
  timeout?: number;      // Default: 10000ms
  apiKey?: string;       // For authenticated requests
  requireAuth?: boolean; // Require authentication for all operations
}
```

### ConnectOptions
```typescript
interface ConnectOptions {
  registryUrl?: string;  // Registry API URL
  timeout?: number;      // Request timeout
  apiKey?: string;       // API key for authentication
  headers?: Record<string, string>;  // Custom headers
}
```

## 📦 Types

The SDK exports all the types you need:

```typescript
import type {
  MCPPackage,
  MCPTool,
  MCPDeployment,
  PackageWithDetails,
  PackageSearchResult,
  ToolFunction,
  SDKConfig,
  AuthConfig
} from '@sigyl/sdk';
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

## 📋 Examples

See the `examples/` directory for more detailed usage examples.

### Basic Usage (No Authentication)
```typescript
import { connect, searchPackages } from '@sigyl/sdk';

async function main() {
  // Search for text processing tools (public)
  const results = await searchPackages('text', ['nlp']);
  
  // Connect to the first tool (public)
  if (results.packages.length > 0) {
    const tool = await connect(results.packages[0].name, 'process');
    const result = await tool({ text: "Hello world" });
    console.log(result);
  }
}
```

### Authenticated Usage
```typescript
import { MCPConnectSDK } from '@sigyl/sdk';

async function main() {
  const sdk = new MCPConnectSDK({
    registryUrl: 'https://registry.sigyl.dev/api/v1',
    apiKey: 'sk_your_api_key_here',
    requireAuth: true
  });

  // All operations require authentication
  const allPackages = await sdk.getAllPackages();
  
  // Register a new package (always requires auth)
  const newPackage = await sdk.registerMCP({
    name: 'my-secure-tool',
    description: 'A secure tool',
    tools: [{
      tool_name: 'secure-process',
      description: 'Process data securely'
    }]
  });
}
```

### Advanced Usage
```typescript
import { MCPConnectSDK } from '@sigyl/sdk';

async function main() {
  const sdk = new MCPConnectSDK({
    registryUrl: 'https://registry.sigyl.dev/api/v1'
  });

  // Get all available packages
  const allPackages = await sdk.getAllPackages();
  
  // Connect to multiple tools
  for (const pkg of allPackages.slice(0, 3)) {
    try {
      const tools = await sdk.connectAll(pkg.name);
      console.log(`Connected to ${Object.keys(tools).length} tools in ${pkg.name}`);
    } catch (error) {
      console.log(`Failed to connect to ${pkg.name}:`, error.message);
    }
  }
}
```

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for API keys:
   ```typescript
   const sdk = new MCPConnectSDK({
     apiKey: process.env.SIGYL_API_KEY
   });
   ```
3. **Rotate API keys** regularly
4. **Use different keys** for development and production
5. **Monitor API usage** through your Sigyl dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 