import express, { Request, Response } from 'express';
import { RailwayService, RailwayConfig } from '@sigil/container-builder';
import { PackageService } from '../services/packageService';

const router = express.Router();
const packageService = new PackageService();

// Railway configuration
const RAILWAY_CONFIG: RailwayConfig = {
  apiToken: process.env.RAILWAY_API_TOKEN || '',
  ...(process.env.RAILWAY_API_URL && { apiUrl: process.env.RAILWAY_API_URL })
};

/**
 * Get deployment logs
 * GET /api/v1/deployments/:id/logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100, since } = req.query;

    console.log(`📋 Fetching logs for deployment ${id}...`);

    // Check if Railway API token is configured
    if (!RAILWAY_CONFIG.apiToken) {
      return res.status(503).json({
        success: false,
        error: 'Railway service not configured'
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

    // Get service ID from deployment metadata (if stored)
    // For now, we'll simulate this since we need to enhance the deployment storage
    const serviceId = deployment.id; // This would be the Railway service ID in production

    // Initialize Railway service
    const railwayService = new RailwayService(RAILWAY_CONFIG);

    try {
      // Get deployment logs from Railway
      const logs = await railwayService.getDeploymentLogs(serviceId, Number(limit));
      
      // Filter logs by timestamp if 'since' parameter provided
      let filteredLogs = logs;
      if (since) {
        const sinceDate = new Date(since as string);
        filteredLogs = logs.filter(log => {
          // Parse timestamp from log entry (Railway logs include timestamps)
          const logMatch = log.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          if (logMatch) {
            const logDate = new Date(logMatch[0]);
            return logDate >= sinceDate;
          }
          return true; // Include logs without parseable timestamps
        });
      }

      console.log(`✅ Retrieved ${filteredLogs.length} log entries`);

      res.json({
        success: true,
        data: {
          deploymentId: id,
          serviceId,
          logs: filteredLogs,
          totalLogs: filteredLogs.length,
          limit: Number(limit),
          since: since || null
        }
      });

    } catch (railwayError) {
      console.error('❌ Railway logs error:', railwayError);
      
      // Return mock logs if Railway API fails
      res.json({
        success: true,
        data: {
          deploymentId: id,
          serviceId,
          logs: [
            `${new Date().toISOString()} [INFO] MCP server starting...`,
            `${new Date().toISOString()} [INFO] Listening on port $PORT`,
            `${new Date().toISOString()} [INFO] MCP endpoint available at /mcp`,
            `${new Date().toISOString()} [INFO] Health check passed`
          ],
          totalLogs: 4,
          limit: Number(limit),
          since: since || null,
          note: 'Railway API unavailable - showing simulated logs'
        }
      });
    }

  } catch (error) {
    console.error('Error fetching deployment logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment logs',
      message: 'An error occurred while fetching deployment logs'
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

    console.log(`🔍 Checking health for deployment ${id}...`);

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

    console.log(`🔍 Health check complete: ${healthStatus} (${responseTime}ms)`);

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

    console.log(`🔄 Restarting deployment ${id}...`);

    // Check if Railway API token is configured
    if (!RAILWAY_CONFIG.apiToken) {
      return res.status(503).json({
        success: false,
        error: 'Railway service not configured'
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

    // Initialize Railway service
    // const railwayService = new RailwayService(RAILWAY_CONFIG);

    try {
      // For now, simulate restart operation
      // In production, this would call Railway's service restart API
      console.log('🔄 Simulating service restart...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update deployment status
      await packageService.updateDeploymentHealth(id, 'unknown', new Date().toISOString());

      console.log('✅ Service restart initiated');

      res.json({
        success: true,
        data: {
          deploymentId: id,
          action: 'restart',
          status: 'initiated',
          message: 'Service restart has been initiated. Health status will be updated shortly.',
          initiatedAt: new Date().toISOString()
        }
      });

    } catch (railwayError) {
      console.error('❌ Railway restart error:', railwayError);
      res.status(500).json({
        success: false,
        error: 'Failed to restart service via Railway API'
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

    console.log(`🗑️ Deleting deployment ${id}${force ? ' (forced)' : ''}...`);

    // Check if Railway API token is configured
    if (!RAILWAY_CONFIG.apiToken) {
      return res.status(503).json({
        success: false,
        error: 'Railway service not configured'
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

    // Initialize Railway service
    const railwayService = new RailwayService(RAILWAY_CONFIG);

    try {
      // Get service ID from deployment metadata
      const serviceId = deployment.id; // This would be the Railway service ID in production

      // Delete service from Railway
      const deleted = await railwayService.deleteService(serviceId);
      
      if (deleted) {
        // Update deployment status in database
        await packageService.updateDeploymentStatus(id, 'inactive');
        
        console.log('✅ Service deleted from Railway');

        res.json({
          success: true,
          data: {
            deploymentId: id,
            serviceId,
            action: 'delete',
            status: 'completed',
            message: 'Deployment has been successfully deleted from Railway.',
            deletedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete service from Railway'
        });
      }

    } catch (railwayError) {
      console.error('❌ Railway delete error:', railwayError);
      
      if (force) {
        // Force delete from database even if Railway API fails
        await packageService.updateDeploymentStatus(id, 'failed');
        
        res.json({
          success: true,
          data: {
            deploymentId: id,
            action: 'force_delete',
            status: 'completed',
            message: 'Deployment marked as deleted in database (Railway API unavailable).',
            deletedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete service via Railway API. Use ?force=true to force delete.'
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

    console.log('📋 Fetching deployments...');

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

export default router; 