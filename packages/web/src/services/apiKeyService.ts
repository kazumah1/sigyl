// API Key service for managing API keys
import { useAuth } from '@/contexts/AuthContext';

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1';

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  permissions?: string[];
  expires_at?: string;
}

export interface CreateAPIKeyResponse {
  api_key: string; // Only returned once
  key: APIKey;
}

export interface APIKeyStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  last_used: string;
}

export class APIKeyService {
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
   * Create a new API key
   */
  static async createAPIKey(token: string, request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create API key: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  }

  /**
   * Get all API keys for the current user
   */
  static async getAPIKeys(token: string): Promise<APIKey[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys`, {
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch API keys: ${response.status}`);
      }

      const result = await response.json();
      return result.data.keys;
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      throw error;
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getAPIKey(token: string, id: string): Promise<APIKey> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys/${id}`, {
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch API key: ${response.status}`);
      }

      const result = await response.json();
      return result.data.key;
    } catch (error) {
      console.error('Failed to fetch API key:', error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getAPIKeyStats(token: string, id: string, days: number = 30): Promise<APIKeyStats> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys/${id}/stats?days=${days}`, {
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch API key stats: ${response.status}`);
      }

      const result = await response.json();
      return result.data.stats;
    } catch (error) {
      console.error('Failed to fetch API key stats:', error);
      throw error;
    }
  }

  /**
   * Deactivate an API key
   */
  static async deactivateAPIKey(token: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys/${id}/deactivate`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to deactivate API key: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to deactivate API key:', error);
      throw error;
    }
  }

  /**
   * Delete an API key
   */
  static async deleteAPIKey(token: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete API key: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getUserProfile(token: string): Promise<any> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/keys/profile/me`, {
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch user profile: ${response.status}`);
      }

      const result = await response.json();
      return result.data.user;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }
} 