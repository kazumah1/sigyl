import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  MCPServer,
  MCPSearchQuery,
  MCPSearchResult,
  APIResponse,
  SDKConfig,
  MCPTool,
  ServerWithDetails
} from './types';

// Default configuration
const DEFAULT_REGISTRY_URL = 'http://localhost:3000/api/v1';
const DEFAULT_TIMEOUT = 10000;

// Create axios instance with default config
/**
 * Always uses the official Sigyl registry API at https://api.sigyl.dev/api/v1
 * Ignores any registryUrl passed in config.
 */
function createApiClient(config: SDKConfig = {}): AxiosInstance {
  const registryUrl = 'https://api.sigyl.dev/api/v1';
  const timeout = config.timeout || DEFAULT_TIMEOUT;
  
  const client = axios.create({
    baseURL: registryUrl,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
    }
  });

  // Add response interceptor to handle API response format
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // The registry API wraps responses in { success, data, message } format
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || response.data.error || 'API request failed');
        }
      }
      return response.data;
    },
    (error) => {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  );

  return client;
}

// Helper function to validate authentication
function validateAuth(config: SDKConfig, operation: string): void {
  if (config.requireAuth && !config.apiKey) {
    throw new Error(`Authentication required for ${operation}. Please provide an API key.`);
  }
}

// Helper function to validate admin permissions
function validateAdminAuth(config: SDKConfig, operation: string): void {
  if (!config.apiKey) {
    throw new Error(`Admin API key required for ${operation}. Please provide an API key with admin permissions.`);
  }
}

/**
 * Search for MCP servers in the registry
 * Note: Search is typically public, but can be restricted if requireAuth is true
 */
export async function searchMCP(
  query?: string,
  tags?: string[],
  limit: number = 20,
  offset: number = 0,
  config: SDKConfig = {}
): Promise<MCPSearchResult> {
  // Validate auth if required
  validateAuth(config, 'searching servers');
  
  const client = createApiClient(config);
  
  // Build query parameters manually to ensure proper formatting
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());
  searchParams.append('offset', offset.toString());
  if (query) searchParams.append('q', query);
  if (tags && tags.length > 0) searchParams.append('tags', tags.join(','));

  // The interceptor returns the data directly
  return await client.get(`/packages/search?${searchParams.toString()}`);
}

/**
 * Get detailed information about a specific MCP server
 * Note: Server details are typically public, but can be restricted if requireAuth is true
 */
export async function getMCP(
  name: string,
  config: SDKConfig = {}
): Promise<ServerWithDetails> {
  // Validate auth if required
  validateAuth(config, 'getting server details');
  
  const client = createApiClient(config);
  
  if (!name || name.trim().length === 0) {
    throw new Error('Server name is required');
  }

  // The interceptor returns the data directly
  return await client.get(`/packages/${encodeURIComponent(name)}`);
}

/**
 * Get all servers (admin operation)
 * Note: This requires admin API key with admin permissions
 */
export async function getAllServers(
  config: SDKConfig = {}
): Promise<MCPServer[]> {
  // Admin operations always require admin authentication
  validateAdminAuth(config, 'getting all servers');
  
  const client = createApiClient(config);
  
  // The interceptor returns the data directly
  return await client.get('/packages/admin/all');
}

/**
 * Retrieve MCP server URL and metadata by server name
 */
export async function getMCPUrl(
  name: string,
  config: SDKConfig = {}
): Promise<{ url: string; server: MCPServer } | null> {
  const client = createApiClient(config);
  try {
    // TODO: Confirm endpoint on registry API
    const pkg: MCPServer = await client.get(`/packages/name/${encodeURIComponent(name)}`);
    if (pkg && pkg.source_api_url) {
      return { url: pkg.source_api_url, server: pkg };
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Semantic search for MCP servers
 * @param query - user prompt or search string
 * @param count - number of results to return (default 1)
 */
export async function semanticMCP(
  query: string,
  count: number = 1,
  config: SDKConfig = {}
): Promise<MCPServer[]> {
  const client = createApiClient(config);
  // TODO: Confirm endpoint on registry API
  const resp = await client.post(`/packages/semantic-search`, { query, count });
  return Array.isArray(resp) ? resp : [];
}

/**
 * Semantic search for tools across all MCP servers
 * @param query - user prompt or search string
 * @param count - number of results to return (default 1)
 */
export async function semanticTools(
  query: string,
  count: number = 1,
  config: SDKConfig = {}
): Promise<Array<MCPTool & { mcp_server: MCPServer }>> {
  const client = createApiClient(config);
  // TODO: Confirm endpoint on registry API
  const resp = await client.post(`/tools/semantic-search`, { query, count });
  return Array.isArray(resp) ? resp : [];
} 