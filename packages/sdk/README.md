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

## 📚 API Reference

### Core Functions

#### `connect(packageName, toolName, options?)`
Connect to a specific tool in a package from the registry.

```typescript
const tool = await connect('text-processor', 'summarize', {
  registryUrl: 'http://localhost:3000/api/v1',
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
  registryUrl: 'http://localhost:3000/api/v1'
});

console.log(`Found ${results.total} packages`);
```

#### `getPackage(name, config?)`
Get detailed information about a specific package.

```typescript
const package = await getPackage('text-summarizer', {
  registryUrl: 'http://localhost:3000/api/v1'
});

console.log('Available tools:', package.tools.map(t => t.tool_name));
```

#### `invoke(toolUrl, input, config?)`
Manually invoke a tool by URL.

```typescript
const result = await invoke('https://my-tool.com/summarize', {
  text: "Hello world"
});
```

#### `registerMCP(packageData, apiKey?, config?)`
Register a new MCP package in the registry.

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
}, 'your-api-key');
```

### SDK Class

For more advanced usage, use the `MCPConnectSDK` class:

```typescript
import { MCPConnectSDK } from '@sigyl/sdk';

const sdk = new MCPConnectSDK({
  registryUrl: 'http://localhost:3000/api/v1',
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
}
```

### ConnectOptions
```typescript
interface ConnectOptions {
  registryUrl?: string;  // Registry API URL
  timeout?: number;      // Request timeout
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
  ToolFunction
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

### Basic Usage
```typescript
import { connect, searchPackages } from '@sigyl/sdk';

async function main() {
  // Search for text processing tools
  const results = await searchPackages('text', ['nlp']);
  
  // Connect to the first tool
  if (results.packages.length > 0) {
    const tool = await connect(results.packages[0].name, 'process');
    const result = await tool({ text: "Hello world" });
    console.log(result);
  }
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details. 