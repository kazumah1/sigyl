// Marketplace types that match the Registry API

export interface MCPPackage {
  id: string
  name: string
  slug: string
  version?: string
  description?: string
  author_id?: string
  source_api_url?: string
  tags?: string[]
  downloads_count: number
  created_at: string
  updated_at: string
  logo_url?: string;
  screenshots?: string[] | string;
}

export interface MCPDeployment {
  id: string
  package_id: string
  deployment_url: string
  status: 'active' | 'inactive' | 'failed'
  health_check_url?: string
  last_health_check?: string
  created_at: string
}

export interface MCPTool {
  id: string
  package_id: string
  tool_name?: string
  description?: string
  input_schema?: Record<string, any>
  output_schema?: Record<string, any>
}

export interface PackageWithDetails extends MCPPackage {
  deployments: MCPDeployment[]
  tools: MCPTool[]
  secrets?: Array<{
    name: string;
    description?: string;
    type?: string;
    required: boolean;
    [key: string]: any;
  }>
  logo_url?: string;
  screenshots?: string[] | string;
}

export interface PackageSearchResult {
  packages: MCPPackage[]
  total: number
  limit: number
  offset: number
}

// Frontend-specific types for marketplace display
export interface MarketplaceItem {
  id: string
  name: string
  description: string
  category: string
  rating: number
  downloads: number
  author: string
  icon: React.ReactNode
  tags: string[]
  logo?: string
  screenshots?: string[]
  lastUpdated: string
  userRating?: number
}

export interface MarketplaceFilters {
  q?: string
  tags?: string[]
  limit?: number
  offset?: number
  category?: string
}

export interface InstallRequest {
  packageName: string
  userId?: string
  deploymentUrl?: string
}

export interface InstallResult {
  success: boolean
  deploymentUrl?: string
  error?: string
}

// Categories for marketplace organization
export const MARKETPLACE_CATEGORIES = [
  'all',
  'frameworks',
  'apis',
  'agents',
  'tools',
  'connectors',
  'templates',
  'database',
  'ai',
  'integration'
] as const

export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number] 