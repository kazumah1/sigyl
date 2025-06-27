import { MCPSecret } from '../services/yaml';

export interface MCPPackage {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author_id?: string;
  source_api_url?: string;
  tags?: string[];
  downloads_count: number;
  required_secrets?: MCPSecret[];
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

export interface CreatePackageRequest {
  name: string;
  version?: string;
  description?: string;
  author_id?: string;
  source_api_url?: string;
  tags?: string[];
  tools?: Omit<MCPTool, 'id' | 'package_id'>[];
  required_secrets?: MCPSecret[];
}

export interface PackageSearchQuery {
  q?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface PackageSearchResult {
  packages: MCPPackage[];
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

export interface PackageWithDetails extends MCPPackage {
  deployments: MCPDeployment[];
  tools: MCPTool[];
}

// API Key Management Types
export interface APIUser {
  id: string;
  email: string;
  name: string;
  github_id?: string;
  created_at: string;
  updated_at: string;
}

export interface APIKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  permissions?: string[];
  expires_at?: string;
}

export interface APIKeyUsage {
  id: string;
  key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuthenticatedUser {
  key_id: string;
  user_id: string;
  permissions: string[];
  is_active: boolean;
}

export type Permission = 'read' | 'write' | 'admin';

export interface APIKeyStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  last_used: string;
} 