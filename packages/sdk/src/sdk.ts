import type {
  SDKConfig,
  MCPPackage,
  PackageWithDetails,
  PackageSearchQuery,
  PackageSearchResult,
  CreatePackageRequest,
  ToolFunction
} from './types';
import { searchPackages, getPackage, getAllPackagesAdmin, getMCPServerUrlByName, semanticSearchMCPServers, semanticSearchTools } from './registry';

/**
 * MCPConnectSDK - Advanced SDK class for working with MCP registry and tools
 */
export class MCPConnectSDK {
  private config: SDKConfig;

  /**
   * MCPConnectSDK always uses the Sigyl registry API at https://api.sigyl.dev/api/v1
   * The registryUrl cannot be overridden by user config.
   * @param config - Only apiKey, timeout, and requireAuth are respected
   */
  constructor(config: SDKConfig = {}) {
    this.config = {
      registryUrl: 'https://api.sigyl.dev/api/v1',
      timeout: config.timeout || 10000,
      apiKey: config.apiKey,
      requireAuth: config.requireAuth,
    };
  }

  /**
   * Search for packages in the registry
   */
  async searchPackages(
    query?: string,
    tags?: string[],
    limit: number = 20,
    offset: number = 0
  ): Promise<PackageSearchResult> {
    return searchPackages(query, tags, limit, offset, this.config);
  }

  /**
   * Get detailed information about a specific package
   */
  async getPackage(name: string): Promise<PackageWithDetails> {
    return getPackage(name, this.config);
  }

  /**
   * Search all packages (public operation - limited results)
   * This uses the public search endpoint with a high limit
   */
  async searchAllPackages(limit: number = 100): Promise<MCPPackage[]> {
    const response = await this.searchPackages(undefined, undefined, limit, 0);
    return response.packages;
  }

  /**
   * Get all packages (admin operation - requires admin API key)
   * This calls the admin endpoint that requires admin permissions
   */
  async getAllPackages(): Promise<MCPPackage[]> {
    return getAllPackagesAdmin(this.config);
  }

  /**
   * Update SDK configuration
   */
  updateConfig(newConfig: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
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
  async getMCPServerUrlByName(name: string) {
    return getMCPServerUrlByName(name, this.config);
  }

  /**
   * Semantic search for MCP servers (packages)
   * @param query - user prompt or search string
   * @param count - number of results to return (default 1)
   */
  async semanticSearchMCPServers(query: string, count: number = 1) {
    return semanticSearchMCPServers(query, count, this.config);
  }

  /**
   * Semantic search for tools across all MCP servers
   * @param query - user prompt or search string
   * @param count - number of results to return (default 1)
   */
  async semanticSearchTools(query: string, count: number = 1) {
    return semanticSearchTools(query, count, this.config);
  }
} 