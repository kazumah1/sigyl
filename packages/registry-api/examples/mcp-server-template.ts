import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Extend Express Request interface to include environment
declare global {
  namespace Express {
    interface Request {
      environment?: Record<string, string>;
    }
  }
}

const app = express();
app.use(express.json());

// Middleware to extract environment variables from headers and request context
app.use((req, res, next) => {
  // Initialize environment object
  req.environment = {};
  
  // Method 1: Extract from Sigyl gateway headers
  Object.keys(req.headers).forEach(key => {
    if (key.startsWith('x-secret-')) {
      const envKey = key.replace('x-secret-', '');
      req.environment![envKey] = req.headers[key] as string;
    } else if (key.startsWith('x-env-')) {
      const envKey = key.replace('x-env-', '');
      req.environment![envKey] = req.headers[key] as string;
    }
  });
  
  // Method 2: Extract from request context (for MCP protocol requests)
  if (req.body && req.body.context && req.body.context.environment) {
    Object.assign(req.environment!, req.body.context.environment);
  }
  
  // Method 3: Fallback to process.env (for traditional deployment)
  if (Object.keys(req.environment!).length === 0) {
    // Only use process.env if no gateway environment variables were found
    req.environment = process.env as Record<string, string>;
  }
  
  next();
});

// Create stateless MCP server
function createStatelessServer({ config }: { config: any }) {
  const server = new McpServer({
    name: 'example-mcp-server',
    version: '1.0.0'
  });

  // Example tool that uses environment variables
  server.tool(
    'call_external_api',
    'Call an external API using injected credentials',
    {
      endpoint: { type: 'string' },
      data: { type: 'object' }
    },
    async (args, context) => {
      // Access environment variables from the request context
      // The context parameter might not be available in all MCP SDK versions
      // So we'll use a more robust approach
      let environment: Record<string, string> = {};
      
      // Try to get environment from context if available
      if (context && typeof context === 'object' && 'environment' in context) {
        environment = (context as any).environment || {};
      }
      
      // Fallback to process.env if no gateway environment
      if (Object.keys(environment).length === 0) {
        environment = process.env as Record<string, string>;
      }
      
      const apiKey = environment.API_KEY || environment.apiKey;
      
      if (!apiKey) {
        throw new Error('API key not found in environment variables');
      }
      
      // Use the API key to make the external call
      const response = await fetch(args.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(args.data)
      });
      
      const result = await response.json();
      
      return {
        content: [
          { type: 'text', text: `API call successful: ${JSON.stringify(result)}` }
        ]
      };
    }
  );

  return server.server;
}

// Health check endpoint to verify environment variables
app.get('/health', (req, res) => {
  const environment = req.environment || {};
  const hasApiKey = !!(environment.API_KEY || environment.apiKey);
  
  res.json({
    status: 'healthy',
    environment: {
      hasApiKey,
      keys: Object.keys(environment).filter(key => !key.includes('SECRET') && !key.includes('PASSWORD')),
      gatewaySession: req.body?.context?.gatewaySession || null
    },
    message: hasApiKey ? 'Environment variables loaded successfully' : 'No API key found'
  });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const server = createStatelessServer({ config: {} });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  
  res.on('close', () => {
    transport.close();
    server.close();
  });
  
  await server.connect(transport);
  
  // Pass the request environment to the MCP context
  const mcpRequest = {
    ...req.body,
    context: {
      ...req.body.context,
      environment: req.environment
    }
  };
  
  await transport.handleRequest(req, res, mcpRequest);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log('Environment variables will be injected via Sigyl gateway');
  console.log('Check /health endpoint to see injected environment variables');
});

export default app; 