const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fetch = require('node-fetch');
const app = express();

// Real API key validation
async function isValidSigylApiKey(key) {
  if (!key) return false;
  try {
    // Use the correct registry-api validation endpoint
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
    return false; // Fail closed
  }
}

// /mcp endpoint with API key validation
app.use('/mcp', express.json(), async (req, res, next) => {
  const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
  if (!await isValidSigylApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
  }
  // Proxy to MCP server's /mcp endpoint
  createProxyMiddleware({
    target: 'http://localhost:8081',
    changeOrigin: true,
    pathRewrite: { '^/mcp': '/mcp' },
  })(req, res, next);
});

// Proxy all other requests to the MCP server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8081',
  changeOrigin: true,
}));

app.listen(8080, () => {
  console.log('Sigyl wrapper listening on port 8080');
}); 