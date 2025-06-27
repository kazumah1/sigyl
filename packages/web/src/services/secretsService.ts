// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

export interface Secret {
  id: string;
  key: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSecretRequest {
  key: string;
  value: string;
  description?: string;
}

export interface UpdateSecretRequest {
  key?: string;
  value?: string;
  description?: string;
}

export interface SecretsResponse {
  success: boolean;
  data?: Secret[];
  error?: string;
}

export interface SecretResponse {
  success: boolean;
  data?: Secret;
  error?: string;
}

class SecretsService {
  /**
   * Get all secrets for the authenticated user
   */
  async getSecrets(): Promise<Secret[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch secrets: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch secrets:', error);
      return [];
    }
  }

  /**
   * Get a specific secret by ID
   */
  async getSecret(id: string): Promise<Secret | null> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch secret: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Failed to fetch secret:', error);
      return null;
    }
  }

  /**
   * Create a new secret
   */
  async createSecret(request: CreateSecretRequest): Promise<{ success: boolean; secret?: Secret; error?: string }> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `Failed to create secret: ${response.status}`
        };
      }

      return {
        success: true,
        secret: result.data
      };
    } catch (error) {
      console.error('Failed to create secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(id: string, request: UpdateSecretRequest): Promise<{ success: boolean; secret?: Secret; error?: string }> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `Failed to update secret: ${response.status}`
        };
      }

      return {
        success: true,
        secret: result.data
      };
    } catch (error) {
      console.error('Failed to update secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/secrets/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const result = await response.json();
        return {
          success: false,
          error: result.error || `Failed to delete secret: ${response.status}`
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete secret:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate secret key format
   */
  validateSecretKey(key: string): { valid: boolean; error?: string } {
    if (!key) {
      return { valid: false, error: 'Secret key is required' };
    }

    if (key.length < 1) {
      return { valid: false, error: 'Secret key must be at least 1 character long' };
    }

    if (key.length > 255) {
      return { valid: false, error: 'Secret key must be less than 255 characters' };
    }

    // Check for valid environment variable name format
    const envVarRegex = /^[A-Z][A-Z0-9_]*$/;
    if (!envVarRegex.test(key)) {
      return { 
        valid: false, 
        error: 'Secret key must be a valid environment variable name (uppercase letters, numbers, and underscores only, starting with a letter)' 
      };
    }

    return { valid: true };
  }

  /**
   * Validate secret value
   */
  validateSecretValue(value: string): { valid: boolean; error?: string } {
    if (!value) {
      return { valid: false, error: 'Secret value is required' };
    }

    if (value.length > 4096) {
      return { valid: false, error: 'Secret value must be less than 4096 characters' };
    }

    return { valid: true };
  }

  /**
   * Format secret key suggestions
   */
  formatSecretKey(input: string): string {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/^[^A-Z]/, 'API_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

export default new SecretsService(); 