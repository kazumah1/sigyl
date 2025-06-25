import express from 'express';
import { signGitHubAppJWT, getInstallationAccessToken, listRepos } from '../services/githubAppAuth';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/github/callback', async (req, res) => {
  try {
    const installationId = Number(req.query.installation_id);
    const code = req.query.code as string;
    if (!installationId || !code) return res.status(400).json({ error: 'Missing installation_id or code' });

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
    if (!tokenData.access_token) return res.status(400).json({ error: 'Failed to exchange code for token', details: tokenData });

    // Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // Get installation token and repos
    const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
    const installToken = await getInstallationAccessToken(jwt, installationId);
    const repos = await listRepos(installToken);

    // Optionally associate install with your user system here

    res.json({
      installationId,
      user,
      repos,
      access_token: tokenData.access_token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GitHub App callback failed' });
  }
});

export default router;