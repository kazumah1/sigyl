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
      const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
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

  // Fetch user secrets from Sigyl API
  async function fetchUserSecrets(apiKey, packageName) {
    try {
      const resp = await fetch(`https://api.sigyl.dev/api/v1/secrets/package/${packageName}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json' 
        }
      });
      
      if (!resp.ok) {
        console.log(`[SECRETS] Failed to fetch secrets for ${packageName}: ${resp.status}`);
        return {};
      }
      
      const data = await resp.json();
      if (data.success && data.data) {
        const secrets = {};
        data.data.forEach(secret => {
          secrets[secret.key] = secret.value;
        });
        console.log(`[SECRETS] Loaded ${Object.keys(secrets).length} secrets for ${packageName}`);
        return secrets;
      }
      
      return {};
    } catch (err) {
      console.error('[SECRETS] Error fetching user secrets:', err);
      return {};
    }
  }

  // Function to send metrics to Sigyl API
  async function sendMetrics(apiKey, metricsData) {
    try {
      // Don't send metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[METRICS] Development mode - skipping metrics:', metricsData);
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
      const patterns = [
        // OpenAI API response format
        /usage.*?"prompt_tokens":\s*(\d+).*?"completion_tokens":\s*(\d+)/i,
        // Anthropic API response format  
        /input_tokens.*?(\d+).*?output_tokens.*?(\d+)/i,
        // Generic token usage patterns
        /tokens_used.*?(\d+)/i,
        /token_count.*?(\d+)/i
      ];

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
          // GPT-4 pricing (approximate)
          cost_usd = (tokens_in * 0.00003) + (tokens_out * 0.00006);
        } else if (model && model.includes('gpt-3.5')) {
          // GPT-3.5 pricing (approximate)
          cost_usd = (tokens_in * 0.0000015) + (tokens_out * 0.000002);
        } else if (model && model.includes('claude')) {
          // Claude pricing (approximate)
          cost_usd = (tokens_in * 0.000008) + (tokens_out * 0.000024);
        } else {
          // Generic estimate
          cost_usd = (tokens_in * 0.00001) + (tokens_out * 0.00002);
        }
      }

      if (tokens_in > 0 || tokens_out > 0) {
        return {
          model: model || 'unknown',
          tokens_in,
          tokens_out,
          cost_usd: Math.round(cost_usd * 100000) / 100000 // Round to 5 decimal places
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
    // Try to get from environment variable set during deployment
    if (process.env.SIGYL_PACKAGE_NAME) {
      return process.env.SIGYL_PACKAGE_NAME;
    }
    
    // Fallback: extract from Cloud Run service name or use default
    const serviceName = process.env.K_SERVICE || 'unknown-package';
    return serviceName.replace(/^sigyl-/, '').replace(/-[a-f0-9]{8}$/, '');
  }

  // Custom transport that injects secrets as headers for each request
  class SecretInjectingTransport extends StreamableHTTPServerTransport {
    constructor(userSecrets, options) {
      super(options);
      this.userSecrets = userSecrets;
    }

    async handleRequest(req, res, requestBody) {
      // Create a modified request object with injected secret headers
      const modifiedReq = {
        ...req,
        headers: {
          ...req.headers,
          // Inject user secrets as headers that the MCP server can read
          ...Object.fromEntries(
            Object.entries(this.userSecrets).map(([key, value]) => [
              key.toLowerCase(), // Express normalizes header names to lowercase
              value
            ])
          ),
          // Also inject as X-Env- prefixed headers for compatibility
          ...Object.fromEntries(
            Object.entries(this.userSecrets).map(([key, value]) => [
              `x-env-${key.toLowerCase()}`,
              value
            ])
          )
        }
      };

      console.log(`[SECRETS] Injected ${Object.keys(this.userSecrets).length} secrets as headers`);
      
      // Call the parent handleRequest with the modified request
      return super.handleRequest(modifiedReq, res, requestBody);
    }
  }

  // /mcp endpoint with API key validation, secret injection, and metrics collection
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
      
      // Send failure metrics
      await sendMetrics(apiKey || 'anonymous', {
        event_type: 'mcp_request',
        package_name: packageName,
        success: false,
        error_type: 'auth_failure',
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        client_ip: clientIP,
        user_agent: userAgent
      });
      
      return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
    }

    // Fetch user secrets for this specific user
    const userSecrets = await fetchUserSecrets(apiKey, packageName);

    let mcpRequestType = 'unknown';
    let toolName = null;
    let success = true;
    let errorType = null;
    let responseBody = null;

    try {
      // Analyze the MCP request to extract metrics
      if (req.body && req.body.method) {
        mcpRequestType = req.body.method;
        
        if (req.body.method === 'tools/call' && req.body.params && req.body.params.name) {
          toolName = req.body.params.name;
        }
      }

      // Create the MCP server instance (no secrets passed here - they'll be in headers)
      const server = createStatelessServer({ 
        config: {}
      });
      
      // Use our custom transport that injects secrets as headers per request
      const transport = new SecretInjectingTransport(userSecrets, { 
        sessionIdGenerator: undefined 
      });

      res.on('close', () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      
      // Capture response to analyze for LLM usage
      const originalSend = res.send;
      res.send = function(data) {
        responseBody = data;
        return originalSend.call(this, data);
      };
      
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      success = false;
      errorType = error.name || 'unknown_error';
      console.error('[MCP] Request failed:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal MCP server error' });
      }
    }

    const responseTime = Date.now() - startTime;

    // Extract LLM usage data from response if available
    let llmUsage = null;
    if (responseBody && success) {
      llmUsage = extractLLMUsage(responseBody);
      if (llmUsage) {
        console.log('[LLM] Detected LLM usage:', llmUsage);
      }
    }

    // Collect comprehensive metrics for algorithm
    const metrics = {
      // Basic request info
      event_type: 'mcp_request',
      package_name: packageName,
      mcp_method: mcpRequestType,
      tool_name: toolName,
      success: success,
      error_type: errorType,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
      
      // User context
      client_ip: clientIP,
      user_agent: userAgent,
      has_secrets: Object.keys(userSecrets).length > 0,
      secret_count: Object.keys(userSecrets).length,
      
      // Performance metrics for algorithm
      performance_tier: responseTime < 100 ? 'fast' : responseTime < 500 ? 'medium' : 'slow',
      
      // Request pattern analysis
      hour_of_day: new Date().getUTCHours(),
      day_of_week: new Date().getUTCDay(),
      
      // Technical context
      request_size_bytes: JSON.stringify(req.body).length,
      
      // Future algorithm signals
      user_satisfaction_signal: success ? 'positive' : 'negative', // Simple for now
      complexity_score: toolName ? 'tool_usage' : 'basic_request', // Can be enhanced
      
      // A/B testing context (for future use)
      experiment_variant: process.env.SIGYL_EXPERIMENT_VARIANT || 'default',
      
      // Resource usage (for cost optimization)
      memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
      cpu_time_ms: process.cpuUsage().user / 1000, // Convert microseconds to ms
      
      // LLM usage data (if detected)
      ...(llmUsage && { llm_usage: llmUsage })
    };

    // Send metrics asynchronously (don't block response)
    setImmediate(() => {
      sendMetrics(apiKey, metrics);
    });

    console.log(`[MCP] Request completed in ${responseTime}ms - ${success ? 'SUCCESS' : 'FAILED'}${llmUsage ? ' (LLM usage detected)' : ''}`);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      package: getPackageName(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Info endpoint for debugging
  app.get('/info', (req, res) => {
    const packageName = getPackageName();
    res.json({
      package_name: packageName,
      environment: process.env.NODE_ENV || 'production',
      service_name: process.env.K_SERVICE,
      revision: process.env.K_REVISION,
      secrets_injection: 'per-request-headers',
      timestamp: new Date().toISOString()
    });
  });

  app.listen(8080, () => {
    console.log("Wrapper listening on port 8080");
    console.log(`Package: ${getPackageName()}`);
    console.log("Features: Per-request secret injection, Metrics collection, API validation");
    console.log("Secret method: HTTP headers (not environment variables)");
  });
})();