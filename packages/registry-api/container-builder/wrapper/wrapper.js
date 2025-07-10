const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  // Cache for API validation and secrets to reduce API calls
  const validationCache = new Map();
  const secretsCache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cached API key validation function
  async function isValidSigylApiKey(key) {
    if (!key) return false;
    
    // Check cache first
    const cacheKey = `valid_${key}`;
    const cached = validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.valid;
    }
    
    try {
      const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      
      if (!resp.ok) {
        validationCache.set(cacheKey, { valid: false, timestamp: Date.now() });
        return false;
      }
      
      const data = await resp.json();
      const isValid = data && data.valid === true;
      
      // Cache the result
      validationCache.set(cacheKey, { valid: isValid, timestamp: Date.now() });
      
      return isValid;
    } catch (err) {
      console.error('API key validation error:', err);
      validationCache.set(cacheKey, { valid: false, timestamp: Date.now() });
      return false;
    }
  }

  // Cached function to fetch user secrets
  async function fetchUserSecrets(apiKey, packageName) {
    const cacheKey = `${apiKey}_${packageName}`;
    const cached = secretsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`[SECRETS] Using cached secrets for package: ${packageName}`);
      return cached.data;
    }

    console.log(`[SECRETS] Fetching secrets for package: "${packageName}"`);
    console.log(`[SECRETS] API Key prefix: ${apiKey ? apiKey.substring(0, 10) + '...' : 'none'}`);
    console.log(`[SECRETS] Request URL: https://api.sigyl.dev/api/v1/secrets/package/${packageName}`);

    try {
      const resp = await fetch(`https://api.sigyl.dev/api/v1/secrets/package/${packageName}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        }
      });
      
      console.log(`[SECRETS] Response status: ${resp.status} ${resp.statusText}`);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.log(`[SECRETS] Error response body: ${errorText}`);
        console.log(`[SECRETS] Failed to fetch secrets for ${packageName}: ${resp.status}`);
        const emptySecrets = {};
        secretsCache.set(cacheKey, { data: emptySecrets, timestamp: Date.now() });
        return emptySecrets;
      }
      
      const data = await resp.json();
      console.log(`[SECRETS] Response data structure:`, JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        const secrets = {};
        console.log(`[SECRETS] Raw secrets from API: ${data.data.length} items`);
        data.data.forEach((secret, index) => {
          console.log(`[SECRETS] Secret ${index + 1}: key="${secret.key}", value="${secret.value ? secret.value.substring(0, 5) + '...' : '(empty)'}", description="${secret.description || 'none'}"`);
          secrets[secret.key] = secret.value;
        });
        console.log(`[SECRETS] Processed secrets keys: [${Object.keys(secrets).join(', ')}]`);
        
        // Cache the secrets
        secretsCache.set(cacheKey, { data: secrets, timestamp: Date.now() });
        
        return secrets;
      }
      
      console.log(`[SECRETS] No valid secrets data in response for ${packageName}`);
      const emptySecrets = {};
      secretsCache.set(cacheKey, { data: emptySecrets, timestamp: Date.now() });
      return emptySecrets;
    } catch (err) {
      console.error('[SECRETS] Error fetching user secrets:', err.message);
      console.error('[SECRETS] Full error:', err);
      const emptySecrets = {};
      secretsCache.set(cacheKey, { data: emptySecrets, timestamp: Date.now() });
      return emptySecrets;
    }
  }

  // Function to send metrics to Sigyl API (non-blocking)
  async function sendMetrics(apiKey, metricsData) {
    try {
      // Don't send metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[METRICS] Development mode - skipping metrics');
        return;
      }

      const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
      const response = await fetch(`${registryUrl}/api/v1/analytics/mcp-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Sigyl-MCP-Wrapper/1.0'
        },
        body: JSON.stringify(metricsData)
      });

      if (!response.ok) {
        console.warn('[METRICS] Failed to send metrics:', response.status, response.statusText);
      } else {
        console.log('[METRICS] Metrics sent successfully');
      }
    } catch (error) {
      console.warn('[METRICS] Error sending metrics:', error.message);
    }
  }

  // Function to extract LLM usage data from MCP response
  function extractLLMUsage(responseBody) {
    try {
      // Look for common patterns that indicate LLM usage
      let tokens_in = 0;
      let tokens_out = 0;
      let model = null;
      let cost_usd = 0;

      const responseStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);

      // Try to extract model information
      const modelMatch = responseStr.match(/"model":\s*"([^"]+)"/i);
      if (modelMatch) {
        model = modelMatch[1];
      }

      // Try to extract token usage using different patterns
      const openaiMatch = responseStr.match(/usage.*?"prompt_tokens":\s*(\d+).*?"completion_tokens":\s*(\d+)/i);
      if (openaiMatch) {
        tokens_in = parseInt(openaiMatch[1]);
        tokens_out = parseInt(openaiMatch[2]);
      } else {
        const anthropicMatch = responseStr.match(/input_tokens.*?(\d+).*?output_tokens.*?(\d+)/i);
        if (anthropicMatch) {
          tokens_in = parseInt(anthropicMatch[1]);
          tokens_out = parseInt(anthropicMatch[2]);
        }
      }

      // Estimate cost based on model and tokens (rough estimates)
      if (tokens_in > 0 || tokens_out > 0) {
        if (model && model.includes('gpt-4')) {
          cost_usd = (tokens_in * 0.00003) + (tokens_out * 0.00006);
        } else if (model && model.includes('gpt-3.5')) {
          cost_usd = (tokens_in * 0.0000015) + (tokens_out * 0.000002);
        } else if (model && model.includes('claude')) {
          cost_usd = (tokens_in * 0.000008) + (tokens_out * 0.000024);
        } else {
          cost_usd = (tokens_in * 0.00001) + (tokens_out * 0.00002);
        }
      }

      if (tokens_in > 0 || tokens_out > 0) {
        return {
          model: model || 'unknown',
          tokens_in,
          tokens_out,
          cost_usd: Math.round(cost_usd * 100000) / 100000
        };
      }

      return null;
    } catch (error) {
      console.warn('[LLM] Error extracting LLM usage:', error.message);
      return null;
    }
  }

  // Extract package name from environment or URL
  function getPackageName() {
    console.log('[PACKAGE] Determining package name...');
    console.log('[PACKAGE] SIGYL_PACKAGE_NAME env var:', process.env.SIGYL_PACKAGE_NAME);
    console.log('[PACKAGE] K_SERVICE env var:', process.env.K_SERVICE);
    
    // Try to get from environment variable set during deployment
    if (process.env.SIGYL_PACKAGE_NAME) {
      console.log(`[PACKAGE] Using SIGYL_PACKAGE_NAME: "${process.env.SIGYL_PACKAGE_NAME}"`);
      return process.env.SIGYL_PACKAGE_NAME;
    }
    
    // Fallback: extract from Cloud Run service name or use default
    const serviceName = process.env.K_SERVICE || 'unknown-package';
    const extractedName = serviceName.replace(/^sigyl-/, '').replace(/-[a-f0-9]{8}$/, '');
    console.log(`[PACKAGE] Extracted from service name "${serviceName}": "${extractedName}"`);
    
    // Additional debugging: show all environment variables that might be relevant
    const relevantEnvVars = Object.keys(process.env).filter(key => 
      key.includes('PACKAGE') || key.includes('SERVICE') || key.includes('SIGYL') || key.includes('BRAVE')
    );
    console.log('[PACKAGE] Relevant env vars:', relevantEnvVars.map(key => `${key}=${process.env[key]}`).join(', '));
    
    return extractedName;
  }

  // Handle GET requests for health checks (Claude Desktop sends these)
  app.get('/mcp', async (req, res) => {
    try {
      res.json({
        status: 'ready',
        transport: 'http',
        endpoint: '/mcp',
        package: getPackageName(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[MCP] GET health check failed:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // /mcp endpoint with API key validation, secret injection, and metrics collection
  // RESTORED: Using the original working StreamableHTTPServerTransport approach
  app.post('/mcp', async (req, res) => {
    const startTime = Date.now();
    const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
    const packageName = getPackageName();
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    console.log('[MCP] Received /mcp POST');
    console.log(`[MCP] Package: ${packageName}`);
    console.log(`[MCP] API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'none'}`);
    
    // Validate API key
    const valid = await isValidSigylApiKey(apiKey);
    console.log('[MCP] API key validation result:', valid);
    
    if (!valid) {
      console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
      
      // Send failure metrics (non-blocking)
      setImmediate(() => {
        sendMetrics(apiKey || 'anonymous', {
          event_type: 'mcp_request',
          package_name: packageName,
          success: false,
          error_type: 'auth_failure',
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          client_ip: clientIP,
          user_agent: userAgent
        });
      });
      
      return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
    }

    // Fetch user secrets for this specific user (with caching)
    const userSecrets = await fetchUserSecrets(apiKey, packageName);

    let mcpRequestType = 'unknown';
    let toolName = null;
    let success = true;
    let errorType = null;

    try {
      // Analyze the MCP request to extract metrics
      if (req.body && req.body.method) {
        mcpRequestType = req.body.method;
        
        if (req.body.method === 'tools/call' && req.body.params && req.body.params.name) {
          toolName = req.body.params.name;
        }
      }

      // Inject secrets as environment variables for this request
      const originalEnv = { ...process.env };
      Object.entries(userSecrets).forEach(([key, value]) => {
        console.log(`[SECRETS] Injecting: ${key} = ${value ? value.substring(0, 10) + '...' : '(empty)'}`);
        process.env[key] = value;
      });

      console.log(`[SECRETS] Injected ${Object.keys(userSecrets).length} secrets as environment variables`);
      console.log(`[ENV] BRAVE_API_KEY exists: ${!!process.env.BRAVE_API_KEY}`);
      console.log(`[ENV] BRAVEAPIKEY exists: ${!!process.env.BRAVEAPIKEY}`);
      console.log(`[ENV] All env keys containing 'BRAVE': ${Object.keys(process.env).filter(k => k.includes('BRAVE')).join(', ')}`);
      
      // RESTORED: Use the original working StreamableHTTPServerTransport approach
      // Create the MCP server instance
      const server = createStatelessServer({ config: {} });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      // Set up cleanup handlers
      res.on('close', () => {
        transport.close();
        server.close();
        
        // Restore original environment on connection close
        Object.keys(process.env).forEach(key => {
          if (!(key in originalEnv)) {
            delete process.env[key];
          }
        });
        Object.entries(originalEnv).forEach(([key, value]) => {
          process.env[key] = value;
        });
      });

      // Connect server to transport
      await server.connect(transport);
      
      // Handle the request using the original working method
      await transport.handleRequest(req, res, req.body);
      
      // Restore original environment after request
      Object.keys(process.env).forEach(key => {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      });
      Object.entries(originalEnv).forEach(([key, value]) => {
        process.env[key] = value;
      });

    } catch (error) {
      success = false;
      errorType = error.name || 'unknown_error';
      console.error('[MCP] Request failed:', error);
      
      // Restore original environment on error
      const originalEnv = { ...process.env };
      Object.keys(process.env).forEach(key => {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      });
      Object.entries(originalEnv).forEach(([key, value]) => {
        process.env[key] = value;
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error' });
      }
    }

    const responseTime = Date.now() - startTime;

    // Send metrics (non-blocking)
    setImmediate(() => {
      const metricsData = {
        event_type: 'mcp_request',
        package_name: packageName,
        mcp_method: mcpRequestType,
        tool_name: toolName,
        success: success,
        error_type: errorType,
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        client_ip: clientIP,
        user_agent: userAgent,
        has_secrets: Object.keys(userSecrets).length > 0,
        secret_count: Object.keys(userSecrets).length,
        
        // Performance metrics for algorithm improvement
        performance_tier: responseTime < 1000 ? 'fast' : responseTime < 5000 ? 'medium' : 'slow',
        hour_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        request_size_bytes: JSON.stringify(req.body).length,
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        
        // Additional metadata
        wrapper_version: '2.0.0'
      };

      sendMetrics(apiKey, metricsData);
    });
  });

  app.listen(8080, () => {
    console.log("✅ Sigyl MCP Wrapper listening on port 8080");
    console.log("📦 Package:", getPackageName());
    console.log("🔒 Secret injection: enabled");
    console.log("📊 Metrics collection: enabled");
    console.log("⚡ API caching: enabled (5min TTL)");
  });
})();