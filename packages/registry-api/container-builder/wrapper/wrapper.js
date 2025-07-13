const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");
const crypto = require("crypto");
const { z } = require("zod");

console.log("🚀 [WRAPPER-SESSION] Starting Session-Aware MCP Wrapper v2.0.0");
console.log("🚀 [WRAPPER-SESSION] This is the NEW session-based wrapper with database persistence");
console.log("🚀 [WRAPPER-SESSION] Timestamp:", new Date().toISOString());

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  console.log("✅ [WRAPPER-SESSION] Express app initialized");

  // Cache for API validation and secrets to reduce API calls
  const validationCache = new Map();
  const secretsCache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Database-backed session storage for resumability
  const REGISTRY_URL = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
  
  console.log("🔗 [WRAPPER-SESSION] Registry URL:", REGISTRY_URL);

  // Generate session ID using crypto for better uniqueness
  function generateSessionId() {
    return `mcp_${crypto.randomUUID()}_${Date.now()}`;
  }

  // API key validation function (from working-wrapper.js)
  async function isValidSigylApiKey(key) {
    if (!key) return false;
    try {
      const resp = await fetch(`${REGISTRY_URL}/api/v1/keys/validate`, {
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

  // Get config from package (from wrapper.js)
  async function getConfig(packageName) {
    let slug = packageName;

    const url = `${REGISTRY_URL}/api/v1/packages/${encodeURIComponent(slug)}`;
    console.log('[CONFIG] Fetching package config from:', url);

    try {
        const resp = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) {
            console.error('[CONFIG] Failed to fetch config:', resp.status, resp.statusText);
            return {};
        }
        const data = await resp.json();
        if (data.success && data.data) {
            return {
                required_secrets: data.data.required_secrets || [],
                optional_secrets: data.data.optional_secrets || []
            };
        }
        return {};
    } catch (err) {
        console.error('[CONFIG] Error fetching config:', err);
        return {};
    }
  }

  // Get user secrets (from wrapper.js)
  async function getUserSecrets(packageName, apiKey) {
    if (!apiKey) {
        console.warn('[SECRETS] No API key provided to getUserSecrets');
        return {};
    }
    if (!packageName) {
        console.warn('[SECRETS] No packageName provided to getUserSecrets');
        return {};
    }

    // Only use the slug part for the endpoint
    let slug = packageName;

    const url = `${REGISTRY_URL}/api/v1/secrets/package/${encodeURIComponent(slug)}`;
    console.log('[SECRETS] Fetching user secrets from:', url);

    try {
        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        if (!resp.ok) {
            console.error('[SECRETS] Failed to fetch user secrets:', resp.status, resp.statusText);
            return {};
        }
        const data = await resp.json();
        if (data.success && Array.isArray(data.data)) {
            // Convert array to key-value object
            const secrets = {};
            data.data.forEach(secret => {
                if (secret.key && secret.value) {
                    secrets[secret.key] = secret.value;
                }
            });
            return secrets;
        }
        return {};
    } catch (err) {
        console.error('[SECRETS] Error fetching user secrets:', err);
        return {};
    }
  }

  // Create config with zod validation (from wrapper.js)
  async function createConfig(configJSON, userSecrets) {
    console.log('[WRAPPER] createConfig called with:', {
      configJSON: Array.isArray(configJSON) ? configJSON.length + ' items' : configJSON,
      userSecrets: Object.keys(userSecrets || {}).length + ' secrets'
    });
    
    if (!Array.isArray(configJSON)) {
        console.error('[WRAPPER] createConfig error: configJSON must be an array, got:', typeof configJSON);
        throw new Error("configJSON must be an array");
    }

    const zodShape = {};
    const configValues = {};

    for (const field of configJSON) {
        let zodType;
        // 1. Type
        switch (field.type) {
            case "string":
                if (field.enum) {
                    zodType = z.enum(field.enum);
                } else {
                    zodType = z.string();
                }
                break;
            case "boolean":
                zodType = z.boolean();
                break;
            case "number":
                zodType = z.number();
                break;
            default:
                zodType = z.any();
        }

        // 2. Description
        if (field.description) {
            zodType = zodType.describe(field.description);
        }

        // 3. Default
        if (field.default !== undefined) {
            zodType = zodType.default(field.default);
        }

        // 4. Required/Optional
        if (field.required === false) {
            zodType = zodType.optional();
        }

        zodShape[field.name] = zodType;

        // 5. Fill config value
        if (userSecrets && userSecrets[field.name] !== undefined) {
            configValues[field.name] = userSecrets[field.name];
        } else if (field.default !== undefined) {
            configValues[field.name] = field.default;
        }
    }

    const configSchema = z.object(zodShape);

    // Check for missing required secrets before validation
    const missingSecrets = [];
    for (const field of configJSON) {
        if (field.required !== false && !configValues.hasOwnProperty(field.name)) {
            missingSecrets.push(field.name);
        }
    }

    if (missingSecrets.length > 0) {
        console.error('[WRAPPER] createConfig error: Missing required secrets:', missingSecrets);
        throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}. Please configure these secrets in your Sigyl dashboard.`);
    }

    // Validate and fill with defaults
    console.log('[WRAPPER] createConfig: Parsing config with zod...');
    const filledConfig = configSchema.parse(configValues);
    console.log('[WRAPPER] createConfig: Config parsed successfully');

    return { configSchema, filledConfig };
  }

  // Database-backed session management
  async function createSession(sessionId, userId, packageName, clientInfo) {
    try {
      const response = await fetch(`${REGISTRY_URL}/api/v1/session-analytics/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIGYL_API_KEY}`
        },
        body: JSON.stringify({
          sessionId,
          userId,
          packageName,
          clientInfo,
          metadata: {
            wrapper_version: '2.0.0-session',
            container_id: process.env.HOSTNAME || 'unknown',
            environment: process.env.NODE_ENV || 'production'
          }
        })
      });
      
      if (!response.ok) {
        console.error('Failed to create session:', await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  }

  async function getSessionState(sessionId) {
    try {
      const response = await fetch(`${REGISTRY_URL}/api/v1/session-analytics/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SIGYL_API_KEY}`
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting session state:', error);
      return null;
    }
  }

  async function updateSessionActivity(sessionId, eventSequence) {
    try {
      await fetch(`${REGISTRY_URL}/api/v1/session-analytics/sessions/${sessionId}/activity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIGYL_API_KEY}`
        },
        body: JSON.stringify({
          lastEventSequence: eventSequence,
          lastActivity: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  async function endSession(sessionId) {
    try {
      await fetch(`${REGISTRY_URL}/api/v1/session-analytics/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SIGYL_API_KEY}`
        }
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Send raw session event to registry
  async function sendRawSessionEvent(eventData) {
    try {
      const response = await fetch(`${REGISTRY_URL}/api/v1/session-analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIGYL_API_KEY}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        console.error('Failed to send session event:', await response.text());
      }
    } catch (error) {
      console.error('Error sending session event:', error);
    }
  }

  // Validate API key and get user info
  async function validateApiKey(apiKey) {
    const cacheKey = `validation_${apiKey}`;
    const cached = validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`${REGISTRY_URL}/api/v1/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      validationCache.set(cacheKey, {
        data: userData,
        timestamp: Date.now()
      });

      return userData;
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  // Get secrets for user and specific package
  async function getSecrets(userId, apiKey, packageName) {
    const cacheKey = `secrets_${userId}_${packageName}`;
    const cached = secretsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Use the wrapper endpoint that returns decrypted secrets filtered by mcp_server_id
      const response = await fetch(`${REGISTRY_URL}/api/v1/secrets/wrapper/${encodeURIComponent(packageName)}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        console.warn(`No secrets found for package ${packageName} (mcp_server_id)`);
        return {};
      }

      const secretsResponse = await response.json();
      
      // Handle the API response format: { success: true, data: [...] }
      if (!secretsResponse.success || !secretsResponse.data) {
        console.warn(`Invalid secrets response for package ${packageName}`);
        return {};
      }
      
      // Convert array of {key, value} to environment variable format
      const secrets = {};
      secretsResponse.data.forEach(secret => {
        if (secret.key && secret.value) {
          secrets[secret.key] = secret.value;
        }
      });
      
      console.log(`[SECRETS] Loaded ${Object.keys(secrets).length} secrets for package ${packageName}: [${Object.keys(secrets).join(', ')}]`);
      
      secretsCache.set(cacheKey, {
        data: secrets,
        timestamp: Date.now()
      });

      return secrets;
    } catch (error) {
      console.error(`Error fetching secrets for package ${packageName}:`, error);
      return {};
    }
  }

  // Get package name from Cloud Run URL or fallback methods
  function getPackageName(req) {
    // Priority order:
    // 1. Extract from Cloud Run URL (most reliable)
    // 2. Environment variable (set during deployment)
    // 3. Request header (if client specifies)
    // 4. URL path parameter
    // 5. Default fallback
    
    // First, try to extract from Cloud Run URL
    // Format: https://sigyl-mcp-{owner}-{repo-name}-{hash}.{region}.run.app
    // Example: https://sigyl-mcp-sigyl-dev-brave-search-946398050699.us-central1.run.app
    // Should extract: sigyl-dev/Brave-Search
    
    const host = req.headers.host || req.headers['x-forwarded-host'] || process.env.HOST;
    console.log(`[PACKAGENAME] Host header: ${host}`);
    if (host) {
      // Updated regex to handle the actual Cloud Run URL format
      // Format: sigyl-mcp-{owner}-{repo-name}-{hash}-{region}.a.run.app
      // Example: sigyl-mcp-sigyl-dev-brave-search-lrzo3avokq-uc.a.run.app
      const match = host.match(/^sigyl-mcp-(.+)-([a-z0-9]+)-([a-z0-9]+)\.a\.run\.app$/);
      if (match) {
        const urlPart = match[1]; // e.g., "sigyl-dev-brave-search"
        console.log(`[PACKAGENAME] Extracted URL part: ${urlPart}`);
        
        // Split by hyphens and reconstruct owner/repo format
        const parts = urlPart.split('-');
        if (parts.length >= 3) {
          // Find the split point - typically after the first two parts for owner
          // e.g., "sigyl-dev-brave-search" -> ["sigyl", "dev", "brave", "search"]
          // Should become: "sigyl-dev/Brave-Search"
          
          // For now, assume first two parts are owner, rest is repo
          const owner = parts.slice(0, 2).join('-'); // "sigyl-dev"
          const repo = parts.slice(2).map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join('-'); // "Brave-Search"
          
          const packageName = `${owner}/${repo}`;
          console.log(`[PACKAGENAME] Successfully extracted package name from Cloud Run URL: ${host} -> ${packageName}`);
          return packageName;
        } else {
          console.log(`[PACKAGENAME] Cloud Run URL regex did not match: ${host}`);
        }
      } else {
        console.log(`[PACKAGENAME] No host header found`);
      }
    }
    
    // Fallback to other methods
    const fallbackName = process.env.PACKAGE_NAME || 
                        req.headers['x-package-name'] || 
                        req.params.packageName || 
                        'unknown-package';
    
    console.log(`[PACKAGE] Using fallback package name: ${fallbackName}`);
    return fallbackName;
  }

  // Custom session ID generator for MCP transport
  function createSessionIdGenerator() {
    return (req) => {
      // Check if session ID is provided in header (for resumability)
      const existingSessionId = req.headers['mcp-session-id'];
      if (existingSessionId) {
        return existingSessionId;
      }
      
      // Generate new session ID
      return generateSessionId();
    };
  }

  // Session tracking middleware
  app.use(async (req, res, next) => {
    const startTime = Date.now();
    const sessionId = req.headers['mcp-session-id'] || generateSessionId();
    
    // Set session ID in response header
    res.setHeader('Mcp-Session-Id', sessionId);
    
    // Store session context
    req.sessionContext = {
      sessionId,
      startTime,
      eventSequence: 0,
      conversationTurn: 0
    };

    // Capture request details
    const requestData = {
      method: req.method,
      url: req.url,
      headers: { ...req.headers },
      body: req.body,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
      clientIp: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Store original res.json to capture response
    const originalJson = res.json;
    res.json = function(data) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Capture complete response details
      const responseData = {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: data,
        timestamp: new Date().toISOString(),
        responseTime
      };

      // Create comprehensive raw session event
      const rawEvent = {
        sessionId,
        eventSequence: req.sessionContext.eventSequence++,
        conversationTurn: req.sessionContext.conversationTurn++,
        eventType: 'mcp_interaction',
        timestamp: new Date().toISOString(),
        
        // Complete request/response pair
        request: requestData,
        response: responseData,
        
        // System metrics
        systemMetrics: {
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          timestamp: new Date().toISOString()
        },
        
        // Session context
        sessionContext: {
          sessionId,
          eventSequence: req.sessionContext.eventSequence,
          conversationTurn: req.sessionContext.conversationTurn,
          sessionStartTime: req.sessionContext.startTime
        },
        
        // Error context (if any)
        errorContext: res.statusCode >= 400 ? {
          statusCode: res.statusCode,
          errorMessage: data?.error || 'Unknown error',
          stackTrace: data?.stack || null
        } : null,
        
        // Metadata
        metadata: {
          wrapperVersion: '2.0.0-session',
          containerId: process.env.HOSTNAME || 'unknown',
          environment: process.env.NODE_ENV || 'production',
          packageName: getPackageName(req)
        }
      };

      // Send raw event to registry (async, don't block response)
      setImmediate(() => {
        sendRawSessionEvent(rawEvent);
        updateSessionActivity(sessionId, req.sessionContext.eventSequence);
      });

      return originalJson.call(this, data);
    };

    next();
  });

  // Handle GET requests for health checks (from wrapper.js)
  app.get('/mcp', async (req, res) => {
    try {
      res.json({
        status: 'ready',
        transport: 'http',
        endpoint: '/mcp',
        package: getPackageName(req),
        timestamp: new Date().toISOString(),
        version: '2.0.0-session'
      });
    } catch (error) {
      console.error('[MCP] GET health check failed:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Main MCP POST endpoint (from wrapper.js + working-wrapper.js pattern)
  app.post('/mcp', async (req, res) => {
    console.log('[WRAPPER] =================================');
    console.log('[WRAPPER] Received /mcp POST request');
    console.log('[WRAPPER] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[WRAPPER] Request body length:', req.body ? JSON.stringify(req.body).length : 'no body');
    
    // Get API key from header or query (from working-wrapper.js)
    const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
    console.log('[WRAPPER] x-sigyl-api-key header:', req.headers['x-sigyl-api-key']);
    console.log('[WRAPPER] apiKey from query:', req.query.apiKey);
    console.log('[WRAPPER] Using apiKey:', apiKey);

    // Validate API key (from working-wrapper.js)
    console.log('[WRAPPER] Starting API key validation...');
    const valid = await isValidSigylApiKey(apiKey);
    console.log('[WRAPPER] API key validation result:', valid);
    if (!valid) {
      console.warn('[WRAPPER] 401 Unauthorized: Invalid or missing API key');
      return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
    }
    console.log('[WRAPPER] API key validation passed');

    try {
      console.log('[WRAPPER] Starting main processing...');
      
      // Get package name from Cloud Run URL
      console.log('[WRAPPER] Extracting package name from Cloud Run URL...');
      const packageName = getPackageName(req);
      console.log('[WRAPPER] Package name extracted:', packageName);

      // Get package config (from wrapper.js)
      console.log('[WRAPPER] Fetching package config from registry...');
      const configJSON = await getConfig(packageName);
      console.log('[WRAPPER] Package config received:', JSON.stringify(configJSON, null, 2));

      // Get user secrets (from wrapper.js)
      console.log('[WRAPPER] Fetching user secrets...');
      const userSecrets = await getUserSecrets(packageName, apiKey);
      console.log('[WRAPPER] User secrets received:', JSON.stringify(userSecrets, null, 2));

      // Create config with zod validation (from wrapper.js)
      console.log('[WRAPPER] Creating config with zod validation...');
      const { filledConfig } = await createConfig(configJSON.required_secrets || [], userSecrets);
      console.log('[WRAPPER] Config created successfully:', JSON.stringify(filledConfig, null, 2));

      // Create MCP server with config (from wrapper.js)
      console.log('[WRAPPER] Creating MCP server with config...');
      const server = createStatelessServer({ config: filledConfig });
      console.log('[WRAPPER] MCP server created successfully');
      
      // Create transport with session support
      console.log('[WRAPPER] Creating HTTP transport...');
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: createSessionIdGenerator()
      });
      console.log('[WRAPPER] Transport created successfully');

      // Handle cleanup (from working-wrapper.js)
      res.on('close', () => {
        console.log('[WRAPPER] Response closed, cleaning up...');
        transport.close();
        server.close();
      });

      // Connect and handle request (from working-wrapper.js)
      console.log('[WRAPPER] Connecting server to transport...');
      await server.connect(transport);
      console.log('[WRAPPER] Server connected, handling request...');
      await transport.handleRequest(req, res, req.body);
      console.log('[WRAPPER] Request handled successfully');

    } catch (error) {
      console.error('[WRAPPER] ❌ ERROR CAUGHT IN MCP ENDPOINT:');
      console.error('[WRAPPER] Error message:', error.message);
      console.error('[WRAPPER] Error type:', error.constructor.name);
      console.error('[WRAPPER] Error stack:', error.stack);
      
      // Send error event
      const errorEvent = {
        sessionId: req.sessionContext.sessionId,
        eventSequence: req.sessionContext.eventSequence++,
        conversationTurn: req.sessionContext.conversationTurn,
        eventType: 'mcp_error',
        timestamp: new Date().toISOString(),
        errorContext: {
          error: error.message,
          stack: error.stack,
          type: error.constructor.name
        },
        metadata: {
          wrapperVersion: '2.0.0-session',
          containerId: process.env.HOSTNAME || 'unknown',
          environment: process.env.NODE_ENV || 'production',
          packageName: getPackageName(req)
        }
      };
      
      setImmediate(() => sendRawSessionEvent(errorEvent));
      
      // Check if it's a missing secrets error and provide helpful response
      if (error.message.includes('Missing required secrets')) {
        console.log('[WRAPPER] Returning 400 for missing secrets');
        return res.status(400).json({ 
          error: 'Configuration Error',
          message: error.message,
          type: 'missing_secrets'
        });
      }
      
      console.log('[WRAPPER] Returning 500 for internal server error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-session'
    });
  });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log('[WRAPPER] 🚀 MCP server with session support running on port', PORT);
    console.log('[WRAPPER] Environment:', process.env.NODE_ENV || 'production');
    console.log('[WRAPPER] Container ID:', process.env.HOSTNAME || 'unknown');
    console.log('[WRAPPER] Registry URL:', REGISTRY_URL);
  });
})(); 
