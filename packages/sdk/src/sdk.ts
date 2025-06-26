import type {
  SDKConfig,
  MCPPackage,
  PackageWithDetails,
  PackageSearchQuery,
  PackageSearchResult,
  CreatePackageRequest,
  ToolFunction
} from './types';
import { searchPackages, getPackage, registerMCP, invoke, getAllPackagesAdmin } from './registry';
import { connect, connectDirect } from './connect';

/**
 * MCPConnectSDK - Advanced SDK class for working with MCP registry and tools
 */
export class MCPConnectSDK {
  private config: SDKConfig;

  constructor(config: SDKConfig = {}) {
    this.config = {
      registryUrl: 'http://localhost:3000/api/v1',
      timeout: 10000,
      ...config
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
   * Register a new MCP package
   */
  async registerMCP(packageData: CreatePackageRequest, apiKey?: string): Promise<MCPPackage> {
    return registerMCP(packageData, apiKey, this.config);
  }

  /**
   * Connect to a specific tool in a package
   */
  async connect(packageName: string, toolName: string): Promise<ToolFunction> {
    return connect(packageName, toolName, {
      registryUrl: this.config.registryUrl,
      timeout: this.config.timeout
    });
  }

  /**
   * Connect directly to a tool by URL
   */
  async connectDirect(toolUrl: string): Promise<ToolFunction> {
    return connectDirect(toolUrl, {
      timeout: this.config.timeout
    });
  }

  /**
   * Connect to all tools in a package
   */
  async connectAll(packageName: string): Promise<Record<string, ToolFunction>> {
    const packageData = await this.getPackage(packageName);
    const tools: Record<string, ToolFunction> = {};

    // Find active deployment
    const activeDeployment = packageData.deployments.find(d => d.status === 'active');
    if (!activeDeployment) {
      throw new Error(`No active deployment found for package '${packageName}'`);
    }

    // Create tool functions for each tool
    for (const tool of packageData.tools) {
      if (tool.tool_name) {
        const toolUrl = `${activeDeployment.deployment_url}/${tool.tool_name}`;
        tools[tool.tool_name] = await this.connectDirect(toolUrl);
      }
    }

    return tools;
  }

  /**
   * Manually invoke a tool by URL
   */
  async invoke(toolUrl: string, input: any): Promise<any> {
    return invoke(toolUrl, input, this.config);
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
} 