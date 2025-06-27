import express from 'express';
import { supabase } from '../config/database';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        database: 'checking',
        googleCloud: 'checking'
      }
    };

    // Test database connection
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      healthCheck.dependencies.database = error ? 'error' : 'ok';
    } catch (error) {
      healthCheck.dependencies.database = 'error';
    }

    // Test Google Cloud credentials
    healthCheck.dependencies.googleCloud = process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'missing';

    const allHealthy = Object.values(healthCheck.dependencies).every(status => 
      status === 'ok' || status === 'configured'
    );

    res.status(allHealthy ? 200 : 503).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check for monitoring
router.get('/detailed', async (req, res) => {
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
      };
    } catch (error) {
      detailed.services.database = {
        status: 'error',
        latency: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test Google Cloud config
    detailed.services.googleCloud = {
      status: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'missing',
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'not set',
      region: process.env.GOOGLE_CLOUD_REGION || 'not set'
    };

    // Test GitHub config
    detailed.services.github = {
      status: process.env.GITHUB_APP_ID ? 'configured' : 'missing',
      appId: process.env.GITHUB_APP_ID ? 'set' : 'not set'
    };

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