const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

console.log("[WRAPPER-HARDCODE] Starting MCP Wrapper v23.0.0 (HARDCODED)");
console.log("[WRAPPER-HARDCODE] Stage 3: Hardcoded for testing");
console.log("[WRAPPER-HARDCODE] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("[WRAPPER-HARDCODE] Express app initialized");

  // HARDCODED VALUES FOR TESTING
  const HARDCODED_API_KEY = "sk_405327c43f71f79b4a958b8dcd445a08e09dfd444e2528b0d9c9675ab129ebeb";
  const HARDCODED_PACKAGE_NAME = "sigyl-dev/Brave-Search";

  // API key validation function (always returns true for hardcoded key)
  async function isValidSigylApiKey(key) {
    if (!key) return false;
    
    // Check for master key first (for deployment validation)
    const masterKey = process.env.SIGYL_MASTER_KEY;
    if (masterKey && key === masterKey) {
      console.log("[WRAPPER-HARDCODE] ✅ Master key validation passed");
      return true;
    }
    
    // Check for hardcoded key
    if (key === HARDCODED_API_KEY) {
      console.log("[WRAPPER-HARDCODE] ✅ Hardcoded API key validation passed");
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
      console.error('[WRAPPER-HARDCODE] API key validation error:', err);
      return false;
    }
  }

  // Fetch secrets from database using the hardcoded API key
  async function fetchSecretsFromDatabase() {
    console.log("[WRAPPER-HARDCODE] Fetching secrets for package:", HARDCODED_PACKAGE_NAME);
    console.log("[WRAPPER-HARDCODE] Using hardcoded API key for authentication");
    
    try {
      const response = await fetch(`https://api.sigyl.dev/api/mcp-secrets/${encodeURIComponent(HARDCODED_PACKAGE_NAME)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${HARDCODED_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      console.log("[WRAPPER-HARDCODE] API response status:", response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[WRAPPER-HARDCODE] ⚠️ No secrets found for package:", HARDCODED_PACKAGE_NAME);
          return null;
        }
        const errorText = await response.text();
        console.log("[WRAPPER-HARDCODE] ❌ Failed to fetch secrets:", response.status, errorText);
        return null;
      }

      const secrets = await response.json();
      console.log("[WRAPPER-HARDCODE] ✅ Secrets fetched successfully");
      console.log("[WRAPPER-HARDCODE] Secret keys found:", Object.keys(secrets));
      
      // IMPROVED: Preserve all secret names, don't overwrite
      const config = { ...secrets };
      
      // Only set apiKey if it doesn't already exist and we have a primary key
      if (!config.apiKey) {
        // Look for common primary key names
        const primaryKey = secrets.apiKey || secrets.token || secrets.key || secrets.accessToken;
        if (primaryKey) {
          config.apiKey = primaryKey;
          console.log("[WRAPPER-HARDCODE] Set primary apiKey from:", Object.keys(secrets).find(k => secrets[k] === primaryKey));
        }
      }
      
      console.log("[WRAPPER-HARDCODE] Final config keys:", Object.keys(config));
      return config;
      
    } catch (error) {
      console.log("[WRAPPER-HARDCODE] ❌ Error fetching secrets:", error.message);
      console.log("[WRAPPER-HARDCODE] Error stack:", error.stack);
      return null;
    }
  }

  // /mcp endpoint with hardcoded values
  app.post('/mcp', async (req, res) => {
    console.log("[WRAPPER-HARDCODE] Received /mcp POST request");
    
    try {
      // Extract API key from headers or query params (for validation)
      const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
      console.log("[WRAPPER-HARDCODE] x-sigyl-api-key header:", req.headers['x-sigyl-api-key']);
      console.log("[WRAPPER-HARDCODE] apiKey from query:", req.query.apiKey);
      console.log("[WRAPPER-HARDCODE] Using apiKey:", apiKey);
      
      // Validate API key (accepts hardcoded key, master key, or valid user keys)
      const valid = await isValidSigylApiKey(apiKey);
      console.log("[WRAPPER-HARDCODE] isValidSigylApiKey result:", valid);
      
      if (!valid) {
        console.warn('[WRAPPER-HARDCODE] 401 Unauthorized: Invalid or missing API key');
        return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
      }

      // Use hardcoded package name and fetch secrets using hardcoded API key
      console.log("[WRAPPER-HARDCODE] Package name (hardcoded):", HARDCODED_PACKAGE_NAME);
      
      let config = await fetchSecretsFromDatabase();
      if (!config) {
        console.log("[WRAPPER-HARDCODE] ⚠️ No secrets found, using default config");
        config = {
          apiKey: "PLACEHOLDER_WILL_BE_INJECTED_BY_WRAPPER",
          debug: false
        };
      } else {
        console.log("[WRAPPER-HARDCODE] ✅ Using real secrets from database");
      }

      // Create the MCP server instance with real config
      console.log("[WRAPPER-HARDCODE] Creating MCP server with config:", Object.keys(config));
      const server = createStatelessServer({ config });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      // Cleanup on response close
      res.on('close', () => {
        transport.close();
        server.close();
      });

      // Connect server to transport and handle request
      console.log("[WRAPPER-HARDCODE] Connecting server to transport...");
      await server.connect(transport);
      console.log("[WRAPPER-HARDCODE] Handling request through MCP server...");
      await transport.handleRequest(req, res, req.body);
      console.log("[WRAPPER-HARDCODE] Request handled successfully");
      
    } catch (error) {
      console.error("[WRAPPER-HARDCODE] Error in /mcp endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check endpoint
  app.get("/mcp", (req, res) => {
    res.json({
      status: "healthy",
      stage: "3",
      version: "23.0.0 (HARDCODED)",
      packageName: HARDCODED_PACKAGE_NAME,
      timestamp: new Date().toISOString(),
      environment: {
        sigylMasterKeyPresent: !!process.env.SIGYL_MASTER_KEY,
        hardcodedApiKeyPresent: !!HARDCODED_API_KEY,
        hardcodedPackageName: HARDCODED_PACKAGE_NAME,
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('SIGYL'))
      }
    });
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      stage: "3",
      version: "23.0.0 (HARDCODED)",
      packageName: HARDCODED_PACKAGE_NAME,
      timestamp: new Date().toISOString()
    });
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log("[WRAPPER-HARDCODE] 🚀 Hardcoded wrapper listening on port", port);
    console.log("[WRAPPER-HARDCODE] Features:");
    console.log("[WRAPPER-HARDCODE] ✅ Hardcoded API key:", HARDCODED_API_KEY.substring(0, 10) + "...");
    console.log("[WRAPPER-HARDCODE] ✅ Hardcoded package name:", HARDCODED_PACKAGE_NAME);
    console.log("[WRAPPER-HARDCODE] ✅ Secrets injection (using hardcoded key)");
    console.log("[WRAPPER-HARDCODE] ✅ Pass-through to MCP server");
    console.log("[WRAPPER-HARDCODE] ✅ Query parameter support");
    console.log("[WRAPPER-HARDCODE] ✅ No package name extraction needed");
    console.log("[WRAPPER-HARDCODE] ✅ For testing purposes only");
  });
})(); 