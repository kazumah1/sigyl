import type {
  SDKConfig,
  MCPServer,
  MCPSearchQuery,
  MCPSearchResult,
  MCPTool,
  ServerWithDetails
} from './types';
import { searchMCP, getMCP, getAllServers, getMCPUrl, semanticMCP, semanticTools } from './registry';

/**
 * SigylSDK - Advanced SDK class for working with MCP registry and tools
 */
export class SigylSDK {
  private config: SDKConfig;

  /**
   * SigylSDK always uses the Sigyl registry API at https://api.sigyl.dev/api/v1
   * The registryUrl cannot be overridden by user config.
   * @param config - Only apiKey, timeout, and requireAuth are respected
   */
  constructor(config: SDKConfig = {}) {
    if (!config.apiKey) {
      throw new Error('An API key is required to use the SigylSDK.');
    }
    this.config = {
      registryUrl: 'https://api.sigyl.dev/api/v1',
      timeout: config.timeout || 10000,
      apiKey: config.apiKey,
      requireAuth: true,
    };
  }

  /**
   * Search for MCP servers in the registry
   */
  async searchMCP(
    query?: string,
    tags?: string[],
    limit: number = 1,
    offset: number = 0
  ): Promise<MCPSearchResult> {
    return searchMCP(query, tags, limit, offset, this.config);
  }

  /**
   * Get detailed information about a specific MCP server
   */
  async getMCP(name: string): Promise<ServerWithDetails> {
    return getMCP(name, this.config);
  }

  /**
   * Search all servers (public operation - limited results)
   * This uses the public search endpoint with a high limit
   */
  async searchAllServers(limit: number = 100): Promise<MCPServer[]> {
    const response = await this.searchMCP(undefined, undefined, limit, 0);
    return response.servers;
  }

  /**
   * Get all servers (admin operation - requires admin API key)
   * This calls the admin endpoint that requires admin permissions
   */
  async getAllServers(): Promise<MCPServer[]> {
    return getAllServers(this.config);
  }

  /**
   * Update SDK configuration
   */
  updateConfig(newConfig: Partial<SDKConfig>): void {
    if (newConfig.apiKey === undefined && !this.config.apiKey) {
      throw new Error('An API key is required to use the SigylSDK.');
    }
    this.config = { ...this.config, ...newConfig, requireAuth: true };
  }

  /**
   * Get current SDK configuration
   */
  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Retrieve MCP server URL and metadata by name
   */
  async getMCPUrl(name: string) {
    return getMCPUrl(name, this.config);
  }

  /**
   * Semantic search for MCP servers
   * @param query - user prompt or search string
   * @param count - number of results to return (default 1)
   */
  async semanticMCP(query: string, count: number = 1) {
    return semanticMCP(query, count, this.config);
  }

  /**
   * Semantic search for tools across all MCP servers
   * @param query - user prompt or search string
   * @param count - number of results to return (default 1)
   */
  async semanticTools(query: string, count: number = 1) {
    return semanticTools(query, count, this.config);
  }
} 