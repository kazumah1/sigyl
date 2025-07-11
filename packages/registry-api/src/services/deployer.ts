import { CloudRunService, CloudRunConfig, SigylConfigUnion } from '../../container-builder/src/gcp/cloudRunService';
import { supabase } from '../config/database';
import { fetchSigylYaml } from './yaml';
import { google } from 'googleapis';
import { createAPIRequest } from 'googleapis-common';
import type { LogCallback } from '../../container-builder/src/types/log';

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
  subdirectory?: string;
}

export interface RedeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch?: string;
  env: Record<string, string>;
  userId?: string;
  username?: string;
  selectedSecrets?: string[];
  githubToken?: string;
  serviceName?: string;
  packageId?: string;
  subdirectory?: string;
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

export interface RedeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  serviceName?: string;
  packageId?: string;
  error?: string;
  securityReport?: any;
  proxyUrl?: string;
  logs?: string[];
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
    const maxWaitMs = 120000; // Increased from 30000 (30s) to 120000 (2 minutes)
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
export async function waitForBackendServiceReady(backendServiceName: string, project: string, maxWaitMs = 120000) { // Increased default from 20000 to 120000
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
export async function waitForNegReadyOnBackendService(backendServiceName: string, negName: string, region: string, project: string, maxWaitMs = 120000) { // Increased default from 30000 to 120000
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
  // Deduplicate: Only add if not already present
  const backendServiceUrl = `projects/${project}/global/backendServices/${backendServiceName}`;
  const alreadyExists = pathMatcher.pathRules.some((rule: any) =>
    rule.paths && rule.paths.includes(path) && rule.service === backendServiceUrl
  );
  if (!alreadyExists) {
    pathMatcher.pathRules.push({
      paths: [path],
      service: backendServiceUrl,
      routeAction: {
        urlRewrite: {
          pathPrefixRewrite: '/mcp'
        }
      }
    });
    // Patch the URL map only if we added a rule
    await compute.urlMaps.patch({
      project,
      urlMap: urlMapName,
      requestBody: urlMap,
      auth,
    });
  } else {
    console.log(`[URL MAP] Path rule for ${path} -> ${backendServiceName} already exists, skipping.`);
  }
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
export async function deployRepo(request: DeploymentRequest, onLog?: LogCallback): Promise<DeploymentResult> {
  function log(line: string) {
    if (onLog) onLog(line);
    console.log(line);
  }
  try {
    log('🚀 Starting Google Cloud Run deployment for: ' + request.repoName);

    if (!CLOUD_RUN_CONFIG.projectId) {
      log('❌ Google Cloud credentials not configured.');
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
    }

    const [owner, repo] = request.repoName.split('/');

    // Try to fetch sigyl.yaml configuration
    let sigylConfig;
    try {
      log('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, request.branch || 'main', request.githubToken, request.subdirectory);
      log('✅ Found sigyl.yaml configuration: ' + (sigylConfig?.runtime || 'unknown'));
    } catch (error) {
      log('⚠️ Could not fetch sigyl.yaml: ' + (error instanceof Error ? error.message : String(error)));
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

    log('🔒 Deploying with security validation...');

    // Deploy to Cloud Run with integrated security validation
    const cloudRunResult = await cloudRunService.deployMCPServer({
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: deploymentEnv,
      sigylConfig: sigylConfig as SigylConfigUnion,
      githubToken: request.githubToken,
      ...(request.subdirectory ? { subdirectory: request.subdirectory } : {})
    });

    if (!cloudRunResult.success) {
      log('❌ Google Cloud Run deployment failed: ' + (cloudRunResult.error || 'unknown error'));
      return {
        success: false,
        error: cloudRunResult.error || 'Google Cloud Run deployment failed',
        securityReport: cloudRunResult.securityReport
      };
    } else {
      log('✅ Google Cloud Run deployment succeeded.');
      // === Creating NEG and backend service using Google Cloud Node.js SDK ===
      const negName = `neg-${cloudRunResult.serviceName}`;
      const backendServiceName = `sigyl-backend-${cloudRunResult.serviceName}`;
      const urlMapName = `sigyl-load-balancer`;
      const region = CLOUD_RUN_CONFIG.region;
      const project = CLOUD_RUN_CONFIG.projectId;
      const path = `/@${request.repoName}/mcp`;

      await Promise.all([
        createBackendService(backendServiceName, project),
        createNeg(negName, region, project, cloudRunResult.serviceName || ''),
      ]);
      await addNegToBackendService(backendServiceName, negName, region, project);
      await waitForNegReadyOnBackendService(backendServiceName, negName, region, project);
      await retryAddPathRuleToUrlMap(urlMapName, path, backendServiceName, project);

      // === Ensure unauthenticated invocations are allowed BEFORE polling ===
      try {
        const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);
        await cloudRunService.allowUnauthenticated(cloudRunResult.serviceName!);
        log('✅ Allowed unauthenticated invocations for Cloud Run service.');
      } catch (err) {
        log('⚠️ Failed to set unauthenticated invoker policy: ' + (err instanceof Error ? err.message : String(err)));
      }
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
      // Use the canonical MCP server URL for tool fetching
      const mcpBaseUrl = `https://server.sigyl.dev/@${request.repoName}`;
      console.log('[DEPLOY] Fetching tools from:', `${mcpBaseUrl}/mcp`);
      const toolsResp = await fetch(`${mcpBaseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'x-sigyl-api-key': process.env.SIGYL_MASTER_KEY || ''
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });
      // Debug: Log the full response before parsing
      const text = await toolsResp.text();
      console.log('[DEPLOY] /mcp response:', text);
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

    return {
      success: true,
      ...(cloudRunResult.deploymentUrl && { deploymentUrl: cloudRunResult.deploymentUrl }),
      ...(cloudRunResult.serviceName && { serviceName: cloudRunResult.serviceName }),
      ...(cloudRunResult.securityReport && { securityReport: cloudRunResult.securityReport })
    };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (onLog) onLog('❌ Deployment failed: ' + msg);
    console.error('❌ Deployment failed:', error);
    return {
      success: false,
      error: msg
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
 * @param githubToken Optional GitHub App installation token for private repo access
 */
export async function redeployRepo(request: RedeploymentRequest, onLog?: LogCallback): Promise<RedeploymentResult> {
  function log(line: string) {
    if (onLog) onLog(line);
    console.log(line);
  }
  try {
    log(`🔄 Starting redeploy for service: ${request.serviceName}`);
    if (!CLOUD_RUN_CONFIG.projectId) {
      throw new Error('Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT_ID environment variable.');
    }
    const [owner, repo] = request.repoName.split('/');
    let sigylConfig;
    try {
      log('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, request.branch || 'main', request.githubToken, request.subdirectory);
      log('✅ Found sigyl.yaml configuration');
    } catch (error) {
      log('⚠️ Could not fetch sigyl.yaml: ' + (error instanceof Error ? error.message : String(error)));
      throw new Error('sigyl.yaml could not be fetched or parsed. Redeploy cannot continue.');
    }
    // Prepare environment variables
    const deploymentEnv = {
      ...request.env,
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'http',
      MCP_ENDPOINT: '/mcp',
      PORT: '8080'
    };
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);
    log('🔒 Redeploying with security validation...');
    const cloudRunResult = await cloudRunService.deployMCPServer({
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: deploymentEnv,
      sigylConfig: sigylConfig as SigylConfigUnion,
      serviceName: request.serviceName, // Use the existing service name
      githubToken: request.githubToken,
      ...(request.subdirectory ? { subdirectory: request.subdirectory } : {})
    });
    if (!cloudRunResult.success) {
      log('❌ Google Cloud Run redeploy failed: ' + (cloudRunResult.error || 'unknown error'));
      return { success: false, error: cloudRunResult.error || 'Google Cloud Run redeploy failed' };
    }
    log('✅ Successfully redeployed to Google Cloud Run');

    // === Ensure backend service, NEG, and URL map are set up before fetching tools ===
    // (Assume these helper functions exist and are similar to deployRepo)
    const negName = `neg-${cloudRunResult.serviceName}`;
    const backendServiceName = `sigyl-backend-${cloudRunResult.serviceName}`;
    const urlMapName = `sigyl-load-balancer`;
    const region = CLOUD_RUN_CONFIG.region;
    const project = CLOUD_RUN_CONFIG.projectId;
    const path = `/@${request.repoName}/mcp`;
    await Promise.all([
      createBackendService(backendServiceName, project),
      createNeg(negName, region, project, cloudRunResult.serviceName || ''),
    ]);
    await addNegToBackendService(backendServiceName, negName, region, project);
    await waitForNegReadyOnBackendService(backendServiceName, negName, region, project);
    await retryAddPathRuleToUrlMap(urlMapName, path, backendServiceName, project);

    // === Now fetch tools from the deployed server ===
    let tools: any[] = [];
    try {
      // Use the canonical MCP server URL for tool fetching
      const mcpBaseUrl = `https://server.sigyl.dev/@${request.repoName}`;
      console.log('[REDEPLOY] Fetching tools from:', `${mcpBaseUrl}/mcp`);
      const toolsResp = await fetch(`${mcpBaseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'x-sigyl-api-key': process.env.SIGYL_MASTER_KEY || ''
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });
      // Debug: Log the full response before parsing
      const text = await toolsResp.text();
      console.log('[REDEPLOY] /mcp response:', text);
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
      if (!tools || tools.length === 0) {
        log('[REDEPLOY] Warning: No tools detected in MCP server response.');
      }
      log('✅ Tools fetched from MCP server');
    } catch (err) {
      log('❌ Error fetching tools from MCP server');
    }
    // Update mcp_packages
    // Only update mutable fields on redeploy
    const mcpPackagesPayload = {
      // Do NOT update: source_api_url, author_id, service_name, slug
      // Only update: tools, updated_at, verified, ready, etc.
      tools: tools as any[],
      verified: false,
      updated_at: new Date().toISOString(),
      ready: false
    };
    if (!request.packageId) {
      log('❌ No packageId provided for redeploy.');
      return { success: false, error: 'No packageId provided for redeploy.' };
    }
    const { error: pkgError } = await supabase
      .from('mcp_packages')
      .update(mcpPackagesPayload)
      .eq('id', request.packageId);
    if (pkgError) {
      log('❌ Failed to update mcp_packages: ' + pkgError.message);
    } else {
      log('✅ Updated mcp_packages');
    }
    // Update mcp_tools
    if (tools.length > 0) {
      // Remove old tools for this package
      await supabase.from('mcp_tools').delete().eq('package_id', request.packageId);
      for (const tool of tools) {
        await supabase.from('mcp_tools').upsert({
          package_id: request.packageId,
          tool_name: tool.name,
          description: tool.description || null,
          input_schema: tool.inputSchema || null,
          output_schema: tool.outputSchema || null
        });
      }
      log('✅ Updated mcp_tools');
    }
    return {
      success: true,
      deploymentUrl: cloudRunResult.deploymentUrl,
      serviceName: cloudRunResult.serviceName,
      securityReport: cloudRunResult.securityReport
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (onLog) onLog('❌ Redeploy failed: ' + msg);
    return {
      success: false,
      error: msg
    };
  }
}