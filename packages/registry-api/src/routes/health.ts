import express from 'express';
import { supabase } from '../config/database';
import { Request, Response } from 'express';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Basic application health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Debug auth endpoint - shows what token is being sent
 */
router.get('/debug-auth', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  res.json({
    success: true,
    data: {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null,
      tokenLength: token?.length || 0,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      tokenType: token ? (
        token.startsWith('gho_') || token.startsWith('ghp_') || token.startsWith('github_pat_') ? 'github' :
        token.split('.').length === 3 ? 'jwt' :
        token.startsWith('sk_') ? 'api_key' :
        'unknown'
      ) : null
    }
  });
});

// Detailed health check for monitoring
router.get('/detailed', async (_req, res) => {
  try {
    const detailed = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasGoogleCloud: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasSupabase: !!process.env.SUPABASE_URL,
        hasGitHubApp: !!process.env.GITHUB_APP_ID
      },
      services: {
        database: { status: 'checking', latency: 0 },
        googleCloud: { status: 'checking' },
        github: { status: 'checking' }
      }
    };

    // Test database with timing
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      detailed.services.database = {
        status: error ? 'error' : 'ok',
        latency: Date.now() - dbStart
      } as any;
    } catch (error) {
      detailed.services.database = {
        status: 'error',
        latency: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as any;
    }

    // Test Google Cloud config
    detailed.services.googleCloud = {
      status: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'missing',
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'not set',
      region: process.env.GOOGLE_CLOUD_REGION || 'not set'
    } as any;

    // Test GitHub config
    detailed.services.github = {
      status: process.env.GITHUB_APP_ID ? 'configured' : 'missing',
      appId: process.env.GITHUB_APP_ID ? 'set' : 'not set'
    } as any;

    res.json(detailed);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 