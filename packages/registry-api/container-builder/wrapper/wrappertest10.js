const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

console.log("[WRAPPER-STAGE1] Starting Bare Minimum MCP Wrapper v9.0.0");
console.log("[WRAPPER-STAGE1] Stage 1: API Key Validation + Basic Server Creation");
console.log("[WRAPPER-STAGE1] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("[WRAPPER-STAGE1] Express app initialized");

  // Simple API key validation (only essential functionality)
  async function isValidSigylApiKey(key) {
    if (!key) {
      console.log("[WRAPPER-STAGE1] No API key provided");
      return false;
    }
    
    try {
      console.log("[WRAPPER-STAGE1] Validating API key...");
      const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      
      if (!resp.ok) {
        console.log("[WRAPPER-STAGE1] API key validation failed:", resp.status);
        return false;
      }
      
      const data = await resp.json();
      const isValid = data && data.valid === true;
      console.log("[WRAPPER-STAGE1] API key validation result:", isValid);
      return isValid;
    } catch (err) {
      console.error("[WRAPPER-STAGE1] API key validation error:", err);
      return false;
    }
  }

  // Health check endpoint (required for deployment)
  app.get('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE1] Health check GET /mcp");
    try {
      res.json({
        status: 'ready',
        transport: 'http',
        endpoint: '/mcp',
        stage: 1,
        version: '9.0.0-stage1',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("[WRAPPER-STAGE1] Health check failed:", error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Main MCP POST endpoint (bare minimum functionality)
  app.post('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE1] =================================");
    console.log("[WRAPPER-STAGE1] Received POST /mcp request");
    
    try {
      // Step 1: Extract API key
      const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
      console.log("[WRAPPER-STAGE1] API key present:", !!apiKey);

      // Step 2: Validate API key
      const isValid = await isValidSigylApiKey(apiKey);
      if (!isValid) {
        console.log("[WRAPPER-STAGE1] Invalid API key, returning 401");
        return res.status(401).json({ 
          error: 'Invalid or missing Sigyl API Key',
          stage: 1
        });
      }

      console.log("[WRAPPER-STAGE1] API key validation passed");

      // Step 3: Create MCP server with default config (Stage 1 - minimal config)
      console.log("[WRAPPER-STAGE1] Creating MCP server...");
      const defaultConfig = {
        apiKey: "PLACEHOLDER_WILL_BE_INJECTED_BY_WRAPPER",
        debug: false
      };
      console.log("[WRAPPER-STAGE1] Using default config:", defaultConfig);
      const server = createStatelessServer({ config: defaultConfig });
      console.log("[WRAPPER-STAGE1] MCP server created");

      // Step 4: Create transport
      console.log("[WRAPPER-STAGE1] Creating transport...");
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      console.log("[WRAPPER-STAGE1] Transport created");

      // Step 5: Setup cleanup
      res.on('close', () => {
        console.log("[WRAPPER-STAGE1] Response closed, cleaning up...");
        try {
          transport.close();
          server.close();
        } catch (cleanupError) {
          console.error("[WRAPPER-STAGE1] Cleanup error:", cleanupError);
        }
      });

      // Step 6: Connect server to transport
      console.log("[WRAPPER-STAGE1] Connecting server to transport...");
      await server.connect(transport);
      console.log("[WRAPPER-STAGE1] Server connected");

      // Step 7: Handle request
      console.log("[WRAPPER-STAGE1] Handling request...");
      await transport.handleRequest(req, res, req.body);
      console.log("[WRAPPER-STAGE1] Request handled successfully");

    } catch (error) {
      console.error("[WRAPPER-STAGE1] ERROR in POST /mcp:");
      console.error("[WRAPPER-STAGE1] Error message:", error.message);
      console.error("[WRAPPER-STAGE1] Error stack:", error.stack);
      
      // Return error response
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        stage: 1,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Additional health endpoint
  app.get('/health', (req, res) => {
    console.log("[WRAPPER-STAGE1] Health check GET /health");
    res.json({ 
      status: 'healthy',
      stage: 1,
      version: '9.0.0-stage1',
      timestamp: new Date().toISOString()
    });
  });

  // Start server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log("[WRAPPER-STAGE1] 🚀 Stage 1 wrapper listening on port", PORT);
    console.log("[WRAPPER-STAGE1] Environment:", process.env.NODE_ENV || 'production');
    console.log("[WRAPPER-STAGE1] Container ID:", process.env.HOSTNAME || 'unknown');
    console.log("[WRAPPER-STAGE1] Stage 1 Features:");
    console.log("[WRAPPER-STAGE1]   ✅ API key validation");
    console.log("[WRAPPER-STAGE1]   ✅ Basic MCP server creation");
    console.log("[WRAPPER-STAGE1]   ✅ Request/response handling");
    console.log("[WRAPPER-STAGE1]   ✅ Health checks");
    console.log("[WRAPPER-STAGE1]   ❌ Package name extraction (Stage 2)");
    console.log("[WRAPPER-STAGE1]   ❌ Config/secrets management (Stage 3)");
    console.log("[WRAPPER-STAGE1]   ❌ Enhanced error handling (Stage 4)");
    console.log("[WRAPPER-STAGE1]   ❌ Metrics collection (Stage 5)");
    console.log("[WRAPPER-STAGE1]   ❌ Session management (Stage 6)");
  });
})(); 