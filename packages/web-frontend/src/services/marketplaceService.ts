// Marketplace service for MCP discovery and installation
import { MCPPackage, PackageWithDetails, PackageSearchResult } from '@/types/marketplace'

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

export interface MarketplaceFilters {
  q?: string
  tags?: string[]
  limit?: number
  offset?: number
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

export class MarketplaceService {
  /**
   * Search for MCP packages in the registry
   */
  static async searchPackages(filters: MarketplaceFilters = {}): Promise<PackageSearchResult> {
    try {
      const params = new URLSearchParams()
      
      if (filters.q) params.append('q', filters.q)
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`${REGISTRY_API_BASE}/packages/search?${params}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to search packages:', error)
      // Return empty result on error
      return {
        packages: [],
        total: 0,
        limit: filters.limit || 20,
        offset: filters.offset || 0
      }
    }
  }

  /**
   * Get all packages (for marketplace display)
   */
  static async getAllPackages(): Promise<MCPPackage[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Failed to fetch all packages:', error)
      return []
    }
  }

  /**
   * Get package details by name
   */
  static async getPackageDetails(packageName: string): Promise<PackageWithDetails | null> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages/${encodeURIComponent(packageName)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to fetch package details:', error)
      return null
    }
  }

  /**
   * Install an MCP package (creates deployment)
   */
  static async installPackage(request: InstallRequest): Promise<InstallResult> {
    try {
      // First, get the package details
      const packageDetails = await this.getPackageDetails(request.packageName)
      
      if (!packageDetails) {
        return {
          success: false,
          error: 'Package not found'
        }
      }

      // If package has existing deployments, use the first active one
      const activeDeployment = packageDetails.deployments?.find(d => d.status === 'active')
      
      if (activeDeployment) {
        return {
          success: true,
          deploymentUrl: activeDeployment.deployment_url
        }
      }

      // If no active deployment, create a new one
      // This would typically involve deploying the MCP server
      // For now, we'll simulate this process
      
      const deploymentUrl = await this.deployPackage(packageDetails)
      
      return {
        success: true,
        deploymentUrl
      }
    } catch (error) {
      console.error('Failed to install package:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      }
    }
  }

  /**
   * Deploy a package (simulated for now)
   */
  private static async deployPackage(packageDetails: PackageWithDetails): Promise<string> {
    // TODO: Implement actual deployment logic
    // This would involve:
    // 1. Cloning the source repository
    // 2. Building the Docker container
    // 3. Deploying to hosting platform
    // 4. Registering the deployment URL
    
    console.log('Deploying package:', packageDetails.name)
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate a mock deployment URL
    const sanitizedName = packageDetails.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}.railway.app`
    
    console.log('Deployed to:', deploymentUrl)
    return deploymentUrl
  }

  /**
   * Get popular packages (based on download count)
   */
  static async getPopularPackages(limit: number = 6): Promise<MCPPackage[]> {
    try {
      const allPackages = await this.getAllPackages()
      
      // Sort by download count and return top packages
      return allPackages
        .sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0))
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to fetch popular packages:', error)
      return []
    }
  }

  /**
   * Get packages by category/tags
   */
  static async getPackagesByCategory(category: string, limit: number = 20): Promise<MCPPackage[]> {
    try {
      const result = await this.searchPackages({
        tags: [category],
        limit
      })
      
      return result.packages
    } catch (error) {
      console.error('Failed to fetch packages by category:', error)
      return []
    }
  }

  /**
   * Get trending packages (recently created with high downloads)
   */
  static async getTrendingPackages(limit: number = 6): Promise<MCPPackage[]> {
    try {
      const allPackages = await this.getAllPackages()
      
      // Sort by recent creation and download count
      return allPackages
        .sort((a, b) => {
          const aScore = (a.downloads_count || 0) * (new Date(a.created_at).getTime() / Date.now())
          const bScore = (b.downloads_count || 0) * (new Date(b.created_at).getTime() / Date.now())
          return bScore - aScore
        })
        .slice(0, limit)
    } catch (error) {
      console.error('Failed to fetch trending packages:', error)
      return []
    }
  }
} 