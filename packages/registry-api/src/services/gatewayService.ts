import { APIKeyService } from './apiKeyService';
import { decrypt } from '../utils/encryption';
import { supabase } from '../config/database';

export interface GatewayRequest {
  mcpServerUrl: string;
  userApiKey: string;
  additionalConfig?: Record<string, any>;
}

export interface GatewayResponse {
  success: boolean;
  gatewayUrl?: string;
  error?: string;
}

export class GatewayService {
  /**
   * Create a gateway connection to an MCP server with user secrets injected
   */
  static async createGatewayConnection(request: GatewayRequest): Promise<GatewayResponse> {
    try {
      // Validate user API key and get user
      const authenticatedUser = await APIKeyService.validateAPIKey(request.userApiKey);
      if (!authenticatedUser) {
        return {
          success: false,
          error: 'Invalid API key'
        };
      }

      // Fetch user's secrets
      const userSecrets = await this.getUserSecrets(authenticatedUser.user_id);
      
      // Create gateway URL with secrets injected
      const gatewayUrl = await this.createGatewayUrl(
        request.mcpServerUrl,
        userSecrets,
        request.additionalConfig
      );

      return {
        success: true,
        gatewayUrl
      };

    } catch (error) {
      console.error('Gateway connection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway connection failed'
      };
    }
  }

  /**
   * Get user's secrets for injection into MCP server
   */
  private static async getUserSecrets(userId: string): Promise<Record<string, string>> {
    const { data: secrets, error } = await supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch user secrets: ${error.message}`);
    }

    // Decrypt and return secrets
    const decryptedSecrets: Record<string, string> = {};
    secrets?.forEach(secret => {
      decryptedSecrets[secret.key] = decrypt(secret.value);
    });

    return decryptedSecrets;
  }

  /**
   * Create a gateway URL that proxies to the MCP server with secrets injected
   */
  private static async createGatewayUrl(
    mcpServerUrl: string,
    userSecrets: Record<string, string>,
    additionalConfig?: Record<string, any>
  ): Promise<string> {
    // Create a unique gateway session
    const sessionId = this.generateSessionId();
    
    // Store the session with secrets (temporary, expires)
    await this.storeGatewaySession(sessionId, {
      mcpServerUrl,
      userSecrets,
      additionalConfig,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    });

    // Return gateway URL
    return `${process.env.SIGYL_API_BASE_URL}/gateway/${sessionId}`;
  }

  /**
   * Generate a unique session ID for the gateway
   */
  private static generateSessionId(): string {
    return `gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store gateway session in database or cache
   */
  private static async storeGatewaySession(
    sessionId: string,
    sessionData: {
      mcpServerUrl: string;
      userSecrets: Record<string, string>;
      additionalConfig?: Record<string, any>;
      expiresAt: Date;
    }
  ): Promise<void> {
    // Store in database for persistence
    const { error } = await supabase
      .from('gateway_sessions')
      .insert({
        id: sessionId,
        mcp_server_url: sessionData.mcpServerUrl,
        user_secrets: sessionData.userSecrets,
        additional_config: sessionData.additionalConfig,
        expires_at: sessionData.expiresAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to store gateway session: ${error.message}`);
    }
  }

  /**
   * Get gateway session by ID
   */
  static async getGatewaySession(sessionId: string): Promise<{
    mcpServerUrl: string;
    userSecrets: Record<string, string>;
    additionalConfig?: Record<string, any>;
  } | null> {
    const { data, error } = await supabase
      .from('gateway_sessions')
      .select('*')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return {
      mcpServerUrl: data.mcp_server_url,
      userSecrets: data.user_secrets,
      additionalConfig: data.additional_config
    };
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const { error } = await supabase
      .from('gateway_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Utility function for MCP servers to get environment variables
   * This can be used by MCP servers to access injected environment variables
   */
  static getEnvironmentVariable(key: string, defaultValue?: string): string | undefined {
    // Check for environment variables injected via headers
    const headerKey = `X-Secret-${key}`;
    const envKey = `X-Env-${key}`;
    
    // This would be called from within the MCP server context
    // The actual implementation depends on how the MCP server receives the request
    return process.env[key] || process.env[headerKey] || process.env[envKey] || defaultValue;
  }

  /**
   * Get all environment variables for the current request context
   * This is a helper for MCP servers to access all injected environment variables
   */
  static getAllEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Get all environment variables that start with X-Secret- or X-Env-
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('X-Secret-')) {
        const envKey = key.replace('X-Secret-', '');
        env[envKey] = process.env[key] || '';
      } else if (key.startsWith('X-Env-')) {
        const envKey = key.replace('X-Env-', '');
        env[envKey] = process.env[key] || '';
      }
    });
    
    return env;
  }
} 