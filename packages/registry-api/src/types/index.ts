export interface MCPPackage {
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

export interface CreatePackageRequest {
  name: string;
  version?: string;
  description?: string;
  author_id?: string;
  source_api_url?: string;
  tags?: string[];
  tools?: Omit<MCPTool, 'id' | 'package_id'>[];
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