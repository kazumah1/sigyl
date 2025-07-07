import { CloudRunService, CloudRunConfig, CloudRunDeploymentRequest, SigylConfigUnion } from '../../container-builder/src/gcp/cloudRunService';
import { supabase } from '../config/database';
import { fetchSigylYaml } from './yaml';
import { google } from 'googleapis';
import { createAPIRequest } from 'googleapis-common';

// Google Cloud Run configuration
const CLOUD_RUN_CONFIG: CloudRunConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  // Remove credential fields - let GoogleAuth use GOOGLE_APPLICATION_CREDENTIALS automatically
  serviceAccountKey: '',
  keyFilePath: ''
};

// Auth and Compute client setup (do this once at module scope)
let auth: any;
let compute: any;

async function initGoogleClients() {
  if (!auth) {
    auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  if (!compute) {
    compute = google.compute('v1');
  }
}

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

// Helper: sleep
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Delay
function getDelay(attempt: number, baseDelayMs = 1000, maxDelayMs = 10000): number {
  const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.random() * expDelay;
  return jitter;
}

// Helper: Create Backend Service
export async function createBackendService(backendServiceName: string, project: string) {
  await initGoogleClients();
  try {
    const res = await compute.backendServices.get({
      project,
      backendService: backendServiceName,
      auth,
    });
    if (res && res.status === 200 && res.data?.selfLink) {
      console.log(`[SKIP] Backend service "${backendServiceName}" already exists.`)
      return;
    }
  } catch (err: any) {
    if (err?.code !== 404) {
      throw err;
    }
    console.log(`[CREATE] Creating backend service "${backendServiceName}"...`);
    const res = await compute.backendServices.insert({
      project,
      requestBody: {
        name: backendServiceName,
        loadBalancingScheme: 'EXTERNAL_MANAGED',
        protocol: 'HTTPS',
      },
      auth,
    });
    // Wait for the global operation to complete
    const operationName = res.data.name;
    let opStatus = res.data.status;
    const maxWaitMs = 30000;
    const start = Date.now();
    let attempt = 0;
    while (opStatus !== 'DONE' && Date.now() - start < maxWaitMs) {
      await sleep(getDelay(attempt));
      attempt++;
      const opRes = await compute.globalOperations.get({
        project,
        operation: operationName,
        auth,
      });
      opStatus = opRes.data.status;
    }
    if (opStatus !== 'DONE') {
      throw new Error(`Backend service creation operation did not complete in time`);
    }
  }
}

// Helper: Create Serverless NEG
export async function createNeg(negName: string, region: string, project: string, cloudRunService: string) {
  await initGoogleClients();
  try {
    const res = await compute.regionNetworkEndpointGroups.get({
      project,
      region,
      networkEndpointGroup: negName,
      auth,
    });
    if (res && res.status === 200 && res.data?.networkEndpointType === 'SERVERLESS') {
      console.log(`[SKIP] NEG "${negName}" already exists.`);
      return;
    }
  } catch (err: any) {
    if (err?.code !== 404) {
      throw err;
    }
    console.log(`[CREATE] Creating NEG "${negName}"...`);
    const parameters = {
      options: {
        url: `https://compute.googleapis.com/compute/v1/projects/${project}/regions/${region}/networkEndpointGroups`,
        method: 'POST',
      },
      params: {
        project,
        region,
        zone: undefined,
        requestBody: {
          name: negName,
          networkEndpointType: 'SERVERLESS',
          cloudRun: { service: cloudRunService },
        },
        auth,
      },
      requiredParams: ['project', 'region'],
      pathParams: ['project', 'region'],
      context: { _options: {}, google },
    };
  
    await createAPIRequest<any>(parameters);
  }
}

// Helper: Wait for Backend Service to be ready
export async function waitForBackendServiceReady(backendServiceName: string, project: string, maxWaitMs = 20000) {
  await initGoogleClients();
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await compute.backendServices.get({
        project,
        backendService: backendServiceName,
        auth,
      });
      // If the backend service exists and has a selfLink, consider it ready
      if (res && res.status === 200 && res.data && res.data.selfLink) {
        return;
      }
    } catch (err) {
      // Ignore errors and keep polling
    }
    await sleep(getDelay(attempt));
    attempt++;
  }
  throw new Error(`Backend service ${backendServiceName} not ready after ${maxWaitMs}ms`);
}

// Helper: Add NEG to Backend Service
export async function addNegToBackendService(backendServiceName: string, negName: string, region: string, project: string) {
  await initGoogleClients();
  await compute.backendServices.patch({
    project,
    backendService: backendServiceName,
    requestBody: {
      backends: [
        {
          group: `projects/${project}/regions/${region}/networkEndpointGroups/${negName}`,
        },
      ],
    },
    auth,
  });
}

// Helper: Wait for NEG to be ready on Backend Service
export async function waitForNegReadyOnBackendService(backendServiceName: string, negName: string, region: string, project: string, maxWaitMs = 30000) {
  await initGoogleClients();
  const groupUrl = `projects/${project}/regions/${region}/networkEndpointGroups/${negName}`;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await compute.backendServices.get({
        project,
        backendService: backendServiceName,
        auth,
      });
      if (
        res &&
        res.status === 200 &&
        res.data &&
        Array.isArray(res.data.backends) &&
        res.data.backends.some((b: any) => b.group && b.group.endsWith(groupUrl))
      ) {
        return;
      }
    } catch (err) {
      // Ignore errors and keep polling
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`NEG ${negName} not ready on backend service ${backendServiceName} after ${maxWaitMs}ms`);
}

// Helper: Add Path Rule to URL Map
export async function addPathRuletoUrlMap(urlMapName: string, path: string, backendServiceName: string, project: string) {
  await initGoogleClients();
  // Get the current URL map
  const urlMapRes = await compute.urlMaps.get({
    project,
    urlMap: urlMapName,
    auth,
  });
  const urlMap = urlMapRes.data;
  // Find the first path matcher and add a new path rule
  const pathMatcher = urlMap.pathMatchers && urlMap.pathMatchers[0];
  if (!pathMatcher) throw new Error('No pathMatcher found in URL map');
  pathMatcher.pathRules = pathMatcher.pathRules || [];
  pathMatcher.pathRules.push({
    paths: [path],
    service: `projects/${project}/global/backendServices/${backendServiceName}`,
  });
  // Patch the URL map
  await compute.urlMaps.patch({
    project,
    urlMap: urlMapName,
    requestBody: urlMap,
    auth,
  });
}

// Helper: Retry addPathRuletoUrlMap if backend service is not ready
export async function retryAddPathRuleToUrlMap(
  urlMapName: string,
  path: string,
  backendServiceName: string,
  project: string,
  maxAttempts = 10,
  delayMs = 5000
) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await addPathRuletoUrlMap(urlMapName, path, backendServiceName, project);
      return;
    } catch (err: any) {
      lastError = err;
      if (
        err &&
        err.message &&
        err.message.includes('is not ready')
      ) {
        // Wait and retry
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err; // Some other error, don't retry
      }
    }
  }
  throw lastError;
}

// Helper: Delete Backend Service
export async function deleteBackendService(backendServiceName: string, project: string) {
  await initGoogleClients();
  try {
    await compute.backendServices.delete({
      project,
      backendService: backendServiceName,
      auth,
    });
    // Optionally wait for operation to complete
    return true;
  } catch (err) {
    console.error('Failed to delete backend service:', err);
    return false;
  }
}

// Helper: Delete Serverless NEG (check existence/type first)
export async function deleteNeg(negName: string, region: string, project: string) {
  await initGoogleClients();
  try {
    // Check if NEG exists and is SERVERLESS
    const negRes = await compute.networkEndpointGroups.get({
      project,
      region,
      networkEndpointGroup: negName,
      auth,
    });
    if (!negRes.data || negRes.data.networkEndpointType !== 'SERVERLESS') {
      console.warn(`[NEG DELETE] NEG ${negName} not found or not SERVERLESS, skipping deletion.`);
      return false;
    }
    await compute.networkEndpointGroups.delete({
      project,
      region,
      networkEndpointGroup: negName,
      auth,
    });
    console.log(`[NEG DELETE] Deleted NEG ${negName} in region ${region}`);
    return true;
  } catch (err: any) {
    if (err && err.code === 404) {
      console.warn(`[NEG DELETE] NEG ${negName} not found, skipping deletion.`);
      return false;
    }
    console.error('Failed to delete NEG:', err);
    return false;
  }
}

// Helper: Remove Path Rule from URL Map
export async function removePathRuleFromUrlMap(urlMapName: string, path: string, backendServiceName: string, project: string) {
  await initGoogleClients();
  try {
    // Get the current URL map
    const urlMapRes = await compute.urlMaps.get({
      project,
      urlMap: urlMapName,
      auth,
    });
    const urlMap = urlMapRes.data;
    let changed = false;
    if (urlMap.pathMatchers && Array.isArray(urlMap.pathMatchers)) {
      for (const pathMatcher of urlMap.pathMatchers) {
        if (Array.isArray(pathMatcher.pathRules)) {
          const originalLength = pathMatcher.pathRules.length;
          pathMatcher.pathRules = pathMatcher.pathRules.filter(
            (rule: any) => !(rule.paths && rule.paths.includes(path) && rule.service && rule.service.endsWith(backendServiceName))
          );
          if (pathMatcher.pathRules.length !== originalLength) {
            changed = true;
          }
        }
      }
    }
    // Remove as defaultService if present
    if (urlMap.defaultService && urlMap.defaultService.endsWith(backendServiceName)) {
      // Set to a safe fallback backend service (must exist!)
      const fallback = `https://www.googleapis.com/compute/v1/projects/${project}/global/backendServices/sigyl-mcp-dummy-backend-1nva0v9aasdk123o`;
      urlMap.defaultService = fallback;
      changed = true;
      console.warn(`[URL MAP] defaultService referenced backend being deleted. Set to fallback: ${fallback}`);
    }
    if (changed) {
      await compute.urlMaps.patch({
        project,
        urlMap: urlMapName,
        requestBody: urlMap,
        auth,
      });
      console.log(`[URL MAP] Removed path rule(s) and/or defaultService for ${path} -> ${backendServiceName}`);
    } else {
      console.log(`[URL MAP] No path rule or defaultService found for ${path} -> ${backendServiceName}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to remove path rule from URL map:', err);
    return false;
  }
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
    } else {
      // === Creating NEG and backend service using Google Cloud Node.js SDK ===
      const negName = `neg-${cloudRunResult.serviceName}`;
      const backendServiceName = `sigyl-backend-${cloudRunResult.serviceName}`;
      const urlMapName = `sigyl-load-balancer`;
      const region = CLOUD_RUN_CONFIG.region;
      const project = CLOUD_RUN_CONFIG.projectId;
      const path = `/@${request.repoName}`;

      await Promise.all([
        createBackendService(backendServiceName, project),
        createNeg(negName, region, project, cloudRunResult.serviceName || ''),
      ]);
      await addNegToBackendService(backendServiceName, negName, region, project);
      await waitForNegReadyOnBackendService(backendServiceName, negName, region, project);
      await retryAddPathRuleToUrlMap(urlMapName, path, backendServiceName, project);
    }

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
        source_api_url: `https://server.sigyl.dev/@${request.repoName}`,
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
      const { data: pkgRows, error: pkgError } = await supabase
        .from('mcp_packages')
        .upsert([
          mcpPackagesPayload
        ], { onConflict: 'source_api_url' })
        .select();
      if (pkgRows && pkgRows.length > 0) {
        packageId = pkgRows[0].id;
      }
      if (pkgError) {
        console.error('❌ Failed to upsert mcp_packages:', pkgError);
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