const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

console.log("[WRAPPER-STAGE3] Starting MCP Wrapper v23.0.0");
console.log("[WRAPPER-STAGE3] Stage 3: Fixed package name extraction");
console.log("[WRAPPER-STAGE3] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("[WRAPPER-STAGE3] Express app initialized");

  // API key validation function (same as working-wrapper.js)
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

  // Fetch secrets from database using the user's validated API key
  async function fetchSecretsFromDatabase(packageName, userApiKey) {
    console.log("[WRAPPER-STAGE3] Fetching secrets for package:", packageName);
    console.log("[WRAPPER-STAGE3] Using user's API key for authentication");
    
    try {
      const response = await fetch(`https://api.sigyl.dev/api/mcp-secrets/${encodeURIComponent(packageName)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
          "Content-Type": "application/json"
        }
      });

      console.log("[WRAPPER-STAGE3] API response status:", response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log("[WRAPPER-STAGE3] ⚠️ No secrets found for package:", packageName);
          return null;
        }
        const errorText = await response.text();
        console.log("[WRAPPER-STAGE3] ❌ Failed to fetch secrets:", response.status, errorText);
        return null;
      }

      const secrets = await response.json();
      console.log("[WRAPPER-STAGE3] ✅ Secrets fetched successfully");
      console.log("[WRAPPER-STAGE3] Secret keys found:", Object.keys(secrets));
      
      // IMPROVED: Preserve all secret names, don't overwrite
      const config = { ...secrets };
      
      // Only set apiKey if it doesn't already exist and we have a primary key
      if (!config.apiKey) {
        // Look for common primary key names
        const primaryKey = secrets.apiKey || secrets.token || secrets.key || secrets.accessToken;
        if (primaryKey) {
          config.apiKey = primaryKey;
          console.log("[WRAPPER-STAGE3] Set primary apiKey from:", Object.keys(secrets).find(k => secrets[k] === primaryKey));
        }
      }
      
      console.log("[WRAPPER-STAGE3] Final config keys:", Object.keys(config));
      return config;
      
    } catch (error) {
      console.log("[WRAPPER-STAGE3] ❌ Error fetching secrets:", error.message);
      console.log("[WRAPPER-STAGE3] Error stack:", error.stack);
      return null;
    }
  }

  // Extract package name from request - FIXED VERSION
  function extractPackageName(req) {
    // Try hostname first (Cloud Run pattern)
    const hostname = req.get("host") || req.hostname;
    console.log("[WRAPPER-STAGE3] Hostname:", hostname);
    
    if (hostname.includes("sigyl-mcp-")) {
      // Extract everything between sigyl-mcp- and the Cloud Run domain
      const match = hostname.match(/sigyl-mcp-(.+?)(?:-lrzo3avokq-uc\.a\.run\.app|\.a\.run\.app)/);
      if (match) {
        const packagePath = match[1];
        console.log("[WRAPPER-STAGE3] Extracted package path:", packagePath);
        return packagePath;
      }
    }
    
    // Fallback to environment variable
    const fallback = process.env.SIGYL_PACKAGE_NAME || "sigyl/dev";
    console.log("[WRAPPER-STAGE3] Using fallback package name:", fallback);
    return fallback;
  }

  // /mcp endpoint with API key validation and MCP logic (following working-wrapper.js pattern)
  app.post('/mcp', async (req, res) => {
    console.log("[WRAPPER-STAGE3] Received /mcp POST request");
    
    try {
      // Extract API key from headers or query params (same as working-wrapper.js)
      const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
      console.log("[WRAPPER-STAGE3] x-sigyl-api-key header:", req.headers['x-sigyl-api-key']);
      console.log("[WRAPPER-STAGE3] apiKey from query:", req.query.apiKey);
      console.log("[WRAPPER-STAGE3] Using apiKey:", apiKey);
      
      // Validate API key (same as working-wrapper.js)
      const valid = await isValidSigylApiKey(apiKey);
      console.log("[WRAPPER-STAGE3] isValidSigylApiKey result:", valid);
      
      if (!valid) {
        console.warn('[WRAPPER-STAGE3] 401 Unauthorized: Invalid or missing API key');
        return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
      }

      // Extract package name and fetch secrets using the validated user API key
      const packageName = extractPackageName(req);
      console.log("[WRAPPER-STAGE3] Package name:", packageName);
      
      let config = await fetchSecretsFromDatabase(packageName, apiKey);
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
      version: "23.0.0",
      packageName,
      timestamp: new Date().toISOString(),
      environment: {
        sigylMasterKeyPresent: !!process.env.SIGYL_MASTER_KEY,
        // Note: SIGYL_API_KEY is no longer needed as environment variable
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('SIGYL'))
      }
    });
  });

  app.get("/health", (req, res) => {
    const packageName = extractPackageName(req);
    res.json({
      status: "healthy",
      stage: "3",
      version: "23.0.0",
      packageName,
      timestamp: new Date().toISOString()
    });
  });

  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log("[WRAPPER-STAGE3] 🚀 Fixed wrapper listening on port", port);
    console.log("[WRAPPER-STAGE3] Features:");
    console.log("[WRAPPER-STAGE3] ✅ API key validation (user's key)");
    console.log("[WRAPPER-STAGE3] ✅ Secrets injection (using user's key)");
    console.log("[WRAPPER-STAGE3] ✅ Pass-through to MCP server");
    console.log("[WRAPPER-STAGE3] ✅ Query parameter support");
    console.log("[WRAPPER-STAGE3] ✅ No SIGYL_API_KEY env var needed");
    console.log("[WRAPPER-STAGE3] ✅ Follows working-wrapper.js pattern");
    console.log("[WRAPPER-STAGE3] ✅ Fixed package name extraction");
  });
})(); 