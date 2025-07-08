// Types that mirror the registry API
export interface MCPServer {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author_id?: string;
  source_api_url?: string;
  tags?: string[];
  downloads_count: number;
  created_at: string;
  updated_at: string;
}

export interface MCPDeployment {
  id: string;
  package_id: string;
  deployment_url: string;
  status: 'active' | 'inactive' | 'failed';
  health_check_url?: string;
  last_health_check?: string;
  created_at: string;
}

export interface MCPTool {
  id: string;
  package_id: string;
  tool_name?: string;
  description?: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
}

export interface MCPSearchQuery {
  q?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MCPSearchResult {
  servers: MCPServer[];
  total: number;
  limit: number;
  offset: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ServerWithDetails extends MCPServer {
  deployments: MCPDeployment[];
  tools: MCPTool[];
}

// SDK-specific types
export interface SDKConfig {
  registryUrl?: string;
  timeout?: number;
  apiKey?: string;
  requireAuth?: boolean;
}

export type ToolFunction = (input: any) => Promise<any>;

// Authentication types
export interface AuthConfig {
  apiKey?: string;
  requireAuth?: boolean;
}

export interface AuthenticatedRequest {
  headers: Record<string, string>;
  requiresAuth: boolean;
} 