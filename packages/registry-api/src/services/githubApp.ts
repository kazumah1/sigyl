import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string | undefined;
}

export interface InstallationInfo {
  installationId: number;
  account: {
    login: string;
    type: string;
  };
  repositories: Array<{
    id: number;
    name: string;
    private: boolean;
    permissions: Record<string, string>;
  }>;
}

export class GitHubAppService {
  private config: GitHubAppConfig;
  private octokit: Octokit;

  constructor(config: GitHubAppConfig) {
    this.config = config;
    this.octokit = new Octokit({
      auth: this.generateJWT(),
    });
  }

  /**
   * Generate JWT for GitHub App authentication
   */
  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + 600, // 10 minutes
      iss: this.config.appId,
    };

    return jwt.sign(payload, this.config.privateKey, { algorithm: 'RS256' });
  }

  /**
   * Get installation access token for a specific installation
   */
  async getInstallationToken(installationId: number): Promise<string> {
    try {
      const response = await this.octokit.request(
        `POST /app/installations/${installationId}/access_tokens`,
        {
          headers: {
            authorization: `Bearer ${this.generateJWT()}`,
            accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data.token;
    } catch (error) {
      console.error('Error getting installation token:', error);
      throw new Error(`Failed to get installation token: ${error}`);
    }
  }

  /**
   * Create Octokit instance with installation token
   */
  async createInstallationOctokit(installationId: number): Promise<Octokit> {
    const token = await this.getInstallationToken(installationId);
    return new Octokit({ auth: token });
  }

  /**
   * Get repository contents using installation token
   */
  async getRepositoryContents(
    installationId: number,
    owner: string,
    repo: string,
    path: string = 'mcp.yaml',
    ref: string = 'main'
  ): Promise<any> {
    try {
      const octokit = await this.createInstallationOctokit(installationId);
      
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File ${path} not found in repository ${owner}/${repo}`);
      }
      throw new Error(`Failed to get repository contents: ${error.message}`);
    }
  }

  /**
   * List repositories accessible to an installation
   */
  async listInstallationRepositories(installationId: number): Promise<any[]> {
    try {
      const octokit = await this.createInstallationOctokit(installationId);
      
      const response = await octokit.apps.listReposAccessibleToInstallation({
        installation_id: installationId,
      });

      return response.data.repositories;
    } catch (error) {
      console.error('Error listing installation repositories:', error);
      throw new Error(`Failed to list installation repositories: ${error}`);
    }
  }

  /**
   * Check if a repository has MCP configuration files
   */
  async checkForMCPFiles(
    installationId: number,
    owner: string,
    repo: string
  ): Promise<{ hasMCP: boolean; files: string[] }> {
    const mcpFilePaths = [
      'mcp.yaml',
      'mcp.yml',
      '.mcp.yaml',
      '.mcp.yml',
      'config/mcp.yaml',
      'config/mcp.yml',
    ];

    const foundFiles: string[] = [];

    for (const path of mcpFilePaths) {
      try {
        await this.getRepositoryContents(installationId, owner, repo, path);
        foundFiles.push(path);
      } catch (error) {
        // File not found, continue checking other paths
        continue;
      }
    }

    return {
      hasMCP: foundFiles.length > 0,
      files: foundFiles,
    };
  }

  /**
   * Get installation information
   */
  async getInstallationInfo(installationId: number): Promise<InstallationInfo> {
    try {
      const response = await this.octokit.request(
        `GET /app/installations/${installationId}`,
        {
          headers: {
            authorization: `Bearer ${this.generateJWT()}`,
            accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting installation info:', error);
      throw new Error(`Failed to get installation info: ${error}`);
    }
  }
} 