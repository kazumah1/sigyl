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
    const path = req.params[0] || ''; // The rest of the path

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

    // Prepare headers for the proxy request
    const headers: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Accept': req.headers['accept'] || 'application/json',
      'User-Agent': req.headers['user-agent'] || 'Sigyl-Gateway/1.0'
    };

    // Inject user secrets as environment variables or headers
    // This depends on how the MCP server expects to receive secrets
    Object.entries(session.userSecrets).forEach(([key, value]) => {
      // Option 1: Inject as headers (if MCP server supports it)
      headers[`X-Secret-${key}`] = value;
      
      // Option 2: Inject as query parameters (for GET requests)
      if (req.method === 'GET') {
        const url = new URL(targetUrl);
        url.searchParams.set(key, value);
        targetUrl = url.toString();
      }
    });

    // Add any additional configuration
    if (session.additionalConfig) {
      Object.entries(session.additionalConfig).forEach(([key, value]) => {
        headers[`X-Config-${key}`] = JSON.stringify(value);
      });
    }

    // Make the proxy request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    // Forward the response
    const responseData = await response.text();
    
    // Set response headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send the response
    res.send(responseData);

  } catch (error) {
    console.error('Gateway proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Gateway Error',
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