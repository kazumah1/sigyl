import express from 'express';
import { signGitHubAppJWT, getInstallationAccessToken, listRepos } from '../services/githubAppAuth';
import { UserInstallationService } from '../services/userInstallationService';
import { InstallationService } from '../services/installationService';
import { fetchMCPYaml } from '../services/yaml';
import fetch from 'node-fetch';

const router = express.Router();
const userInstallationService = new UserInstallationService();
const installationService = new InstallationService();

// Check if user has existing installation
router.get('/check-installation/:githubUsername', async (req, res) => {
  try {
    const { githubUsername } = req.params;
    
    if (!githubUsername) {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    const installation = await userInstallationService.getInstallationByGitHubUsername(githubUsername);
    
    if (installation) {
      return res.json({
        hasInstallation: true,
        installationId: installation.installation_id,
        githubUsername: installation.github_username
      });
    } else {
      return res.json({
        hasInstallation: false
      });
    }
  } catch (error) {
    console.error('Error checking installation:', error);
    res.status(500).json({ error: 'Failed to check installation' });
  }
});

// Get OAuth URL for existing installation
router.get('/oauth-url/:installationId', async (req, res) => {
  try {
    const { installationId } = req.params;
    const redirect_uri = req.query.redirect_uri as string;
    const state = req.query.state as string;
    
    if (!installationId) {
      return res.status(400).json({ error: 'Installation ID is required' });
    }

    // For existing installations, we need to use a different OAuth flow
    // We'll redirect to GitHub's OAuth authorization URL with the installation context
    const clientId = process.env.VITE_GITHUB_CLIENT_ID;
    const redirectUrl = redirect_uri || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;
    const stateParam = state || Math.random().toString(36).substring(2, 15);
    
    // Use GitHub's OAuth authorization URL with installation context
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${stateParam}&scope=repo,user&installation_id=${installationId}`;
    
    res.json({ oauthUrl });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const installationId = Number(req.query.installation_id);
    const code = req.query.code as string;
    const state = req.query.state as string; // This should contain the redirect URL
    
    console.log('GitHub App callback received:', { installationId, code, state });
    if (!installationId || !code) {
      return res.status(400).json({ error: 'Missing installation_id or code' });
    }

    // Exchange code for OAuth access token
    const clientId = process.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      })
    });
    const tokenData = await tokenRes.json();
    console.log('GitHub token exchange response:', tokenData);
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Failed to exchange code for token', details: tokenData });
    }

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // Get installation token and repos
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, installationId);
    const repos = await listRepos(installToken);

    // Store installation in github_installations table first
    try {
      await installationService.upsertInstallation({
        installation_id: installationId,
        account_login: user.login,
        account_type: user.type || 'User',
        repositories: repos.map((repo: any) => repo.full_name)
      });
    } catch (error) {
      console.error('Error storing installation:', error);
      // Continue even if storage fails
    }

    // Store user installation in database
    try {
      const installationData: {
        user_id: string;
        github_username: string;
        installation_id: number;
        access_token?: string;
        token_expires_at?: string;
      } = {
        user_id: `github_${user.id}`,
        github_username: user.login,
        installation_id: installationId,
        access_token: tokenData.access_token,
      };

      if (tokenData.expires_in) {
        installationData.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      await userInstallationService.upsertUserInstallation(installationData);
    } catch (error) {
      console.error('Error storing user installation:', error);
      // Continue even if storage fails
    }

    // Prepare the data to send to frontend
    const callbackData = {
      installationId,
      user,
      repos,
      access_token: tokenData.access_token
    };

    // If we have a state parameter (redirect URL), redirect to frontend
    if (state) {
      const redirectUrl = decodeURIComponent(state);
      const params = new URLSearchParams({
        installation_id: installationId.toString(),
        code: code,
        user: JSON.stringify(user),
        access_token: tokenData.access_token
      });
      
      const finalUrl = `${redirectUrl}?${params.toString()}`;
      return res.redirect(finalUrl);
    }

    // Fallback: return JSON if no redirect URL
    return res.json(callbackData);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'GitHub App callback failed' });
  }
});

// Get repositories for an installation
router.get('/installations/:installationId/repositories', async (req, res) => {
  try {
    const { installationId } = req.params;
    
    if (!installationId) {
      return res.status(400).json({ error: 'Installation ID is required' });
    }

    // Get installation token
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, Number(installationId));
    
    // Fetch repositories from GitHub
    const repos = await listRepos(installToken);
    
    // Check for MCP files in each repository
    const reposWithMCP = await Promise.all(
      repos.map(async (repo: any) => {
        try {
          const [owner, repoName] = repo.full_name.split('/');
          const mcpConfig = await fetchMCPYaml(owner, repoName, 'main', installToken);
          
          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            has_mcp: !!mcpConfig,
            mcp_files: mcpConfig ? ['mcp.yaml', 'mcp.yml'] : []
          };
        } catch (error) {
          // If MCP config fetch fails, assume no MCP
          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            has_mcp: false,
            mcp_files: []
          };
        }
      })
    );

    res.json({
      success: true,
      data: reposWithMCP
    });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get MCP configuration for a specific repository
router.get('/installations/:installationId/repositories/:owner/:repo/mcp', async (req, res) => {
  try {
    const { installationId, owner, repo } = req.params;
    const { branch = 'main' } = req.query;
    
    if (!installationId || !owner || !repo) {
      return res.status(400).json({ error: 'Installation ID, owner, and repo are required' });
    }

    // Get installation token
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, Number(installationId));
    
    // Fetch MCP configuration
    const mcpConfig = await fetchMCPYaml(owner, repo, branch as string, installToken);
    
    if (!mcpConfig) {
      return res.status(404).json({
        success: false,
        error: 'MCP configuration not found',
        message: 'No MCP configuration found in this repository'
      });
    }

    res.json({
      success: true,
      data: {
        content: mcpConfig
      }
    });
  } catch (error) {
    console.error('Error fetching MCP configuration:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch MCP configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get installation information
router.get('/installations/:installationId', async (req, res) => {
  try {
    const { installationId } = req.params;
    
    if (!installationId) {
      return res.status(400).json({ error: 'Installation ID is required' });
    }

    // Get installation from database
    const installation = await installationService.getInstallation(Number(installationId));
    
    if (!installation) {
      return res.status(404).json({
        success: false,
        error: 'Installation not found',
        message: 'The specified installation does not exist'
      });
    }

    // Get installation token to fetch current repos
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, Number(installationId));
    const repos = await listRepos(installToken);

    res.json({
      success: true,
      data: {
        id: installation.installation_id,
        account: {
          login: installation.account_login,
          type: installation.account_type
        },
        permissions: {
          contents: 'read',
          metadata: 'read'
        },
        repositories: repos.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          description: repo.description,
          html_url: repo.html_url
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching installation info:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch installation info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;