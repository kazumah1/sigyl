import express from 'express';
import { signGitHubAppJWT, getInstallationAccessToken, listRepos } from '../services/githubAppAuth';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/callback', async (req, res) => {
  try {
    const installationId = Number(req.query.installation_id);
    const code = req.query.code as string;
    const state = req.query.state as string; // This should contain the redirect URL
    
    if (!installationId || !code) {
      return res.status(400).json({ error: 'Missing installation_id or code' });
    }

    // Exchange code for OAuth access token
    const clientId = process.env.GITHUB_APP_ID;
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

export default router;