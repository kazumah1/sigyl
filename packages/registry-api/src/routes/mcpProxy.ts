import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { supabase } from '../config/database';
import { APIResponse } from '../types';

const router = express.Router();

// Cache for package info with 5-minute TTL
const urlCache = new Map<string, string>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the deployment URL for a package
 */
async function getPackageDeploymentUrl(packageName: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = urlCache.get(packageName);
    if (cached) {
      return cached;
    }

    // Query database for package deployment URL
    const { data: packages, error } = await supabase
      .from('mcp_packages')
      .select(`
        id,
        name,
        deployments:mcp_deployments!inner(deployment_url, status)
      `)
      .eq('name', packageName)
      .eq('deployments.status', 'active')
      .limit(1);

    if (error) {
      console.error('Database error fetching package:', error);
      return null;
    }

    if (!packages || packages.length === 0) {
      console.warn(`Package not found: ${packageName}`);
      return null;
    }

    const deploymentUrl = packages[0].deployments[0]?.deployment_url;
    if (!deploymentUrl) {
      console.warn(`No active deployment found for package: ${packageName}`);
      return null;
    }

    // Cache the URL
    urlCache.set(packageName, deploymentUrl);
    setTimeout(() => urlCache.delete(packageName), CACHE_TTL);

    return deploymentUrl;
  } catch (error) {
    console.error('Error fetching package deployment URL:', error);
    return null;
  }
}

/**
 * Dynamic proxy middleware that resolves target URL based on package name
 */
const createDynamicProxy = () => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const packageName = req.params.packageName;
    
    if (!packageName) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package name required',
        message: 'Please specify a package name in the URL path'
      };
      return res.status(400).json(response);
    }

    // Get deployment URL for this package
    const deploymentUrl = await getPackageDeploymentUrl(packageName);
    
    if (!deploymentUrl) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Package not found',
        message: `MCP package '${packageName}' not found or not deployed`
      };
      return res.status(404).json(response);
    }

    // Create proxy middleware for this specific target
    const proxyMiddleware = createProxyMiddleware({
      target: deploymentUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/api/v1/mcp/${packageName}`]: '', // Remove the prefix
      },
      on: {
        proxyReq: (proxyReq, req) => {
          // Add headers to identify the proxy
          proxyReq.setHeader('X-Forwarded-By', 'sigyl-mcp-proxy');
          proxyReq.setHeader('X-Package-Name', packageName);
          
          // Forward the user's API key to the wrapper for secret fetching
          const authHeader = (req as any).headers.authorization;
          if (authHeader) {
            const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
            proxyReq.setHeader('X-Sigyl-Api-Key', apiKey);
          }
          
          console.log(`Proxying ${(req as any).method} ${(req as any).url} -> ${deploymentUrl}${proxyReq.path}`);
        },
        proxyRes: (proxyRes) => {
          // Add CORS headers
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        },
        error: (err) => {
          console.error(`Proxy error for ${packageName}:`, err.message);
          // Error will be handled by Express error middleware
        }
      }
    });

    // Execute the proxy
    proxyMiddleware(req, res, next);
  };
};

/**
 * List available MCP packages for discovery
 */
router.get('/', async (_req, res) => {
  try {
    const { data: packages, error } = await supabase
      .from('mcp_packages')
      .select(`
        id,
        name,
        description,
        deployments:mcp_deployments!inner(status)
      `)
      .eq('deployments.status', 'active');

    if (error) {
      throw error;
    }

    const response: APIResponse<{ packages: string[] }> = {
      success: true,
      data: {
        packages: packages.map(pkg => pkg.name)
      },
      message: `Found ${packages.length} active MCP packages`
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing MCP packages:', error);
    const response: APIResponse<null> = {
      success: false,
      error: 'Database error',
      message: 'Failed to list MCP packages'
    };
    res.status(500).json(response);
  }
});

/**
 * Proxy all requests to MCP packages
 * Route: /api/v1/mcp/:packageName/*
 * Now simplified to just proxy with API key forwarding - secrets handled by wrapper
 */
router.use('/:packageName/*', createDynamicProxy());
router.use('/:packageName', createDynamicProxy());

export default router; 