import { CloudRunService, CloudRunConfig, CloudRunDeploymentRequest, SigylConfigUnion } from '@sigil/container-builder';
import { supabase } from '../config/database';
import { decrypt } from '../utils/encryption';
import { fetchSigylYaml, SigylConfig } from './yaml';
import { fetchMCPYaml } from './yaml';
import { PackageService } from '../services/packageService';

// Google Cloud Run configuration
const CLOUD_RUN_CONFIG: CloudRunConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  // Remove credential fields - let GoogleAuth use GOOGLE_APPLICATION_CREDENTIALS automatically
  serviceAccountKey: '',
  keyFilePath: ''
};

export interface DeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch?: string;
  env: Record<string, string>;
  userId?: string;
  username?: string;
  selectedSecrets?: string[];
  githubToken?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  serviceName?: string;
  packageId?: string;
  error?: string;
  securityReport?: any;
  proxyUrl?: string;
}

/**
 * Fetch user secrets for deployment
 */
async function fetchUserSecrets(userId: string, selectedSecrets?: string[]): Promise<Record<string, string>> {
  try {
    let query = supabase
      .from('mcp_secrets')
      .select('name, encrypted_value')
      .eq('user_id', userId);

    // Filter by selected secrets if provided
    if (selectedSecrets && selectedSecrets.length > 0) {
      query = query.in('name', selectedSecrets);
    }

    const { data: secrets, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch user secrets:', error);
      return {};
    }

    if (!secrets || secrets.length === 0) {
      console.log('ℹ️ No secrets found for user');
      return {};
    }

    // Decrypt secrets
    const decryptedSecrets: Record<string, string> = {};
    for (const secret of secrets) {
      try {
        decryptedSecrets[secret.name] = decrypt(secret.encrypted_value);
      } catch (decryptError) {
        console.error(`❌ Failed to decrypt secret ${secret.name}:`, decryptError);
        // Skip this secret rather than failing the entire deployment
      }
    }

    return decryptedSecrets;

  } catch (error) {
    console.error('❌ Error fetching user secrets:', error);
    return {};
  }
}

/**
 * Deploy MCP repository to Google Cloud Run with security validation and secrets management
 */
export async function deployRepo(request: DeploymentRequest): Promise<DeploymentResult> {
  try {
    console.log('🚀 Starting deployment process...');
    
    // Fetch user secrets if userId is provided
    let userSecrets: Record<string, string> = {};
    if (request.userId && request.selectedSecrets) {
      userSecrets = await fetchUserSecrets(request.userId, request.selectedSecrets);
      console.log(`📋 Fetched ${Object.keys(userSecrets).length} user secrets`);
    }

    // Combine environment variables
    const combinedEnv = { ...request.env, ...userSecrets };

    // Extract repo information
    const repoMatch = request.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repoName] = repoMatch;
    const cleanRepoName = repoName.replace(/\.git$/, '');

    // Generate service name
    const timestamp = Date.now();
    const serviceName = `sigyl-mcp-${request.username || owner}-${cleanRepoName}-${timestamp.toString().slice(-8)}`.toLowerCase();
    
    console.log(`📦 Service name: ${serviceName}`);

    // Build and deploy container using CloudRunService
    const cloudRunService = new CloudRunService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      region: process.env.GOOGLE_CLOUD_REGION || 'us-central1'
    });

    const deploymentRequest: CloudRunDeploymentRequest = {
      repoUrl: request.repoUrl,
      repoName: `${owner}/${cleanRepoName}`,
      branch: request.branch || 'main',
      environmentVariables: combinedEnv,
      githubToken: request.githubToken
    };

    const buildResult = await cloudRunService.deployMCPServer(deploymentRequest);

    if (!buildResult.success) {
      throw new Error(buildResult.error || 'Deployment failed');
    }

    const cloudRunUrl = buildResult.deploymentUrl!;
    
    // Generate the branded proxy URL
    const proxyUrl = `${process.env.API_BASE_URL || 'https://api.sigyl.dev'}/mcp/${cleanRepoName}`;

    console.log(`✅ Deployment successful!`);
    console.log(`🔗 Cloud Run URL: ${cloudRunUrl}`);
    console.log(`🎯 Proxy URL: ${proxyUrl}`);

    // Create package in database
    const packageService = new PackageService();
    
    const packageData = {
      name: cleanRepoName,
      description: `MCP server for ${cleanRepoName}`,
      author_id: request.userId,
      source_api_url: proxyUrl, // Store the proxy URL as the public API URL
      tags: ['mcp', 'deployed'],
      required_secrets: []
    };

    const mcpPackage = await packageService.createPackage(packageData);
    console.log(`📦 Package created: ${mcpPackage.id}`);

    // Create deployment record with both URLs
    const deployment = await packageService.createDeployment(
      mcpPackage.id,
      cloudRunUrl, // Store the actual Cloud Run URL for internal use
      `${cloudRunUrl}/health`
    );
    console.log(`🚀 Deployment record created: ${deployment.id}`);

    return {
      success: true,
      deploymentUrl: proxyUrl, // Return the proxy URL to users
      serviceName: buildResult.serviceName,
      packageId: mcpPackage.id,
      proxyUrl,
      securityReport: buildResult.securityReport
    };
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deployment error'
    };
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use deployRepo instead
 */
export async function deployRepoLegacy({ repoUrl, env }: { repoUrl: string, env: Record<string, string> }) {
  console.warn('⚠️ deployRepoLegacy is deprecated. Use deployRepo instead.');
  
  const repoName = repoUrl.replace('https://github.com/', '');
  const result = await deployRepo({
    repoUrl,
    repoName,
    env
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  // Return legacy format for backward compatibility
  return {
    url: result.deploymentUrl,
    service: {
      url: result.deploymentUrl,
      id: result.serviceName
    }
  };
}

/**
 * Redeploy an existing MCP server (rebuild and update existing Cloud Run service)
 * - Does NOT create a new Cloud Run service or new mcp_packages/mcp_tools rows
 * - Only updates the existing service and DB rows
 */
export async function redeployRepo({ repoUrl, repoName, branch, env, serviceName, packageId }: {
  repoUrl: string;
  repoName: string;
  branch: string;
  env: Record<string, string>;
  serviceName: string;
  packageId: string;
}): Promise<{ success: boolean; deploymentUrl?: string; logs?: string[]; error?: string }> {
  const logs: string[] = [];
  try {
    logs.push(`🔄 Starting redeploy for service: ${serviceName}`);
    // Check Cloud Run config
    if (!CLOUD_RUN_CONFIG.projectId) {
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
    }
    // Fetch latest sigyl.yaml and mcp.yaml
    const [owner, repo] = repoName.split('/');
    let sigylConfig, mcpYaml;
    try {
      logs.push('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, branch, undefined);
      logs.push('✅ Found sigyl.yaml configuration');
    } catch (error) {
      logs.push('⚠️ Could not fetch sigyl.yaml');
    }
    try {
      logs.push('📋 Fetching mcp.yaml configuration...');
      mcpYaml = await fetchMCPYaml(owner, repo, branch, '');
      logs.push('✅ Found mcp.yaml configuration');
    } catch (error) {
      logs.push('⚠️ Could not fetch mcp.yaml');
    }
    // Prepare env
    let deploymentEnv = { ...env };
    // Initialize Cloud Run service
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);
    // Prepare Cloud Run deployment request
    const cloudRunRequest: CloudRunDeploymentRequest = {
      repoUrl,
      repoName,
      branch,
      environmentVariables: {
        ...deploymentEnv,
        ...((sigylConfig && sigylConfig.env) ? sigylConfig.env : {}),
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp',
        PORT: '8080'
      },
      sigylConfig: sigylConfig as SigylConfigUnion,
      serviceName // Use the existing service name
    };
    logs.push('🔒 Redeploying with security validation...');
    // Redeploy to Cloud Run (rebuild and update existing service)
    const cloudRunResult = await cloudRunService.deployMCPServer(cloudRunRequest);
    if (!cloudRunResult.success) {
      logs.push('❌ Google Cloud Run redeploy failed');
      return { success: false, error: cloudRunResult.error, logs };
    }
    logs.push('✅ Successfully redeployed to Google Cloud Run');
    // Update mcp_packages and mcp_tools (not insert)
    // Fetch tools from the deployed server
    let tools: any[] = [];
    try {
      const toolsResp = await fetch(`${cloudRunResult.deploymentUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });
      const text = await toolsResp.text();
      const match = text.match(/data: (\{.*\})/);
      let toolsData: any = {};
      if (match) {
        toolsData = JSON.parse(match[1]);
      } else {
        try { toolsData = JSON.parse(text); } catch {}
      }
      if (typeof toolsData === 'object' && toolsData !== null && 'result' in toolsData && toolsData.result && Array.isArray(toolsData.result.tools)) {
        tools = toolsData.result.tools;
      }
      logs.push('✅ Tools fetched from MCP server');
    } catch (err) {
      logs.push('❌ Error fetching tools from MCP server');
    }
    // Update mcp_packages
    const mcpPackagesPayload = {
      name: mcpYaml?.name,
      slug: repoName,
      version: mcpYaml?.version || null,
      description: mcpYaml?.description || null,
      source_api_url: cloudRunResult.deploymentUrl || null,
      tags: (mcpYaml && 'tags' in mcpYaml) ? (mcpYaml as any).tags : null,
      logo_url: (mcpYaml && 'logo_url' in mcpYaml) ? (mcpYaml as any).logo_url : null,
      screenshots: (mcpYaml && 'screenshots' in mcpYaml) ? (mcpYaml as any).screenshots : null,
      tools: tools as any[],
      category: (mcpYaml && 'category' in mcpYaml) ? (mcpYaml as any).category : 'general',
      verified: false,
      updated_at: new Date().toISOString()
    };
    const { error: pkgError } = await supabase
      .from('mcp_packages')
      .update(mcpPackagesPayload)
      .eq('id', packageId);
    if (pkgError) {
      logs.push('❌ Failed to update mcp_packages');
    } else {
      logs.push('✅ Updated mcp_packages');
    }
    // Update mcp_tools
    if (packageId && tools.length > 0) {
      // Remove old tools for this package
      await supabase.from('mcp_tools').delete().eq('package_id', packageId);
      for (const tool of tools) {
        await supabase.from('mcp_tools').upsert({
          package_id: packageId,
          tool_name: tool.name,
          description: tool.description || null,
          input_schema: tool.inputSchema || null,
          output_schema: tool.outputSchema || null
        });
      }
      logs.push('✅ Updated mcp_tools');
    }
    return {
      success: true,
      deploymentUrl: cloudRunResult.deploymentUrl,
      logs
    };
  } catch (error) {
    logs.push('❌ Redeploy failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs
    };
  }
}