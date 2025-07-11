// GitHub App service for installation flow and repository access
export interface GitHubAppInstallation {
  id: number
  account: {
    login: string
    type: string
  }
  permissions: Record<string, string>
  repositories: GitHubAppRepository[]
}

export interface GitHubAppRepository {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  html_url: string
  pushed_at: string | null
  has_mcp: boolean
  has_sigyl: boolean
  mcp_files: string[]
  mcp_config?: {
    name: string
    description: string
    version: string
    port: number
    tools_count: number
    required_secrets: any[]
  } | null
  sigyl_config?: {
    runtime: 'node' | 'container'
    language?: 'typescript' | 'javascript'
    entryPoint?: string
    hasStartCommand: boolean
  } | null
}

export interface MCPMetadata {
  name: string
  description: string
  port: number
  tools: MCPTool[]
  version?: string
  author?: string
}

export interface MCPTool {
  name: string
  description: string
  input_schema: object
  output_schema: object
}

// Configuration for the GitHub App
const GITHUB_APP_CONFIG = {
  appId: import.meta.env.VITE_GITHUB_APP_ID || '1459404',
  appName: import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev',
  registryApiUrl: import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1',
}

/**
 * Get the GitHub App installation URL with OAuth on install
 * This will redirect users to GitHub to install the app and authenticate
 */
export function getGitHubAppInstallUrl(state?: string): string {
  const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev';
  const backendCallback = import.meta.env.VITE_REGISTRY_API_URL + '/github/callback';
  const stateParam = state || encodeURIComponent(window.location.origin + '/post-install-login');
  return `https://github.com/apps/${appName}/installations/new?state=${stateParam}&request_oauth_on_install=true&redirect_uri=${encodeURIComponent(backendCallback)}`;
}

/**
 * Handle the GitHub App callback from the registry-api
 * This should be called when the user returns from GitHub App installation
 */
export async function handleGitHubAppCallback(installationId: string, code: string): Promise<{
  installationId: number;
  user: any;
  repos: any[];
  access_token: string;
}> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/callback?installation_id=${installationId}&code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub App callback failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error handling GitHub App callback:', error);
    throw error;
  }
}

/**
 * Check if user has GitHub App installed by checking URL parameters
 * This should be called on page load to handle the callback
 */
export function checkForGitHubAppCallback(): { 
  installationId: string | null; 
  code: string | null;
  user: any | null;
  access_token: string | null;
  state: string | null;
} {
  const urlParams = new URLSearchParams(window.location.search);
  const installationId = urlParams.get('installation_id');
  const code = urlParams.get('code');
  const userParam = urlParams.get('user');
  const accessToken = urlParams.get('access_token');
  const state = urlParams.get('state');
  
  let user = null;
  if (userParam) {
    try {
      user = JSON.parse(userParam);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  return { installationId, code, user, access_token: accessToken, state };
}

/**
 * Fetch repositories using GitHub App installation token
 * This requires the user to have installed the GitHub App
 */
export async function fetchRepositoriesWithApp(installationId: number): Promise<GitHubAppRepository[]> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/installations/${installationId}/repositories`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error fetching repositories with GitHub App:', error)
    throw error
  }
}

/**
 * Get MCP configuration from a specific repository using GitHub App
 */
export async function getMCPConfigWithApp(
  installationId: number,
  owner: string,
  repo: string
): Promise<MCPMetadata | null> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/installations/${installationId}/repositories/${owner}/${repo}/mcp`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // No MCP configuration found
      }
      throw new Error(`Failed to get MCP config: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data?.content || null
  } catch (error) {
    console.error('Error getting MCP config with GitHub App:', error)
    throw error
  }
}

/**
 * Deploy an MCP from a repository using GitHub App
 */
export async function deployMCPWithApp(
  installationId: number,
  owner: string,
  repo: string,
  branch: string = 'main',
  userId?: string,
  subdirectory?: string
): Promise<any> {
  try {
    const repoUrl = `https://github.com/${owner}/${repo}`;
    
    console.log('🚀 Deploying MCP with GitHub App:', {
      installationId,
      owner,
      repo,
      branch,
      repoUrl,
      userId,
      subdirectory
    });
    
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/installations/${installationId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repoUrl,
        owner,
        repo,
        branch,
        ...(userId ? { userId } : {}),
        ...(subdirectory ? { subdirectory } : {})
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to deploy MCP: ${response.status} ${response.statusText}`;
      
      // Try to get error details from response body
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        console.error('❌ Deployment error details:', errorData);
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json()
    console.log('✅ Deployment successful:', data);
    return data
  } catch (error) {
    console.error('Error deploying MCP with GitHub App:', error)
    throw error
  }
}

/**
 * Get installation information
 */
export async function getInstallationInfo(installationId: number): Promise<GitHubAppInstallation | null> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/installations/${installationId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get installation info: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || null
  } catch (error) {
    console.error('Error getting installation info:', error)
    throw error
  }
}

/**
 * Check if user has GitHub App installed
 * This would typically check your backend for stored installation data
 */
export async function checkGitHubAppInstallation(userId: string): Promise<number | null> {
  try {
    // This would call your backend to check if the user has an installation
    // For now, return null to indicate no installation
    return null
  } catch (error) {
    console.error('Error checking GitHub App installation:', error)
    return null
  }
}

/**
 * Store GitHub App installation data
 * This would typically call your backend to store the installation
 */
export async function storeGitHubAppInstallation(
  userId: string,
  installationId: number,
  accountLogin: string
): Promise<void> {
  try {
    // This would call your backend to store the installation data
    console.log('Storing GitHub App installation:', { userId, installationId, accountLogin })
  } catch (error) {
    console.error('Error storing GitHub App installation:', error)
    throw error
  }
}

/**
 * Check if a GitHub username has an existing installation
 */
export async function checkExistingInstallation(githubUsername: string): Promise<{
  hasInstallation: boolean;
  installationId?: number;
  githubUsername?: string;
}> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/check-installation/${githubUsername}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check installation: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking existing installation:', error);
    throw error;
  }
}

/**
 * Get OAuth URL for existing installation
 */
export async function getOAuthUrlForExistingInstallation(
  installationId: number,
  redirectUri?: string,
  state?: string
): Promise<string> {
  try {
    const params = new URLSearchParams();
    if (redirectUri) params.append('redirect_uri', redirectUri);
    if (state) params.append('state', state);

    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/github/oauth-url/${installationId}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get OAuth URL: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.oauthUrl;
  } catch (error) {
    console.error('Error getting OAuth URL for existing installation:', error);
    throw error;
  }
} 