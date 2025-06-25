import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  MCPPackage,
  PackageWithDetails,
  PackageSearchQuery,
  PackageSearchResult,
  CreatePackageRequest,
  APIResponse,
  SDKConfig
} from './types';

// Default configuration
const DEFAULT_REGISTRY_URL = 'http://localhost:3000/api/v1';
const DEFAULT_TIMEOUT = 10000;

// Create axios instance with default config
function createApiClient(config: SDKConfig = {}): AxiosInstance {
  const registryUrl = config.registryUrl || DEFAULT_REGISTRY_URL;
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

/**
 * Search for MCP packages in the registry
 */
export async function searchPackages(
  query?: string,
  tags?: string[],
  limit: number = 20,
  offset: number = 0,
  config: SDKConfig = {}
): Promise<PackageSearchResult> {
  const client = createApiClient(config);
  
  const params: any = {
    limit,
    offset
  };
  
  if (query) params.q = query;
  if (tags && tags.length > 0) params.tags = tags.join(',');

  // The interceptor returns the data directly
  return await client.get('/packages/search', { params });
}

/**
 * Get detailed information about a specific package
 */
export async function getPackage(
  name: string,
  config: SDKConfig = {}
): Promise<PackageWithDetails> {
  const client = createApiClient(config);
  
  if (!name || name.trim().length === 0) {
    throw new Error('Package name is required');
  }

  // The interceptor returns the data directly
  return await client.get(`/packages/${encodeURIComponent(name)}`);
}

/**
 * Register a new MCP package in the registry
 */
export async function registerMCP(
  packageData: CreatePackageRequest,
  apiKey?: string,
  config: SDKConfig = {}
): Promise<MCPPackage> {
  const client = createApiClient({ ...config, apiKey });
  
  // The interceptor returns the data directly
  return await client.post('/packages', packageData);
}

/**
 * Manually invoke a tool by URL
 */
export async function invoke(
  toolUrl: string,
  input: any,
  config: SDKConfig = {}
): Promise<any> {
  const timeout = config.timeout || DEFAULT_TIMEOUT;
  
  const response = await axios.post(toolUrl, input, {
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
    }
  });
  
  return response.data;
} 