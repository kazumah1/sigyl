import { supabase } from '../config/database';
import crypto from 'crypto';
import type { 
  APIUser, 
  APIKey, 
  CreateAPIKeyRequest, 
  AuthenticatedUser, 
  APIKeyUsage,
  APIKeyStats,
  Permission 
} from '../types';

export class APIKeyService {
  private static readonly KEY_PREFIX = 'sk_';
  private static readonly KEY_LENGTH = 32;
  private static readonly PREFIX_LENGTH = 8;

  /**
   * Generate a new API key
   */
  static generateAPIKey(): string {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    return this.KEY_PREFIX + randomBytes.toString('hex');
  }

  /**
   * Hash an API key for storage
   */
  static hashAPIKey(apiKey: string): string {
    return crypto.createHmac('sha256', 'sigyl-api-secret').update(apiKey).digest('hex');
  }

  /**
   * Get key prefix for display
   */
  static getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, this.PREFIX_LENGTH);
  }

  /**
   * Create or get a user by email
   */
  static async createOrGetUser(email: string, name: string, githubId?: string): Promise<APIUser> {
    const { data: existingUser } = await supabase
      .from('api_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return existingUser as APIUser;
    }

    const { data: newUser, error: insertError } = await supabase
      .from('api_users')
      .insert({
        email,
        name,
        github_id: githubId
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create user: ${insertError.message}`);
    }

    return newUser as APIUser;
  }

  /**
   * Create a new API key for a user
   */
  static async createAPIKey(
    userId: string, 
    request: CreateAPIKeyRequest
  ): Promise<{ apiKey: string; keyData: APIKey }> {
    const apiKey = this.generateAPIKey();
    const keyHash = this.hashAPIKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);

    const { data: keyData, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: request.name,
        permissions: request.permissions || ['read'],
        expires_at: request.expires_at || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return {
      apiKey,
      keyData: keyData as APIKey
    };
  }

  /**
   * Validate an API key and return user info
   */
  static async validateAPIKey(apiKey: string): Promise<AuthenticatedUser | null> {
    if (!apiKey.startsWith(this.KEY_PREFIX)) {
      return null;
    }

    const { data, error } = await supabase
      .rpc('validate_api_key', { api_key: apiKey });

    if (error || !data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      key_id: result.key_id,
      user_id: result.user_id,
      permissions: result.permissions,
      is_active: result.is_active
    };
  }

  /**
   * Get all API keys for a user
   */
  static async getUserAPIKeys(userId: string): Promise<APIKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get API keys: ${error.message}`);
    }

    return data as APIKey[];
  }

  /**
   * Get API key by ID
   */
  static async getAPIKey(keyId: string): Promise<APIKey | null> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as APIKey;
  }

  /**
   * Deactivate an API key
   */
  static async deactivateAPIKey(keyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to deactivate API key: ${error.message}`);
    }
  }

  /**
   * Delete an API key
   */
  static async deleteAPIKey(keyId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Log API key usage
   */
  static async logUsage(
    keyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const { error } = await supabase
      .rpc('log_api_key_usage', {
        p_key_id: keyId,
        p_endpoint: endpoint,
        p_method: method,
        p_status_code: statusCode,
        p_response_time_ms: responseTimeMs,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

    if (error) {
      console.error('Failed to log API key usage:', error);
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getAPIKeyStats(keyId: string, days: number = 30): Promise<APIKeyStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('key_id', keyId)
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to get API key stats: ${error.message}`);
    }

    const usage = data as APIKeyUsage[];
    const totalRequests = usage.length;
    const successfulRequests = usage.filter(u => u.status_code < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = usage.length > 0 
      ? usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length 
      : 0;
    const lastUsed = usage.length > 0 
      ? usage.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : '';

    return {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      average_response_time: Math.round(averageResponseTime),
      last_used: lastUsed
    };
  }

  /**
   * Check if user has required permissions
   */
  static hasPermission(userPermissions: string[], requiredPermissions: Permission[]): boolean {
    if (userPermissions.includes('admin')) {
      return true;
    }

    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<APIUser | null> {
    const { data, error } = await supabase
      .from('api_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as APIUser;
  }
} 