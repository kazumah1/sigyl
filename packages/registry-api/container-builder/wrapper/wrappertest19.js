const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

console.log("[WRAPPER-STAGE3] Starting MCP Wrapper v19.0.0");
console.log("[WRAPPER-STAGE3] Stage 3: Simplified wrapper with API key injection");
console.log("[WRAPPER-STAGE3] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("[WRAPPER-STAGE3] Express app initialized");

  // API key validation function
  async function isValidSigylApiKey(key) {
    if (!key) return false;
    
    // Check for master key first (for deployment validation)
    const masterKey = process.env.SIGYL_MASTER_KEY;
    if (masterKey && key === masterKey) {
      console.log("[WRAPPER-STAGE3] ✅ Master key validation passed");
      return true;
    }
    
    try {
      const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      return data && data.valid === true;
    } catch (err) {
      console.error('[WRAPPER-STAGE3] API key validation error:', err);
      return false;
    }
  }

  // Fetch secrets from database
  async function fetchSecretsFromDatabase(packageName) {
    console.log("[WRAPPER-STAGE3] Fetching secrets for package:", packageName);
    
    try {
      const sigylApiKey = process.env.SIGYL_API_KEY;
      if (!sigylApiKey) {
        console.log("[WRAPPER-STAGE3] ❌ SIGYL_API_KEY not found in environment");
        return null;
      }

      const response = await fetch(`https://api.sigyl.dev/api/mcp-secrets/${encodeURIComponent(packageName)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sigylApiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("[WRAPPER-STAGE3] ⚠️ No secrets found for package:", packageName);
          return null;
        }
        console.log("[WRAPPER-STAGE3] ❌ Failed to fetch secrets:", response.status);
        return null;
      }

      const secrets = await response.json();
      console.log("[WRAPPER-STAGE3] ✅ Secrets fetched successfully");
      
      // Convert secrets to config format
      const config = {};
      for (const [key, value] of Object.entries(secrets)) {
        if (key === "apiKey" || key === "token" || key === "key") {
          config.apiKey = value;
        } else {
          config[key] = value;
        }
      }
      
      return config;
      
    } catch (error) {
      console.log("[WRAPPER-STAGE3] ❌ Error fetching secrets:", error.message);
      return null;
    }
  }

  // Extract package name from request
  function extractPackageName(req) {
    // Try hostname first (Cloud Run pattern)
    const hostname = req.get("host") || req.hostname;
    if (hostname.includes("sigyl-mcp-")) {
      const match = hostname.match(/sigyl-mcp-([^-]+)-([^-]+)/);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
    
    // Fallback to environment variable
    return process.env.SIGYL_PACKAGE_NAME || "sigyl/dev";
  }

  // /mcp endpoint with API key validation and MCP logic
  app.post('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE3] Received /mcp POST request");
    
    try {
      // Extract API key from headers or query params
      const apiKey = req.headers['x-sigyl-api-key'] || 
                    req.headers["authorization"]?.replace("Bearer ", "") ||
                    req.query.apiKey;
      
      console.log("[WRAPPER-STAGE3] API key present:", !!apiKey);
      
      // Validate API key
      const valid = await isValidSigylApiKey(apiKey);
      console.log("[WRAPPER-STAGE3] API key validation result:", valid);
      
      if (!valid) {
        console.warn('[WRAPPER-STAGE3] 401 Unauthorized: Invalid or missing API key');
        return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
      }

      // Extract package name and fetch secrets
      const packageName = extractPackageName(req);
      console.log("[WRAPPER-STAGE3] Package name:", packageName);
      
      let config = await fetchSecretsFromDatabase(packageName);
      if (!config) {
        console.log("[WRAPPER-STAGE3] ⚠️ No secrets found, using default config");
        config = {
          apiKey: "PLACEHOLDER_WILL_BE_INJECTED_BY_WRAPPER",
          debug: false
        };
      } else {
        console.log("[WRAPPER-STAGE3] ✅ Using real secrets from database");
      }

      // Create the MCP server instance with real config
      console.log("[WRAPPER-STAGE3] Creating MCP server with config:", Object.keys(config));
      const server = createStatelessServer({ config });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      // Cleanup on response close
      res.on('close', () => {
        transport.close();
        server.close();
      });

      // Connect server to transport and handle request
      console.log("[WRAPPER-STAGE3] Connecting server to transport...");
      await server.connect(transport);
      console.log("[WRAPPER-STAGE3] Handling request through MCP server...");
      await transport.handleRequest(req, res, req.body);
      console.log("[WRAPPER-STAGE3] Request handled successfully");
      
    } catch (error) {
      console.error("[WRAPPER-STAGE3] Error in /mcp endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check endpoint
  app.get("/mcp", (req, res) => {
    const packageName = extractPackageName(req);
    res.json({
      status: "healthy",
      stage: "3",
      version: "19.0.0",
      packageName,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/health", (req, res) => {
    const packageName = extractPackageName(req);
    res.json({
      status: "healthy",
      stage: "3",
      packageName,
      timestamp: new Date().toISOString()
    });
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log("[WRAPPER-STAGE3] 🚀 Simplified wrapper listening on port", port);
    console.log("[WRAPPER-STAGE3] Features:");
    console.log("[WRAPPER-STAGE3] ✅ API key validation");
    console.log("[WRAPPER-STAGE3] ✅ Secrets injection from database");
    console.log("[WRAPPER-STAGE3] ✅ Pass-through to MCP server");
    console.log("[WRAPPER-STAGE3] ✅ Query parameter support");
  });
})(); 