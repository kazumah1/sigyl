import express, { Request, Response } from 'express';
import { CloudRunService, CloudRunConfig } from '@sigil/container-builder';
import { PackageService } from '../services/packageService';

const router = express.Router();
const packageService = new PackageService();

// Google Cloud Run configuration
const CLOUD_RUN_CONFIG: CloudRunConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || '',
  keyFilePath: process.env.GOOGLE_CLOUD_KEY_FILE_PATH || ''
};

/**
 * Get deployment logs
 * GET /api/v1/deployments/:id/logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100, since } = req.query;

    // console.log(`📋 Fetching logs for deployment ${id}...`);

    // Check if Google Cloud credentials are configured
    if (!CLOUD_RUN_CONFIG.projectId) {
      return res.status(503).json({
        success: false,
        error: 'Google Cloud Run service not configured'
      });
    }

    // Get deployment info from database
    const deployment = await packageService.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Get service name from deployment metadata
    const serviceName = deployment.id; // This would be the Cloud Run service name in production

    // Initialize Cloud Run service
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    try {
      // Get deployment logs from Cloud Logging
      const logs = await cloudRunService.getDeploymentLogs(serviceName, Number(limit));
      
      // Filter logs by timestamp if 'since' parameter provided
      let filteredLogs = logs;
      if (since) {
        const sinceDate = new Date(since as string);
        filteredLogs = logs.filter(log => {
          // Parse timestamp from log entry (Cloud Logging includes timestamps)
          const logMatch = log.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          if (logMatch) {
            const logDate = new Date(logMatch[0]);
            return logDate >= sinceDate;
          }
          return true; // Include logs without parseable timestamps
        });
      }

      // console.log(`✅ Retrieved ${filteredLogs.length} log entries`);

      res.json({
        success: true,
        data: {
          deploymentId: id,
          serviceName,
          logs: filteredLogs,
          totalLogs: filteredLogs.length,
          limit: Number(limit),
          since: since || null
        }
      });

    } catch (cloudRunError) {
      console.error('❌ Google Cloud Run logs error:', cloudRunError);
      
      // Return mock logs if Google Cloud API fails
      res.json({
        success: true,
        data: {
          deploymentId: id,
          serviceName,
          logs: [
            `${new Date().toISOString()} INFO MCP server starting...`,
            `${new Date().toISOString()} INFO Listening on port 8080`,
            `${new Date().toISOString()} INFO MCP endpoint available at /mcp`,
            `${new Date().toISOString()} INFO Health check passed`
          ],
          totalLogs: 4,
          limit: Number(limit),
          since: since || null,
          note: 'Google Cloud Run API unavailable - showing simulated logs'
        }
      });
    }

  } catch (error) {
    console.error('❌ Logs error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deployment logs'
    });
  }
});

/**
 * Get deployment health status
 * GET /api/v1/deployments/:id/health
 */
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // console.log(`🔍 Checking health for deployment ${id}...`);

    // Get deployment info from database
    const deployment = await packageService.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    const deploymentUrl = deployment.deployment_url;
    let healthStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
    let responseTime: number | null = null;
    let statusCode: number | null = null;
    let error: string | null = null;

    // Check MCP endpoint health
    try {
      const startTime = Date.now();
      const response = await fetch(`${deploymentUrl}/mcp`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      responseTime = Date.now() - startTime;
      statusCode = response.status;
      healthStatus = response.ok ? 'healthy' : 'unhealthy';
      
      if (!response.ok) {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }

    } catch (fetchError) {
      healthStatus = 'unhealthy';
      error = fetchError instanceof Error ? fetchError.message : 'Health check failed';
      console.warn(`⚠️ Health check failed for ${deploymentUrl}/mcp:`, error);
    }

    // Update deployment health status in database
    await packageService.updateDeploymentHealth(id, healthStatus, new Date().toISOString());

    // console.log(`🔍 Health check complete: ${healthStatus} (${responseTime}ms)`);

    res.json({
      success: true,
      data: {
        deploymentId: id,
        deploymentUrl,
        mcpEndpoint: `${deploymentUrl}/mcp`,
        healthStatus,
        responseTime,
        statusCode,
        error,
        checkedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching deployment health:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment health',
      message: 'An error occurred while fetching deployment health'
    });
  }
});

/**
 * Restart deployment service
 * POST /api/v1/deployments/:id/restart
 */
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // console.log(`🔄 Restarting deployment ${id}...`);

    // Check if Google Cloud credentials are configured
    if (!CLOUD_RUN_CONFIG.projectId) {
      return res.status(503).json({
        success: false,
        error: 'Google Cloud Run service not configured'
      });
    }

    // Get deployment info from database
    const deployment = await packageService.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Initialize Cloud Run service
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    try {
      // Get service name from deployment
      const serviceName = deployment.id; // This would be the Cloud Run service name in production
      
      // Restart the service
      const restarted = await cloudRunService.restartService(serviceName);
      
      if (restarted) {
        // Update deployment status
        await packageService.updateDeploymentHealth(id, 'unknown', new Date().toISOString());

        // console.log('✅ Service restart initiated');

        res.json({
          success: true,
          data: {
            deploymentId: id,
            serviceName,
            action: 'restart',
            status: 'initiated',
            message: 'Service restart has been initiated. Health status will be updated shortly.',
            initiatedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to restart service via Google Cloud Run API'
        });
      }

    } catch (cloudRunError) {
      console.error('❌ Google Cloud Run restart error:', cloudRunError);
      res.status(500).json({
        success: false,
        error: 'Failed to restart service via Google Cloud Run API'
      });
    }

  } catch (error) {
    console.error('Error restarting deployment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to restart deployment',
      message: 'An error occurred while restarting the deployment'
    });
  }
});

/**
 * Delete deployment service
 * DELETE /api/v1/deployments/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    // console.log(`🗑️ Deleting deployment ${id}${force ? ' (forced)' : ''}...`);

    // Check if Google Cloud credentials are configured
    if (!CLOUD_RUN_CONFIG.projectId) {
      return res.status(503).json({
        success: false,
        error: 'Google Cloud Run service not configured'
      });
    }

    // Get deployment info from database
    const deployment = await packageService.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Initialize Cloud Run service
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    try {
      // Get service name from deployment metadata
      const serviceName = deployment.id; // This would be the Cloud Run service name in production

      // Delete service from Google Cloud Run
      const deleted = await cloudRunService.deleteService(serviceName);
      
      if (deleted) {
        // Update deployment status in database
        await packageService.updateDeploymentStatus(id, 'inactive');
        
        // console.log('✅ Service deleted from Google Cloud Run');

        res.json({
          success: true,
          data: {
            deploymentId: id,
            serviceName,
            action: 'delete',
            status: 'completed',
            message: 'Deployment has been successfully deleted from Google Cloud Run.',
            deletedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete service from Google Cloud Run'
        });
      }

    } catch (cloudRunError) {
      console.error('❌ Google Cloud Run delete error:', cloudRunError);
      
      if (force) {
        // Force delete from database even if Google Cloud API fails
        await packageService.updateDeploymentStatus(id, 'failed');
        
        res.json({
          success: true,
          data: {
            deploymentId: id,
            action: 'force_delete',
            status: 'completed',
            message: 'Deployment marked as deleted in database (Google Cloud Run API unavailable).',
            deletedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete service via Google Cloud Run API. Use ?force=true to force delete.'
        });
      }
    }

  } catch (error) {
    console.error('Error deleting deployment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete deployment',
      message: 'An error occurred while deleting the deployment'
    });
  }
});

/**
 * Get all deployments with health status
 * GET /api/v1/deployments
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    // console.log('📋 Fetching deployments...');

    // Get deployments from database
    const deployments = await packageService.getAllDeployments({
      status: status as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    // Enhance with real-time health status for active deployments
    const enhancedDeployments = await Promise.all(
      deployments.map(async (deployment) => {
        if (deployment.status === 'active' && deployment.deployment_url) {
          try {
            // Quick health check
            const response = await fetch(`${deployment.deployment_url}/mcp`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            return {
              ...deployment,
              realTimeHealth: response.ok ? 'healthy' : 'unhealthy',
              lastChecked: new Date().toISOString()
            };
          } catch {
            return {
              ...deployment,
              realTimeHealth: 'unknown',
              lastChecked: new Date().toISOString()
            };
          }
        }
        
        return {
          ...deployment,
          realTimeHealth: 'unknown',
          lastChecked: deployment.last_health_check
        };
      })
    );

    res.json({
      success: true,
      data: {
        deployments: enhancedDeployments,
        total: enhancedDeployments.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });

  } catch (error) {
    console.error('❌ Get deployments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deployments'
    });
  }
});

/**
 * Redeploy deployment service (rebuild and update existing Cloud Run service)
 * POST /api/v1/deployments/:id/redeploy
 */
router.post('/:id/redeploy', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // console.log(`🔄 Redeploying deployment ${id}...`);

    // Get deployment info from database
    const deployment = await packageService.getDeploymentById(id);
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Call redeployRepo in deployer service
    const result = await require('../services/deployer').redeployRepo({
      repoUrl: deployment.repo_url,
      repoName: deployment.repo_name,
      branch: deployment.branch || 'main',
      env: deployment.env || {},
      serviceName: deployment.id, // Use deployment id as service name
      packageId: deployment.package_id
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Redeploy failed',
        logs: result.logs || []
      });
    }

    res.json({
      success: true,
      message: 'Redeploy succeeded',
      logs: result.logs || [],
      deploymentUrl: result.deploymentUrl
    });
  } catch (error) {
    console.error('Error redeploying deployment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to redeploy deployment',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 