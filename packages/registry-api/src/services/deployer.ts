import { RailwayService, RailwayConfig, RailwayDeploymentRequest } from '@sigil/container-builder';
import { supabase } from '../config/database';
import { decrypt } from '../utils/encryption';

// Railway configuration
const RAILWAY_CONFIG: RailwayConfig = {
  apiToken: process.env.RAILWAY_API_TOKEN || '',
  ...(process.env.RAILWAY_API_URL && { apiUrl: process.env.RAILWAY_API_URL })
};

export interface DeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch?: string;
  env: Record<string, string>;
  userId?: string;
  selectedSecrets?: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  serviceId?: string;
  error?: string;
  securityReport?: any;
}

/**
 * Fetch and decrypt user secrets from database
 */
async function fetchUserSecrets(userId: string, selectedSecrets?: string[]): Promise<Record<string, string>> {
  try {
    let secretsQuery = supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId);
    
    // If specific secrets are selected, filter by them
    if (selectedSecrets && selectedSecrets.length > 0) {
      secretsQuery = secretsQuery.in('id', selectedSecrets);
    }
    
    const { data: secrets, error } = await secretsQuery;
    
    if (error) {
      console.warn('Failed to fetch secrets:', error);
      return {};
    }
    
    if (!secrets || secrets.length === 0) {
      return {};
    }
    
    // Decrypt secrets and return as environment variables
    const decryptedSecrets = secrets.map((secret: { key: string; value: string }) => ({
      key: secret.key,
      value: decrypt(secret.value)
    }));
    
    return Object.fromEntries(decryptedSecrets.map((s: { key: string; value: string }) => [s.key, s.value]));
    
  } catch (error) {
    console.error('Error fetching user secrets:', error);
    return {};
  }
}

/**
 * Deploy MCP repository to Railway with security validation and secrets management
 */
export async function deployRepo(request: DeploymentRequest): Promise<DeploymentResult> {
  try {
    console.log('🚀 Starting Railway deployment for:', request.repoName);

    // Check if Railway API token is configured
    if (!RAILWAY_CONFIG.apiToken) {
      throw new Error('Railway API token not configured. Set RAILWAY_API_TOKEN environment variable.');
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

    // Initialize Railway service
    const railwayService = new RailwayService(RAILWAY_CONFIG);

    // Prepare Railway deployment request with MCP-specific configuration
    const railwayRequest: RailwayDeploymentRequest = {
      repoUrl: request.repoUrl,
      repoName: request.repoName,
      branch: request.branch || 'main',
      environmentVariables: {
        ...deploymentEnv,
        // MCP-specific environment variables
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp',
        FORCE_HTTPS: 'true',
        SESSION_SECURE: 'true',
        REQUIRE_TOKEN_VALIDATION: 'true'
      }
    };

    console.log('🔒 Deploying with security validation...');

    // Deploy to Railway with integrated security validation
    const railwayResult = await railwayService.deployMCPServer(railwayRequest);

    if (!railwayResult.success) {
      console.error('❌ Railway deployment failed:', railwayResult.error);
      return {
        success: false,
        error: railwayResult.error || 'Railway deployment failed',
        securityReport: railwayResult.securityReport
      };
    }

    console.log('✅ Successfully deployed to Railway:', railwayResult.deploymentUrl);
    console.log('🔗 MCP endpoint available at:', `${railwayResult.deploymentUrl}/mcp`);

    return {
      success: true,
      ...(railwayResult.deploymentUrl && { deploymentUrl: railwayResult.deploymentUrl }),
      ...(railwayResult.serviceId && { serviceId: railwayResult.serviceId }),
      ...(railwayResult.securityReport && { securityReport: railwayResult.securityReport })
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
      id: result.serviceId
    }
  };
}
  