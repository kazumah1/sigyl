import { CloudRunService, CloudRunConfig, CloudRunDeploymentRequest, SigylConfigUnion } from '@sigil/container-builder';
import { supabase } from '../config/database';
import { decrypt } from '../utils/encryption';
import { fetchSigylYaml, SigylConfig } from './yaml';

// Google Cloud Run configuration
const CLOUD_RUN_CONFIG: CloudRunConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || '',
  keyFilePath: process.env.GOOGLE_CLOUD_KEY_FILE_PATH || ''
};

export interface DeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch?: string;
  env: Record<string, string>;
  userId?: string;
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
 * Generate default Sigyl configuration for Node.js runtime
 */
function generateDefaultSigylConfig(): SigylConfig {
  return {
    runtime: 'node',
    language: 'javascript',
    entryPoint: 'server.js',
    env: {
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'http',
      MCP_ENDPOINT: '/mcp'
    }
  };
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
    try {
      console.log('📋 Fetching sigyl.yaml configuration...');
      sigylConfig = await fetchSigylYaml(owner, repo, request.branch || 'main', request.githubToken);
      console.log('✅ Found sigyl.yaml configuration:', sigylConfig.runtime);
    } catch (error) {
      console.warn('⚠️ Could not fetch sigyl.yaml, generating default Node.js configuration');
      // Generate default configuration for Node.js runtime
      sigylConfig = generateDefaultSigylConfig();
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
    const cloudRunService = new CloudRunService(CLOUD_RUN_CONFIG);

    // Prepare Cloud Run deployment request with Sigyl configuration
    const cloudRunRequest: CloudRunDeploymentRequest = {
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: {
        ...deploymentEnv,
        // Add sigyl.yaml environment variables
        ...sigylConfig.env,
        // Ensure required MCP variables are set
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp',
        PORT: '8080'
      },
      // Pass the sigyl configuration with proper casting
      sigylConfig: sigylConfig as SigylConfigUnion
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
  