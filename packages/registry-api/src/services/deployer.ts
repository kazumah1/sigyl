import { CloudRunService, CloudRunConfig, CloudRunDeploymentRequest, SigylConfigUnion } from '@sigil/container-builder';
import { supabase } from '../config/database';
import { decrypt } from '../utils/encryption';
import { fetchSigylYaml, SigylConfig } from './yaml';
import { fetchMCPYaml } from './yaml';

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
  error?: string;
  securityReport?: any;
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
    console.log('🚀 Starting Google Cloud Run deployment for:', request.repoName);

    // Check if Google Cloud credentials are configured
    if (!CLOUD_RUN_CONFIG.projectId) {
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
    }

    // Extract repo details
    const [owner, repo] = request.repoName.split('/');

    // Try to fetch sigyl.yaml configuration
    let sigylConfig;
    let mcpYaml = null;
    try {
      console.log('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, request.branch || 'main', request.githubToken);
      console.log('✅ Found sigyl.yaml configuration:', sigylConfig.runtime);
    } catch (error) {
      console.error('⚠️ Could not fetch sigyl.yaml,', error);
    }
    // Try to fetch mcp.yaml configuration for metadata fields
    try {
      console.log('📋 Fetching mcp.yaml configuration...');
      mcpYaml = await fetchMCPYaml(owner, repo, (request.branch ?? 'main'), request.githubToken || '');
      console.log('✅ Found mcp.yaml configuration:', mcpYaml.name);
    } catch (error) {
      console.warn('⚠️ Could not fetch mcp.yaml:', error);
    }

    // Fetch user secrets if userId is provided
    let deploymentEnv = { ...request.env };
    
    if (request.userId) {
      console.log('🔐 Fetching user secrets...');
      const userSecrets = await fetchUserSecrets(request.userId, request.selectedSecrets);
      deploymentEnv = {
        ...deploymentEnv,
        ...userSecrets
      };
      console.log(`✅ Added ${Object.keys(userSecrets).length} secrets to deployment environment`);
    }

    // Initialize Cloud Run service
    console.log("cloud run config", CLOUD_RUN_CONFIG);
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    // Prepare Cloud Run deployment request with Sigyl configuration
    const cloudRunRequest: CloudRunDeploymentRequest = {
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: {
        ...deploymentEnv,
        // Add sigyl.yaml environment variables
        ...((sigylConfig && sigylConfig.env) ? sigylConfig.env : {}),
        // Ensure required MCP variables are set
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp',
        PORT: '8080'
      },
      // Pass the sigyl configuration with proper casting
      sigylConfig: sigylConfig as SigylConfigUnion,
      // Pass the GitHub token for security validation
      githubToken: request.githubToken
    };

    console.log('🔒 Deploying with security validation...');

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

    console.log('✅ Successfully deployed to Google Cloud Run:', cloudRunResult.deploymentUrl);
    console.log('🔗 MCP endpoint available at:', `${cloudRunResult.deploymentUrl}/mcp`);

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
      console.log('[DEPLOY] userId is not a UUID, looking up in profiles table by github_id:', githubIdNumeric);
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
        console.log('[DEPLOY] Found UUID for github_id:', authorIdToUse);
      } else {
        console.warn('[DEPLOY] No profile found for github_id', githubIdNumeric);
        authorIdToUse = null;
      }
    }
    console.log('[DEPLOY] Using author_id:', authorIdToUse);
    console.log('[DEPLOY] Incoming request.userId:', request.userId);
    if (mcpYaml && typeof mcpYaml === 'object') {
      if ('startCommand' in mcpYaml && mcpYaml.startCommand && typeof mcpYaml.startCommand === 'object' && 'configSchema' in mcpYaml.startCommand) {
        configSchema = mcpYaml.startCommand.configSchema;
        console.log('[DEPLOY] Using configSchema from mcpYaml.startCommand.configSchema');
      } else if ('configSchema' in mcpYaml) {
        configSchema = mcpYaml.configSchema;
        console.log('[DEPLOY] Using configSchema from mcpYaml.configSchema');
      }
    }
    if (!configSchema && sigylConfig && typeof sigylConfig === 'object') {
      if ('startCommand' in sigylConfig && sigylConfig.startCommand && typeof sigylConfig.startCommand === 'object' && 'configSchema' in sigylConfig.startCommand) {
        configSchema = sigylConfig.startCommand.configSchema;
        console.log('[DEPLOY] Using configSchema from sigylConfig.startCommand.configSchema');
      } else if ('configSchema' in sigylConfig) {
        configSchema = sigylConfig.configSchema;
        console.log('[DEPLOY] Using configSchema from sigylConfig.configSchema');
      }
    }
    console.log('[DEPLOY] Parsed configSchema:', JSON.stringify(configSchema, null, 2));
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
    console.log('[DEPLOY] Computed requiredSecrets:', JSON.stringify(requiredSecrets, null, 2));
    console.log('[DEPLOY] Computed optionalSecrets:', JSON.stringify(optionalSecrets, null, 2));
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
      console.log('[DEPLOY] Tools fetched from MCP server:', JSON.stringify(tools, null, 2));
      // Upsert mcp_packages with tools, author_id, required_secrets, and optional_secrets
      const mcpPackagesPayload = {
        name: mcpYaml?.name || request.repoName,
        version: mcpYaml?.version || null,
        description: mcpYaml?.description || null,
        author_id: authorIdToUse,
        source_api_url: cloudRunResult.deploymentUrl || null,
        tags: (mcpYaml && 'tags' in mcpYaml) ? (mcpYaml as any).tags : null,
        logo_url: (mcpYaml && 'logo_url' in mcpYaml) ? (mcpYaml as any).logo_url : null,
        screenshots: (mcpYaml && 'screenshots' in mcpYaml) ? (mcpYaml as any).screenshots : null,
        tools: tools as any[],
        category: (mcpYaml && 'category' in mcpYaml) ? (mcpYaml as any).category : 'general',
        verified: false,
        required_secrets: requiredSecrets.length > 0 ? requiredSecrets : null,
        // TODO: Add 'optional_secrets' column to mcp_packages table if not present
        optional_secrets: optionalSecrets.length > 0 ? optionalSecrets : null
      };
      console.log('[DEPLOY] Upserting mcp_packages with payload:', JSON.stringify(mcpPackagesPayload, null, 2));
      const { data: pkgData, error: pkgError } = await supabase
        .from('mcp_packages')
        .upsert([
          mcpPackagesPayload
        ], { onConflict: 'source_api_url' })
        .select();
      if (pkgError) {
        console.error('❌ Failed to upsert mcp_packages:', pkgError);
      } else if (pkgData && pkgData.length > 0) {
        packageId = pkgData[0].id;
      }
    } catch (err) {
      console.error('❌ Error fetching or inserting tools:', err);
    }
    // === Insert tools into mcp_tools table ===
    if (cloudRunResult.deploymentUrl && packageId && tools.length > 0) {
      try {
        for (const tool of tools) {
          console.log('[DEPLOY] Upserting mcp_tools with:', JSON.stringify({
            package_id: packageId,
            tool_name: tool.name,
            description: tool.description || null,
            input_schema: tool.inputSchema || null,
            output_schema: tool.outputSchema || null
          }, null, 2));
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