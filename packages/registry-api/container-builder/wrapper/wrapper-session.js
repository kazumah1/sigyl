const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");
const crypto = require("crypto");

(async () => {
  const createStatelessServer = (await import("./server.js")).default;

  const app = express();
  app.use(express.json());

  // Cache for API validation and secrets to reduce API calls
  const validationCache = new Map();
  const secretsCache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Database-backed session storage for resumability
  const REGISTRY_URL = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
  
  // Generate session ID using crypto for better uniqueness
  function generateSessionId() {
    return `mcp_${crypto.randomUUID()}_${Date.now()}`;
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

  // Get secrets for user
  async function getSecrets(userId, apiKey) {
    const cacheKey = `secrets_${userId}`;
    const cached = secretsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`${REGISTRY_URL}/api/v1/secrets`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        return {};
      }

      const secrets = await response.json();
      secretsCache.set(cacheKey, {
        data: secrets,
        timestamp: Date.now()
      });

      return secrets;
    } catch (error) {
      console.error('Error fetching secrets:', error);
      return {};
    }
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

  // Create MCP transport with session support
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: createSessionIdGenerator()
  });

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
          packageName: process.env.PACKAGE_NAME || 'unknown'
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

  // Authentication middleware
  app.use(async (req, res, next) => {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const userData = await validateApiKey(apiKey);
    if (!userData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = userData;
    req.apiKey = apiKey;
    
    // Create session if it doesn't exist
    const sessionState = await getSessionState(req.sessionContext.sessionId);
    if (!sessionState) {
      await createSession(
        req.sessionContext.sessionId,
        userData.id,
        process.env.PACKAGE_NAME || 'unknown',
        {
          clientIp: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      );
    }

    next();
  });

  // Session management endpoints
  app.delete('/session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    await endSession(sessionId);
    res.json({ message: 'Session ended' });
  });

  app.get('/session/:sessionId/status', async (req, res) => {
    const { sessionId } = req.params;
    const sessionState = await getSessionState(sessionId);
    res.json(sessionState || { error: 'Session not found' });
  });

  // MCP server integration
  app.use('/mcp', async (req, res, next) => {
    try {
      // Get secrets for the user
      const secrets = await getSecrets(req.user.id, req.apiKey);
      
      // Create MCP server with user's secrets
      const server = createStatelessServer(secrets);
      
      // Handle MCP transport
      await transport.handleRequest(req, res, server);
    } catch (error) {
      console.error('MCP server error:', error);
      
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
          packageName: process.env.PACKAGE_NAME || 'unknown'
        }
      };
      
      setImmediate(() => sendRawSessionEvent(errorEvent));
      
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
    console.log(`MCP server with session support running on port ${PORT}`);
  });
})(); 
