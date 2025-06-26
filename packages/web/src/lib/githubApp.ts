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
  has_mcp: boolean
  mcp_files: string[]
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
  registryApiUrl: import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000',
}

/**
 * Get the GitHub App installation URL with OAuth on install
 * This will redirect users to GitHub to install the app and authenticate
 */
export function getGitHubAppInstallUrl(state?: string): string {
  let url = `https://github.com/apps/${GITHUB_APP_CONFIG.appName}/installations/new?request_oauth_on_install=true`;
  if (state) url += `&state=${state}`;
  return url;
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
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/api/v1/github/callback?installation_id=${installationId}&code=${code}`, {
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
} {
  const urlParams = new URLSearchParams(window.location.search);
  const installationId = urlParams.get('installation_id');
  const code = urlParams.get('code');
  const userParam = urlParams.get('user');
  const accessToken = urlParams.get('access_token');
  
  let user = null;
  if (userParam) {
    try {
      user = JSON.parse(userParam);
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  return { installationId, code, user, access_token: accessToken };
}

/**
 * Fetch repositories using GitHub App installation token
 * This requires the user to have installed the GitHub App
 */
export async function fetchRepositoriesWithApp(installationId: number): Promise<GitHubAppRepository[]> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/api/v1/github/installations/${installationId}/repositories`, {
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
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/api/v1/github/installations/${installationId}/repositories/${owner}/${repo}/mcp`, {
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
  branch: string = 'main'
): Promise<any> {
  try {
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/api/v1/github/installations/${installationId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner,
        repo,
        branch,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to deploy MCP: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
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
    const response = await fetch(`${GITHUB_APP_CONFIG.registryApiUrl}/api/v1/github/installations/${installationId}`, {
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