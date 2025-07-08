import express from 'express';
import { GatewayService } from '../services/gatewayService';
import { APIResponse } from '../types';

const router = express.Router();

/**
 * Create a gateway connection to an MCP server
 * POST /api/v1/gateway/connect
 */
router.post('/connect', async (req, res) => {
  try {
    const { mcpServerUrl, userApiKey, additionalConfig } = req.body;

    if (!mcpServerUrl || !userApiKey) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: 'mcpServerUrl and userApiKey are required'
      };
      return res.status(400).json(response);
    }

    const result = await GatewayService.createGatewayConnection({
      mcpServerUrl,
      userApiKey,
      additionalConfig
    });

    if (!result.success) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Gateway Error',
        message: result.error || 'Failed to create gateway connection'
      };
      return res.status(400).json(response);
    }

    const response: APIResponse<{ gatewayUrl: string }> = {
      success: true,
      data: {
        gatewayUrl: result.gatewayUrl!
      },
      message: 'Gateway connection created successfully'
    };

    res.json(response);

  } catch (error) {
    console.error('Gateway connection error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create gateway connection'
    };
    res.status(500).json(response);
  }
});

/**
 * Proxy MCP requests through the gateway
 * This route handles all MCP protocol requests and injects secrets
 */
router.all('/:sessionId/*', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const path = (req.params as any)[0] || ''; // The rest of the path

    // Get gateway session
    const session = await GatewayService.getGatewaySession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'Gateway session has expired or does not exist'
      });
    }

    // Construct the target URL
    let targetUrl = `${session.mcpServerUrl}/${path}`;

    // Prepare headers with injected environment variables
    const headers: Record<string, string> = {
      ...req.headers as Record<string, string>,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Inject environment variables as headers (for servers that read headers)
    Object.entries(session.userSecrets).forEach(([key, value]) => {
      headers[`X-Secret-${key}`] = value;
      headers[`X-Env-${key}`] = value;
    });

    // For MCP protocol requests, also inject environment variables into the request body
    let requestBody = req.body;
    if (req.method === 'POST' && path.includes('mcp')) {
      // Clone the request body
      requestBody = { ...req.body };
      
      // Add environment variables to the request context
      if (!requestBody.context) {
        requestBody.context = {};
      }
      
      // Add environment variables to context for MCP servers to access
      requestBody.context.environment = session.userSecrets;
      requestBody.context.gatewaySession = {
        sessionId,
        injectedAt: new Date().toISOString()
      };
    }

    // Make the proxied request
    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    // Forward the response
    const responseData = await proxyResponse.text();
    
    res.status(proxyResponse.status);
    
    // Forward response headers
    proxyResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-length') { // Skip content-length to avoid conflicts
        res.setHeader(key, value);
      }
    });
    
    res.send(responseData);

  } catch (error) {
    console.error('Gateway proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Gateway proxy failed',
      message: 'Failed to proxy request to MCP server'
    });
  }
});

/**
 * Clean up expired sessions (admin endpoint)
 * POST /api/v1/gateway/cleanup
 */
router.post('/cleanup', async (_req, res) => {
  try {
    await GatewayService.cleanupExpiredSessions();
    
    const response: APIResponse<null> = {
      success: true,
      message: 'Expired sessions cleaned up successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Cleanup error:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Cleanup Error',
      message: 'Failed to cleanup expired sessions'
    };
    res.status(500).json(response);
  }
});

export default router; 