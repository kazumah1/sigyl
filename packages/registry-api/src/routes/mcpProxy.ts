import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { supabase } from '../config/database';
import { APIResponse } from '../types';
import { requireHybridAuth } from '../middleware/auth';
import { decrypt } from '../utils/encryption';

const router = express.Router();

// Cache for package info with 5-minute TTL
const urlCache = new Map<string, string>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user secrets for a package
 */
async function getUserSecretsForPackage(userId: string, packageName: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('key, value, description')
      .eq('user_id', userId)
      .or(`mcp_server_id.eq.${packageName},key.ilike.%${packageName.toUpperCase()}%,description.ilike.%${packageName}%`);

    if (error) {
      console.error('Error fetching user secrets:', error);
      return {};
    }

    // Decrypt values and return them as key-value pairs for header injection
    const secrets: Record<string, string> = {};
    (data || []).forEach(secret => {
      try {
        const decryptedValue = decrypt(secret.value);
        secrets[secret.key] = decryptedValue;
      } catch (error) {
        console.error(`Error decrypting secret ${secret.key}:`, error);
      }
    });

    return secrets;
  } catch (error) {
    console.error('Error getting user secrets for package:', error);
    return {};
  }
}

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

    // Get user secrets if authenticated
    let userSecrets: Record<string, string> = {};
    if (req.user?.user_id) {
      userSecrets = await getUserSecretsForPackage(req.user.user_id, packageName);
      console.log(`🔑 Injecting ${Object.keys(userSecrets).length} secrets for user ${req.user.user_id} and package ${packageName}`);
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
          
          // Inject user secrets as headers
          Object.entries(userSecrets).forEach(([key, value]) => {
            // Use environment variable format for headers
            proxyReq.setHeader(`X-Env-${key}`, value);
            // Also set as regular environment variable names that MCP servers expect
            proxyReq.setHeader(key, value);
          });
          
          // Log the proxy request (without exposing secrets)
          const headerCount = Object.keys(userSecrets).length;
          if (headerCount > 0) {
            console.log(`Proxying ${(req as any).method} ${(req as any).url} -> ${deploymentUrl}${proxyReq.path} (with ${headerCount} secret headers)`);
          } else {
            console.log(`Proxying ${(req as any).method} ${(req as any).url} -> ${deploymentUrl}${proxyReq.path}`);
          }
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
 * Requires authentication to inject user secrets
 */
router.use('/:packageName/*', requireHybridAuth, createDynamicProxy());
router.use('/:packageName', requireHybridAuth, createDynamicProxy());

export default router; 