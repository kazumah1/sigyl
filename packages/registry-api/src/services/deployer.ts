import { CloudRunService, CloudRunConfig, CloudRunDeploymentRequest, SigylConfigUnion } from '../../container-builder/src/gcp/cloudRunService';
import { supabase } from '../config/database';
import { fetchSigylYaml } from './yaml';

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
 * Deploy MCP repository to Google Cloud Run with security validation and secrets management
 */
export async function deployRepo(request: DeploymentRequest): Promise<DeploymentResult> {
  try {
    // console.log('🚀 Starting Google Cloud Run deployment for:', request.repoName);

    if (!CLOUD_RUN_CONFIG.projectId) {
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
    }

    const [owner, repo] = request.repoName.split('/');

    // Try to fetch sigyl.yaml configuration
    let sigylConfig;
    try {
      // console.log('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, request.branch || 'main', request.githubToken);
      // console.log('✅ Found sigyl.yaml configuration:', sigylConfig.runtime);
    } catch (error) {
      console.error('⚠️ Could not fetch sigyl.yaml,', error);
      throw new Error('sigyl.yaml could not be fetched or parsed. Deployment cannot continue.');
    }

    // Only set minimal required environment variables for Cloud Run
    const deploymentEnv = {
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'http',
      MCP_ENDPOINT: '/mcp',
      PORT: '8080'
    };

    // Initialize Cloud Run service
    // console.log("cloud run config", CLOUD_RUN_CONFIG);
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    // Prepare Cloud Run deployment request with Sigyl configuration
    const cloudRunRequest: CloudRunDeploymentRequest = {
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: deploymentEnv,
      sigylConfig: sigylConfig as SigylConfigUnion,
      githubToken: request.githubToken
    };

    // console.log('🔒 Deploying with security validation...');

    // Deploy to Cloud Run with integrated security validation
    const cloudRunResult = await cloudRunService.deployMCPServer(cloudRunRequest);

    if (!cloudRunResult.success) {
      console.error('❌ Google Cloud Run deployment failed:', cloudRunResult.error);
      return {
        success: false,
        error: cloudRunResult.error || 'Google Cloud Run deployment failed',
        securityReport: cloudRunResult.securityReport
      };
    }

    // console.log('✅ Successfully deployed to Google Cloud Run:', cloudRunResult.deploymentUrl);
    // console.log('🔗 MCP endpoint available at:', `${cloudRunResult.deploymentUrl}/mcp`);

    // === Insert/Upsert into mcp_packages ===
    let packageId: string | null = null;
    let tools: any[] = [];
    // Parse configSchema for secrets
    let requiredSecrets: any[] = [];
    let optionalSecrets: any[] = [];
    let configSchema: any = undefined;
    let authorIdToUse = request.userId || null;
    // If userId is not a valid UUID, look up in profiles table
    if (authorIdToUse && !/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(authorIdToUse)) {
      let githubIdNumeric = authorIdToUse;
      if (githubIdNumeric.startsWith('github_')) {
        githubIdNumeric = githubIdNumeric.replace('github_', '');
      }
      // console.log('[DEPLOY] userId is not a UUID, looking up in profiles table by github_id:', githubIdNumeric);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('github_id', githubIdNumeric)
        .single();
      if (profileError) {
        console.warn('[DEPLOY] Error looking up profile for github_id', githubIdNumeric, profileError);
      }
      if (profile && profile.id) {
        authorIdToUse = profile.id;
        // console.log('[DEPLOY] Found UUID for github_id:', authorIdToUse);
      } else {
        console.warn('[DEPLOY] No profile found for github_id', githubIdNumeric);
        authorIdToUse = null;
      }
    }
    // console.log('[DEPLOY] Using author_id:', authorIdToUse);
    // console.log('[DEPLOY] Incoming request.userId:', request.userId);

    // Use configSchema from sigylConfig
    if (sigylConfig && typeof sigylConfig === 'object') {
      if ('startCommand' in sigylConfig && sigylConfig.startCommand && typeof sigylConfig.startCommand === 'object' && 'configSchema' in sigylConfig.startCommand) {
        configSchema = sigylConfig.startCommand.configSchema;
        // console.log('[DEPLOY] Using configSchema from sigylConfig.startCommand.configSchema');
      } else if ('configSchema' in sigylConfig) {
        configSchema = sigylConfig.configSchema;
        // console.log('[DEPLOY] Using configSchema from sigylConfig.configSchema');
      }
    }
    // console.log('[DEPLOY] Parsed configSchema:', JSON.stringify(configSchema, null, 2));
    if (configSchema && typeof configSchema === 'object' && configSchema.type === 'object' && configSchema.properties && typeof configSchema.properties === 'object') {
      const requiredKeys = Array.isArray(configSchema.required) ? configSchema.required : [];
      for (const [key, prop] of Object.entries(configSchema.properties)) {
        if (prop && typeof prop === 'object') {
          const secretObj = { name: key, ...prop };
          if (requiredKeys.includes(key)) {
            requiredSecrets.push(secretObj);
          } else {
            optionalSecrets.push(secretObj);
          }
        }
      }
    }
    // console.log('[DEPLOY] Computed requiredSecrets:', JSON.stringify(requiredSecrets, null, 2));
    // console.log('[DEPLOY] Computed optionalSecrets:', JSON.stringify(optionalSecrets, null, 2));
    try {
      // Fetch tools from the deployed server (handle event-stream)
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
      // Parse event-stream response
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
      // console.log('[DEPLOY] Tools fetched from MCP server:', JSON.stringify(tools, null, 2));
      // Upsert mcp_packages with tools, author_id, required_secrets, and optional_secrets
      const mcpPackagesPayload = {
        name: request.repoName,
        slug: request.repoName,
        version: null,
        description: `MCP server for ${request.repoName}`,
        author_id: authorIdToUse,
        source_api_url: cloudRunResult.deploymentUrl || null,
        service_name: cloudRunResult.serviceName || null,
        tags: null,
        logo_url: null,
        screenshots: null,
        tools: tools as any[],
        category: 'general',
        verified: false,
        required_secrets: requiredSecrets.length > 0 ? requiredSecrets : null,
        optional_secrets: optionalSecrets.length > 0 ? optionalSecrets : null,
        ready: false
      };
      // console.log('[DEPLOY] Upserting mcp_packages with payload:', JSON.stringify(mcpPackagesPayload, null, 2));
      const { error: pkgError, data: pkgRows } = await supabase
        .from('mcp_packages')
        .update(mcpPackagesPayload)
        .eq('id', packageId)
        .select();
      if ((!packageId || packageId === null) && pkgRows && pkgRows.length > 0) {
        packageId = pkgRows[0].id;
      }
      if (pkgError) {
        console.error('❌ Failed to update mcp_packages:', pkgError);
      } else {
        console.log('✅ Updated mcp_packages');
      }
    } catch (err) {
      console.error('❌ Error fetching or inserting tools:', err);
    }
    // === Insert tools into mcp_tools table ===
    if (cloudRunResult.deploymentUrl && packageId && tools.length > 0) {
      try {
        for (const tool of tools) {
          // console.log('[DEPLOY] Upserting mcp_tools with:', JSON.stringify({
          //   package_id: packageId,
          //   tool_name: tool.name,
          //   description: tool.description || null,
          //   input_schema: tool.inputSchema || null,
          //   output_schema: tool.outputSchema || null
          // }, null, 2));
          await supabase.from('mcp_tools').upsert({
            package_id: packageId,
            tool_name: tool.name,
            description: tool.description || null,
            input_schema: tool.inputSchema || null,
            output_schema: tool.outputSchema || null
          });
        }
      } catch (err) {
        console.error('❌ Error inserting tools:', err);
      }
    }

    // 2. Poll /mcp endpoint for up to 2 minutes using POST and JSON-RPC body
    const startTime = Date.now();
    const mcpUrl = `${cloudRunResult.deploymentUrl}/mcp`;
    while (Date.now() - startTime < 120000) {
      const mcpResp = await fetch(mcpUrl, {
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
      if (mcpResp.ok) {
        try {
          const text = await mcpResp.text();
          // Try to parse event-stream or JSON
          let data: any = {};
          const match = text.match(/data: (\{.*\})/);
          if (match) {
            data = JSON.parse(match[1]);
          } else {
            data = JSON.parse(text);
          }
          if (data && data.result) {
            console.log('✅ MCP server is ready (responded to /mcp POST with tools/list)');
            // 3. If ready, update ready: true
            const { error: pkgError } = await supabase
              .from('mcp_packages')
              .update({ ready: true })
              .eq('id', packageId);
            if (pkgError) {
              console.error('❌ Failed to update mcp_packages:', pkgError);
            } else {
              console.log('✅ Updated mcp_packages');
            }
            break;
          }
        } catch (err) {
          // Ignore parse errors, keep polling
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      ...(cloudRunResult.deploymentUrl && { deploymentUrl: cloudRunResult.deploymentUrl }),
      ...(cloudRunResult.serviceName && { serviceName: cloudRunResult.serviceName }),
      ...(cloudRunResult.securityReport && { securityReport: cloudRunResult.securityReport })
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
    let sigylConfig;
    let mcpYaml: any = null; // Properly declare mcpYaml
    try {
      logs.push('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, branch, undefined);
      logs.push('✅ Found sigyl.yaml configuration');
      logs.push('✅ Found sigyl.yaml configuration:', JSON.stringify(sigylConfig));
    } catch (error) {
      logs.push('⚠️ Could not fetch sigyl.yaml');
    }
    // try {
    //   logs.push('📋 Fetching mcp.yaml configuration...');
    //   mcpYaml = await fetchMCPYaml(owner, repo, branch, '');
    //   logs.push('✅ Found mcp.yaml configuration');
    // } catch (error) {
    //   logs.push('⚠️ Could not fetch mcp.yaml');
    // }
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
      service_name: cloudRunResult.serviceName || null,
      tags: (mcpYaml && 'tags' in mcpYaml) ? (mcpYaml as any).tags : null,
      logo_url: (mcpYaml && 'logo_url' in mcpYaml) ? (mcpYaml as any).logo_url : null,
      screenshots: (mcpYaml && 'screenshots' in mcpYaml) ? (mcpYaml as any).screenshots : null,
      tools: tools as any[],
      category: (mcpYaml && 'category' in mcpYaml) ? (mcpYaml as any).category : 'general',
      verified: false,
      updated_at: new Date().toISOString(),
      ready: false
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

    // 2. Poll /mcp endpoint for up to 2 minutes using POST and JSON-RPC body
    const startTime = Date.now();
    const mcpUrl = `${cloudRunResult.deploymentUrl}/mcp`;
    while (Date.now() - startTime < 120000) {
      const mcpResp = await fetch(mcpUrl, {
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
      if (mcpResp.ok) {
        try {
          const text = await mcpResp.text();
          // Try to parse event-stream or JSON
          let data: any = {};
          const match = text.match(/data: (\{.*\})/);
          if (match) {
            data = JSON.parse(match[1]);
          } else {
            data = JSON.parse(text);
          }
          if (data && data.result) {
            console.log('✅ MCP server is ready (responded to /mcp POST with tools/list)');
            // 3. If ready, update ready: true
            const { error: pkgError } = await supabase
              .from('mcp_packages')
              .update({ ready: true })
              .eq('id', packageId);
            if (pkgError) {
              console.error('❌ Failed to update mcp_packages:', pkgError);
            } else {
              console.log('✅ Updated mcp_packages');
            }
            break;
          }
        } catch (err) {
          // Ignore parse errors, keep polling
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
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