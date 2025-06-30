import express from 'express';
import { signGitHubAppJWT, getInstallationAccessToken, listRepos } from '../services/githubAppAuth';
import { UserInstallationService } from '../services/userInstallationService';
import { InstallationService } from '../services/installationService';
import { fetchMCPYaml, fetchSigylYaml } from '../services/yaml';
import fetch from 'node-fetch';
import { authenticate } from '../middleware/authMiddleware';
import { db } from '../db';

interface GitHubTokenResponse {
  access_token: string;
  expires_in?: number;
  token_type: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  type?: string;
}

interface GitHubOrg {
  name?: string;
  login: string;
}

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
    return res.status(500).json({ error: 'Failed to check installation' });
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
    return res.status(500).json({ error: 'Failed to generate OAuth URL' });
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
    const tokenData = await tokenRes.json() as GitHubTokenResponse;
    console.log('GitHub token exchange response:', tokenData);
    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'Failed to exchange code for token', details: tokenData });
    }

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json() as GitHubUser;

    // Fetch installation info to determine if this is an org and get org display name
    let accountLogin = user.login;
    let accountType = user.type || 'User';
    if (user.type === 'Organization' || user.type === 'Bot') {
      // If the user is an org, fetch the org details for display name
      try {
        const orgRes = await fetch(`https://api.github.com/orgs/${user.login}`, {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
        if (orgRes.ok) {
          const org = await orgRes.json() as GitHubOrg;
          console.log('Fetched org details:', org); // Debug log
          if (org.name) {
            accountLogin = org.name;
          }
        } else {
          const errorText = await orgRes.text();
          console.error('Failed to fetch org details:', orgRes.status, errorText);
        }
      } catch (err) {
        console.error('Error fetching org details:', err);
      }
      accountType = 'Organization';
    }

    // Get installation token and repos
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, installationId);
    const repos = await listRepos(installToken);

    // Store user profile in profiles table
    let profileId = null;
    let supabaseUserId = null;
    try {
      // Try to find an existing profile by github_id or email to get the Supabase user ID
      const { data: existingProfile } = await userInstallationService.supabase
        .from('profiles')
        .select('id')
        .or(`github_id.eq.${user.id},email.eq.${user.email}`)
        .single();
      if (existingProfile && existingProfile.id) {
        supabaseUserId = existingProfile.id;
      }
      const { data: profile, error: profileError } = await userInstallationService.supabase
        .from('profiles')
        .upsert({
          id: supabaseUserId || undefined,
          email: user.email || `${user.login}@users.noreply.github.com`,
          username: user.login,
          full_name: user.name,
          avatar_url: user.avatar_url,
          github_username: user.login,
          github_id: user.id,
          github_installation_id: installationId,
          github_app_installed: true,
          auth_user_id: supabaseUserId || undefined,
        }, { onConflict: 'github_id' })
        .select()
        .single();

      console.log('Profile upsert result:', profile, profileError);

      if (profile && profile.id) {
        profileId = profile.id;
      } else {
        // Fallback: fetch the profile by github_id
        const { data: foundProfile, error: fetchError } = await userInstallationService.supabase
          .from('profiles')
          .select('id')
          .eq('github_id', user.id)
          .single();
        if (foundProfile && foundProfile.id) {
          profileId = foundProfile.id;
        } else {
          console.error('Could not find profile after upsert:', fetchError);
        }
      }
    } catch (error) {
      console.error('Error storing user profile:', error);
    }

    if (profileId) {
      // Store installation in github_installations table first
      try {
        await installationService.upsertInstallation({
          installation_id: installationId,
          account_login: accountLogin,
          account_type: accountType,
          repositories: repos.map((repo: any) => repo.full_name),
          profile_id: profileId,
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
          profile_id?: string | null;
        } = {
          user_id: `github_${user.id}`,
          github_username: user.login,
          installation_id: installationId,
          access_token: tokenData.access_token,
          profile_id: profileId,
        };

        if (tokenData.expires_in) {
          installationData.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        }

        await userInstallationService.upsertUserInstallation(installationData);
      } catch (error) {
        console.error('Error storing user installation:', error);
        // Continue even if storage fails
      }
    } else {
      console.error('No valid profileId, skipping installation upserts.');
    }

    // Prepare the data to send to frontend
    const callbackData = {
      installationId,
      user,
      repos,
      access_token: tokenData.access_token,
      account_login: accountLogin,
      account_type: accountType
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
    
    console.log('=== GET REPOSITORIES DEBUG ===');
    console.log('Requested installation ID:', installationId);
    console.log('GitHub App ID:', process.env.GITHUB_APP_ID);
    console.log('GitHub Private Key present:', !!process.env.GITHUB_PRIVATE_KEY);
    console.log('GitHub Private Key length:', process.env.GITHUB_PRIVATE_KEY?.length || 0);
    
    if (!installationId) {
      return res.status(400).json({ error: 'Installation ID is required' });
    }

    if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
      console.error('Missing GitHub App credentials');
      return res.status(500).json({ 
        success: false,
        error: 'Server configuration error',
        message: 'GitHub App credentials not configured'
      });
    }

    // Get installation token
    console.log('Generating JWT for GitHub App...');
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    console.log('JWT generated successfully');
    
    console.log('Requesting installation access token for installation:', installationId);
    const installToken = await getInstallationAccessToken(jwt, Number(installationId));
    console.log('Installation access token received');
    
    // Fetch repositories from GitHub
    console.log('Fetching repositories...');
    const repos = await listRepos(installToken);
    console.log('Repositories fetched successfully, count:', repos.length);
    
    // Check for MCP files in each repository
    const reposWithMCP = await Promise.all(
      repos.map(async (repo: any) => {
        try {
          const [owner, repoName] = repo.full_name.split('/');
          
          // Check for both MCP and Sigyl configurations
          let mcpConfig = null;
          let sigylConfig = null;
          let hasMcp = false;
          let hasSigyl = false;
          let configFiles: string[] = [];
          
          // Try to fetch MCP config
          try {
            mcpConfig = await fetchMCPYaml(owner, repoName, 'main', installToken);
            hasMcp = true;
            configFiles.push('mcp.yaml');
          } catch (error) {
            // MCP config not found or invalid
          }
          
          // Try to fetch Sigyl config
          try {
            sigylConfig = await fetchSigylYaml(owner, repoName, 'main', installToken);
            hasSigyl = true;
            configFiles.push('sigyl.yaml');
          } catch (error) {
            // Sigyl config not found or invalid
          }
          
          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            has_mcp: hasMcp,
            has_sigyl: hasSigyl,
            mcp_files: configFiles,
            mcp_config: mcpConfig ? {
              name: mcpConfig.name,
              description: mcpConfig.description,
              version: mcpConfig.version,
              port: mcpConfig.port,
              tools_count: mcpConfig.tools?.length || 0,
              required_secrets: mcpConfig.secrets || []
            } : null,
            sigyl_config: sigylConfig ? {
              runtime: sigylConfig.runtime,
              language: sigylConfig.language,
              entryPoint: sigylConfig.entryPoint,
              hasStartCommand: !!sigylConfig.startCommand
            } : null
          };
        } catch (error) {
          // If config fetch fails, assume no configs
          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            has_mcp: false,
            has_sigyl: false,
            mcp_files: [],
            mcp_config: null,
            sigyl_config: null
          };
        }
      })
    );

    res.json({
      success: true,
      data: reposWithMCP
    });
  } catch (error) {
    console.error('=== REPOSITORIES ERROR ===');
    console.error('Error fetching repositories:', error);
    
    // Enhanced error response
    let errorMessage = 'Failed to fetch repositories';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('Not Found')) {
        errorMessage = 'GitHub App installation not found';
        errorDetails = `Installation ID ${req.params.installationId} does not exist or the GitHub App does not have access to it. This could mean:\n` +
                      '1. The GitHub App was uninstalled\n' +
                      '2. The installation ID is incorrect\n' +
                      '3. The GitHub App credentials are wrong\n' +
                      '4. The installation belongs to a different GitHub App';
      } else if (error.message.includes('Bad credentials')) {
        errorMessage = 'GitHub App authentication failed';
        errorDetails = 'Invalid GitHub App ID or private key';
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      message: errorDetails,
      installationId: req.params.installationId,
      githubAppId: process.env.GITHUB_APP_ID,
      hasPrivateKey: !!process.env.GITHUB_PRIVATE_KEY
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
        content: mcpConfig,
        required_secrets: mcpConfig.secrets || []
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

// Deploy MCP from GitHub repository
router.post('/installations/:installationId/deploy', async (req, res) => {
  try {
    const { installationId } = req.params;
    const { repoUrl, owner, repo, branch = 'main', userId, selectedSecrets, environmentVariables = {} } = req.body;
    
    console.log('📝 Deployment request received:', {
      installationId,
      repoUrl,
      owner,
      repo,
      branch,
      userId,
      selectedSecrets: selectedSecrets ? Object.keys(selectedSecrets) : [],
      environmentVariables: environmentVariables ? Object.keys(environmentVariables) : []
    });
    
    if (!installationId || !repoUrl || !owner || !repo) {
      console.error('❌ Missing required fields:', {
        installationId: !!installationId,
        repoUrl: !!repoUrl,
        owner: !!owner,
        repo: !!repo
      });
      
      return res.status(400).json({ 
        success: false,
        error: 'Installation ID, repository URL, owner, and repo are required' 
      });
    }

    console.log(`🚀 Starting deployment for ${owner}/${repo} via GitHub App installation ${installationId}`);

    // Get installation token
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, Number(installationId));

    // Import deployment service
    const { deployRepo } = await import('../services/deployer');

    // Prepare deployment request
    const deploymentRequest = {
      repoUrl,
      repoName: `${owner}/${repo}`,
      branch,
      env: environmentVariables,
      userId,
      selectedSecrets,
      githubToken: installToken
    };

    console.log('📦 Deploying with request:', {
      repoUrl,
      repoName: `${owner}/${repo}`,
      branch,
      hasGithubToken: !!installToken
    });

    // Deploy to Google Cloud Run
    const deploymentResult = await deployRepo(deploymentRequest);

    if (!deploymentResult.success) {
      console.error('❌ Deployment failed:', deploymentResult.error);
      
      return res.status(500).json({
        success: false,
        error: deploymentResult.error || 'Deployment failed',
        securityReport: deploymentResult.securityReport
      });
    }

    console.log('✅ Deployment successful:', deploymentResult.deploymentUrl);

    // Return success response with package ID
    res.json({
      success: true,
      packageId: deploymentResult.packageId,
      deploymentUrl: deploymentResult.deploymentUrl,
      serviceName: deploymentResult.serviceName,
      mcpEndpoint: `${deploymentResult.deploymentUrl}/mcp`,
      securityReport: deploymentResult.securityReport
    });

  } catch (error) {
    console.error('❌ GitHub App deployment error:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deployment error'
    });
  }
});

// In the route that handles /github/associate-installation
router.post('/github/associate-installation', authenticate, async (req, res) => {
  try {
    const { installationId } = req.body;
    const userId = req.user?.id; // Supabase Auth UUID or github_12345
    if (!userId || !installationId) {
      console.error('[associate-installation] Missing userId or installationId', { userId, installationId });
      return res.status(400).json({ error: 'Missing user ID or installationId' });
    }
    const githubId = /^github_/.test(userId) ? userId.replace('github_', '') : null;
    const updateFields = {
      github_app_installed: true,
      github_installation_id: installationId,
      auth_user_id: userId
    };
    let upsertResult;
    if (githubId) {
      // Upsert by github_id
      console.log(`[associate-installation] Upserting by github_id: ${githubId}`, { updateFields });
      upsertResult = await db('profiles')
        .insert({
          github_id: githubId,
          ...updateFields
        })
        .onConflict('github_id')
        .merge(updateFields)
        .returning('*');
      console.log('[associate-installation] Upsert result (github_id):', upsertResult);
    } else {
      // Upsert by id (UUID)
      console.log(`[associate-installation] Upserting by id: ${userId}`, { updateFields });
      upsertResult = await db('profiles')
        .insert({
          id: userId,
          ...updateFields
        })
        .onConflict('id')
        .merge(updateFields)
        .returning('*');
      console.log('[associate-installation] Upsert result (id):', upsertResult);
    }
    return res.json({ success: true, upsertResult });
  } catch (err) {
    console.error('Error associating GitHub App installation:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
});

export default router;