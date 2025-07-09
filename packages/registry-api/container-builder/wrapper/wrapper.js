const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  // API key validation function
  async function isValidSigylApiKey(key) {
    if (!key) return false;
    try {
      const resp = await fetch('https://api.sigyl.dev/api/v1/apikeys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      return data && data.valid === true;
    } catch (err) {
      console.error('API key validation error:', err);
      return false;
    }
  }

  // /mcp endpoint with API key validation and MCP logic
  app.post('/mcp', async (req, res) => {
    const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
    console.log('[MCP] Received /mcp POST');
    console.log('[MCP] x-sigyl-api-key header:', req.headers['x-sigyl-api-key']);
    console.log('[MCP] apiKey from query:', req.query.apiKey);
    console.log('[MCP] Using apiKey:', apiKey);
    // === RESTORE: Use actual API key validation ===
    const valid = await isValidSigylApiKey(apiKey);
    console.log('[MCP] isValidSigylApiKey result:', valid);
    if (!valid) {
      console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
      return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
    }

    // Create the MCP server instance
    const server = createStatelessServer({ config: {} });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(8080, () => {
    console.log("Wrapper listening on port 8080");
  });
})(); 