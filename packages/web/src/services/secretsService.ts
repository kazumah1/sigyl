// Secrets service for managing environment variables
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1';

export interface Secret {
  id: string;
  key: string;
  value?: string;
  description?: string;
  mcp_server_id?: string;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSecretRequest {
  key: string;
  value: string;
  description?: string;
  mcp_server_id?: string;
}

export interface UpdateSecretRequest {
  key?: string;
  value?: string;
  description?: string;
  mcp_server_id?: string;
}

export class SecretsService {
  /**
   * Get authentication headers for API requests
   */
  private static getAuthHeaders(token: string): HeadersInit {
    if (!token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all secrets for the current user
   */
  static async getSecrets(token: string, mcpServerId?: string): Promise<Secret[]> {
    try {
      const url = mcpServerId 
        ? `${REGISTRY_API_BASE}/secrets?mcp_server_id=${mcpServerId}`
        : `${REGISTRY_API_BASE}/secrets`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(token),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch secrets: ${response.status}`);
      }
      const result = await response.json();
      return result.data.secrets;
    } catch (error) {
      console.error('Failed to fetch secrets:', error);
      throw error;
    }
  }

  /**
   * Get a specific secret by ID
   */
  static async getSecret(token: string, id: string): Promise<Secret> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        headers: this.getAuthHeaders(token),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch secret: ${response.status}`);
      }
      const result = await response.json();
      return result.data.secret;
    } catch (error) {
      console.error('Failed to fetch secret:', error);
      throw error;
    }
  }

  /**
   * Create a new secret
   */
  static async createSecret(token: string, request: CreateSecretRequest): Promise<Secret> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create secret: ${response.status}`);
      }
      const result = await response.json();
      return result.data.secret;
    } catch (error) {
      console.error('Failed to create secret:', error);
      throw error;
    }
  }

  /**
   * Update an existing secret
   */
  static async updateSecret(token: string, id: string, request: UpdateSecretRequest): Promise<Secret> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update secret: ${response.status}`);
      }
      const result = await response.json();
      return result.data.secret;
    } catch (error) {
      console.error('Failed to update secret:', error);
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  static async deleteSecret(token: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete secret: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete secret:', error);
      throw error;
    }
  }

  /**
   * Get secrets as environment variables for MCP server deployment
   */
  static async getSecretsAsEnvVars(token: string, mcpServerId: string): Promise<Record<string, string>> {
    try {
      const secrets = await this.getSecrets(token, mcpServerId);
      const envVars: Record<string, string> = {};
      secrets.forEach(secret => {
        envVars[secret.key] = secret.value || '';
      });
      return envVars;
    } catch (error) {
      console.error('Failed to get secrets as env vars:', error);
      throw error;
    }
  }

  /**
   * Validate secret key format (environment variable name)
   */
  static validateSecretKey(key: string): boolean {
    // Environment variable names must be uppercase letters, numbers, and underscores
    // and cannot start with a number
    return /^[A-Z_][A-Z0-9_]*$/.test(key);
  }

  /**
   * Get common secret templates for popular services
   */
  static getCommonSecretTemplates(): Array<{ key: string; description: string; placeholder: string }> {
    return [
      { key: 'OPENAI_API_KEY', description: 'OpenAI API key for GPT models', placeholder: 'sk-...' },
      { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude models', placeholder: 'sk-ant-...' },
      { key: 'DATABASE_URL', description: 'Database connection string', placeholder: 'postgresql://...' },
      { key: 'REDIS_URL', description: 'Redis connection string', placeholder: 'redis://...' },
      { key: 'GITHUB_TOKEN', description: 'GitHub personal access token', placeholder: 'ghp_...' },
      { key: 'SLACK_BOT_TOKEN', description: 'Slack bot user OAuth token', placeholder: 'xoxb-...' },
      { key: 'DISCORD_BOT_TOKEN', description: 'Discord bot token', placeholder: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OQ...' },
      { key: 'TWITTER_API_KEY', description: 'Twitter API key', placeholder: 'your-twitter-api-key' },
      { key: 'TWITTER_API_SECRET', description: 'Twitter API secret', placeholder: 'your-twitter-api-secret' },
      { key: 'TWITTER_ACCESS_TOKEN', description: 'Twitter access token', placeholder: 'your-twitter-access-token' },
      { key: 'TWITTER_ACCESS_SECRET', description: 'Twitter access secret', placeholder: 'your-twitter-access-secret' },
    ];
  }

  /**
   * Get secrets for a specific MCP package (for pre-filling Connect form)
   */
  static async getPackageSecrets(token: string, packageName: string): Promise<Array<{ key: string; value: string; description?: string }>> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/package/${encodeURIComponent(packageName)}`, {
        headers: this.getAuthHeaders(token),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch package secrets: ${response.status}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch package secrets:', error);
      throw error;
    }
  }

  /**
   * Save secrets for a specific MCP package (from Connect popup)
   */
  static async savePackageSecrets(token: string, packageName: string, secrets: Array<{ key: string; value: string; description?: string }>): Promise<Array<{ id: string; key: string; description?: string; created_at: string }>> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/package/${encodeURIComponent(packageName)}`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ secrets }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save package secrets: ${response.status}`);
      }
      const result = await response.json();
      return result.data.secrets;
    } catch (error) {
      console.error('Failed to save package secrets:', error);
      throw error;
    }
  }
}
