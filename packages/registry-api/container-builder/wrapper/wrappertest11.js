const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

console.log("[WRAPPER-STAGE2] Starting MCP Wrapper v11.0.0");
console.log("[WRAPPER-STAGE2] Stage 2: Package Name Extraction + API Key Validation + Basic Server Creation");
console.log("[WRAPPER-STAGE2] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("[WRAPPER-STAGE2] Express app initialized");

  // Simple API key validation (only essential functionality)
  async function isValidSigylApiKey(key) {
    if (!key) {
      console.log("[WRAPPER-STAGE2] No API key provided");
      return false;
    }
    
    try {
      console.log("[WRAPPER-STAGE2] Validating API key...");
      const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      
      if (!resp.ok) {
        console.log("[WRAPPER-STAGE2] API key validation failed:", resp.status);
        return false;
      }
      
      const data = await resp.json();
      const isValid = data && data.valid === true;
      console.log("[WRAPPER-STAGE2] API key validation result:", isValid);
      return isValid;
    } catch (err) {
      console.error("[WRAPPER-STAGE2] API key validation error:", err);
      return false;
    }
  }

  // Package name extraction function (Stage 2 feature)
  function extractPackageName(req) {
    console.log("[WRAPPER-STAGE2] =========================================");
    console.log("[WRAPPER-STAGE2] Extracting package name from request...");
    
    // Method 1: Extract from proxy path (/@owner/repo-name/mcp)
    const proxyPath = req.originalUrl || req.url;
    console.log("[WRAPPER-STAGE2] Proxy path:", proxyPath);
    
    const proxyMatch = proxyPath.match(/\/@([^\/]+)\/([^\/]+)\/mcp/);
    if (proxyMatch) {
      const packageName = `${proxyMatch[1]}/${proxyMatch[2]}`;
      console.log("[WRAPPER-STAGE2] ✅ Extracted from proxy path:", packageName);
      return packageName;
    }

    // Method 2: Extract from Cloud Run service name in hostname
    const hostname = req.get('host') || req.headers.host;
    console.log("[WRAPPER-STAGE2] Hostname:", hostname);
    
    if (hostname && hostname.includes('sigyl-mcp-')) {
      // Extract from patterns like: sigyl-mcp-owner-repo-hash.region.run.app
      const hostMatch = hostname.match(/sigyl-mcp-([^-]+)-([^-]+)/);
      if (hostMatch) {
        const packageName = `${hostMatch[1]}/${hostMatch[2]}`;
        console.log("[WRAPPER-STAGE2] ✅ Extracted from hostname:", packageName);
        return packageName;
      }
    }

    // Method 3: Extract from referer header (if available)
    const referer = req.get('referer');
    console.log("[WRAPPER-STAGE2] Referer:", referer);
    
    if (referer) {
      const refererMatch = referer.match(/\/@([^\/]+)\/([^\/]+)/);
      if (refererMatch) {
        const packageName = `${refererMatch[1]}/${refererMatch[2]}`;
        console.log("[WRAPPER-STAGE2] ✅ Extracted from referer:", packageName);
        return packageName;
      }
    }

    // Method 4: Environment variable fallback
    const envPackageName = process.env.SIGYL_PACKAGE_NAME;
    if (envPackageName) {
      console.log("[WRAPPER-STAGE2] ✅ Using environment variable:", envPackageName);
      return envPackageName;
    }

    // Method 5: Default fallback for testing
    const defaultPackageName = 'sigyl-dev/brave-search';
    console.log("[WRAPPER-STAGE2] ⚠️ Using default fallback:", defaultPackageName);
    return defaultPackageName;
  }

  // Health check endpoint (required for deployment)
  app.get('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE2] Health check GET /mcp");
    try {
      const packageName = extractPackageName(req);
      res.json({
        status: 'ready',
        transport: 'http',
        endpoint: '/mcp',
        stage: 2,
        version: '11.0.0-stage2',
        packageName: packageName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[WRAPPER-STAGE2] Health check failed:", error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Main MCP POST endpoint (Stage 2 functionality)
  app.post('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE2] =================================");
    console.log("[WRAPPER-STAGE2] Received POST /mcp request");
    
    try {
      // Step 1: Extract API key
      const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
      console.log("[WRAPPER-STAGE2] API key present:", !!apiKey);

      // Step 2: Validate API key
      const isValid = await isValidSigylApiKey(apiKey);
      if (!isValid) {
        console.log("[WRAPPER-STAGE2] Invalid API key, returning 401");
        return res.status(401).json({ 
          error: 'Invalid or missing Sigyl API Key',
          stage: 2
        });
      }

      console.log("[WRAPPER-STAGE2] API key validation passed");

      // Step 3: Extract package name (Stage 2 feature)
      const packageName = extractPackageName(req);
      console.log("[WRAPPER-STAGE2] Package name extracted:", packageName);

      // Step 4: Create MCP server with default config (Stage 1 feature maintained)
      console.log("[WRAPPER-STAGE2] Creating MCP server...");
      const defaultConfig = {
        apiKey: "PLACEHOLDER_WILL_BE_INJECTED_BY_WRAPPER",
        debug: false
      };
      console.log("[WRAPPER-STAGE2] Using default config:", defaultConfig);
      const server = createStatelessServer({ config: defaultConfig });
      console.log("[WRAPPER-STAGE2] MCP server created");

      // Step 5: Create transport
      console.log("[WRAPPER-STAGE2] Creating transport...");
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      console.log("[WRAPPER-STAGE2] Transport created");

      // Step 6: Setup cleanup
      res.on('close', () => {
        console.log("[WRAPPER-STAGE2] Response closed, cleaning up...");
        try {
          transport.close();
          server.close();
        } catch (cleanupError) {
          console.error("[WRAPPER-STAGE2] Cleanup error:", cleanupError);
        }
      });

      // Step 7: Connect server to transport
      console.log("[WRAPPER-STAGE2] Connecting server to transport...");
      await server.connect(transport);
      console.log("[WRAPPER-STAGE2] Server connected");

      // Step 8: Handle request
      console.log("[WRAPPER-STAGE2] Handling request...");
      await transport.handleRequest(req, res, req.body);
      console.log("[WRAPPER-STAGE2] Request handled successfully");

    } catch (error) {
      console.error("[WRAPPER-STAGE2] ERROR in POST /mcp:");
      console.error("[WRAPPER-STAGE2] Error message:", error.message);
      console.error("[WRAPPER-STAGE2] Error stack:", error.stack);
      
      // Return error response
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        stage: 2,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Additional health endpoint
  app.get('/health', (req, res) => {
    console.log("[WRAPPER-STAGE2] Health check GET /health");
    const packageName = extractPackageName(req);
    res.json({ 
      status: 'healthy',
      stage: 2,
      version: '11.0.0-stage2',
      packageName: packageName,
      timestamp: new Date().toISOString()
    });
  });

  // Start server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log("[WRAPPER-STAGE2] 🚀 Stage 2 wrapper listening on port", PORT);
    console.log("[WRAPPER-STAGE2] Environment:", process.env.NODE_ENV || 'production');
    console.log("[WRAPPER-STAGE2] Container ID:", process.env.HOSTNAME || 'unknown');
    console.log("[WRAPPER-STAGE2] Stage 2 Features:");
    console.log("[WRAPPER-STAGE2]   ✅ API key validation");
    console.log("[WRAPPER-STAGE2]   ✅ Package name extraction (NEW!)");
    console.log("[WRAPPER-STAGE2]   ✅ Basic MCP server creation");
    console.log("[WRAPPER-STAGE2]   ✅ Request/response handling");
    console.log("[WRAPPER-STAGE2]   ✅ Health checks");
    console.log("[WRAPPER-STAGE2]   ❌ Config/secrets management (Stage 3)");
    console.log("[WRAPPER-STAGE2]   ❌ Enhanced error handling (Stage 4)");
    console.log("[WRAPPER-STAGE2]   ❌ Metrics collection (Stage 5)");
    console.log("[WRAPPER-STAGE2]   ❌ Session management (Stage 6)");
  });
})(); 