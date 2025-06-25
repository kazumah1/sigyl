import jwt from 'jsonwebtoken';
import { Octokit } from 'octokit';

export function signGitHubAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iat: now, exp: now + 600, iss: appId },
    privateKey,
    { algorithm: 'RS256' }
  );
}

export async function getInstallationAccessToken(appJwt: string, installationId: number): Promise<string> {
  const octokit = new Octokit({ auth: appJwt });
  const res = await octokit.request("POST /app/installations/{installation_id}/access_tokens", {
    installation_id: installationId
  });
  return res.data.token;
}

export async function listRepos(token: string) {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();
  return data.repositories;
}