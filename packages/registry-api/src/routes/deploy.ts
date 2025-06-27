import express, { Request, Response } from 'express';
import { fetchMCPYaml } from '../services/yaml';
import { deployRepo, DeploymentRequest } from '../services/deployer';
import { PackageService } from '../services/packageService';

const router = express.Router();
const packageService = new PackageService();

router.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { repoUrl, githubToken, branch = 'main' } = req.body;
    
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: repoUrl'
      });
    }

    // Extract repo name from URL
    const repoName = repoUrl.replace('https://github.com/', '');
    const [owner, repo] = repoName.split('/');
    
    console.log(`🚀 Starting deployment for ${repoName}...`);

    // Fetch MCP metadata
    let metadata;
    try {
      metadata = await fetchMCPYaml(owner, repo, branch, githubToken);
    } catch (error) {
      console.warn('⚠️ Could not fetch MCP metadata, using defaults');
      metadata = { 
        name: repo,
        description: `MCP Server for ${repo}`,
        port: 3000 
      };
    }

    // Prepare deployment request
    const deploymentRequest: DeploymentRequest = {
      repoUrl,
      repoName,
      branch,
      env: { 
        PORT: metadata.port?.toString() || '3000'
      }
    };

    // Deploy to Railway with security validation
    const deploymentResult = await deployRepo(deploymentRequest);

    if (!deploymentResult.success) {
      console.error('❌ Deployment failed:', deploymentResult.error);
      
      // Handle security validation failures
      if (deploymentResult.securityReport) {
        return res.status(400).json({
          success: false,
          error: 'Deployment blocked due to security issues',
          securityReport: deploymentResult.securityReport
        });
      }
      
      return res.status(500).json({
        success: false,
        error: deploymentResult.error || 'Deployment failed'
      });
    }

    const deploymentUrl = deploymentResult.deploymentUrl!;
    console.log('✅ Deployment successful:', deploymentUrl);

    // MCP-specific health check
    try {
      console.log('🔍 Performing MCP health check...');
      const healthRes = await fetch(`${deploymentUrl}/mcp`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!healthRes.ok) {
        console.warn(`⚠️ MCP endpoint health check failed with status ${healthRes.status}`);
        // Don't fail deployment, just warn
      } else {
        console.log('✅ MCP endpoint is healthy');
      }
    } catch (err) {
      console.warn('⚠️ MCP health check failed:', err instanceof Error ? err.message : String(err));
      // Don't fail deployment, just warn
    }

    // Register the package in the registry
    console.log('📝 Registering package in registry...');
    const registered = await packageService.createPackage({
      name: metadata.name,
      ...(metadata.version && { version: metadata.version }),
      description: metadata.description,
      source_api_url: repoUrl,
      tags: ['github', 'deployed', 'railway'],
      required_secrets: metadata.secrets || [],
      tools: metadata.tools?.map(tool => ({
        tool_name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
        ...(tool.outputSchema && { output_schema: tool.outputSchema })
      })) || []
    });

    // Create deployment record
    if (registered.id) {
      await packageService.createDeployment(
        registered.id, 
        deploymentUrl, 
        `${deploymentUrl}/mcp`
      );
    }

    console.log('🎉 Deployment and registration complete!');

    res.json({ 
      success: true,
      packageId: registered.id, 
      deploymentUrl,
      mcpEndpoint: `${deploymentUrl}/mcp`,
      serviceId: deploymentResult.serviceId,
      securityReport: deploymentResult.securityReport
    });

  } catch (error: any) {
    console.error('❌ Deploy error:', error);
    
    // Handle specific error types
    if (error.message && error.message.toLowerCase().includes('not accessible')) {
      return res.status(400).json({
        success: false,
        error: 'Repository is private or inaccessible. Please ensure the GitHub App has access to this repository.'
      });
    } else if (error.message && error.message.toLowerCase().includes('railway api token')) {
      return res.status(500).json({
        success: false,
        error: 'Railway deployment service is not configured. Please contact support.'
      });
    } else {
      return res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }
});

export default router;
  