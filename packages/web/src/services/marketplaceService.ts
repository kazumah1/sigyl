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
  static async searchPackages(filters: MarketplaceFilters = {}, options?: { signal?: AbortSignal }): Promise<PackageSearchResult> {
    try {
      const params = new URLSearchParams()
      
      if (filters.q) params.append('q', filters.q)
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','))
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`${REGISTRY_API_BASE}/packages/search?${params}`, { signal: options?.signal })
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      // Only return ready packages
      result.data.packages = result.data.packages?.filter((p: any) => p.ready === true) || [];
      return result.data
    } catch (error) {
      if (error.name === 'AbortError') throw error;
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
  static async getAllPackages(options?: { signal?: AbortSignal }): Promise<MCPPackage[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages`, { signal: options?.signal })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data?.filter(p => p.ready === true) || []
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Failed to fetch all packages:', error)
      return []
    }
  }

  /**
   * Get package details by ID
   */
  static async getPackageById(packageId: string, options?: { signal?: AbortSignal }): Promise<PackageWithDetails | null> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages/id/${encodeURIComponent(packageId)}`, { signal: options?.signal })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Failed to fetch package by ID:', error)
      return null
    }
  }

  /**
   * Get package details by name
   */
  static async getPackageDetails(packageName: string, options?: { signal?: AbortSignal }): Promise<PackageWithDetails | null> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages/${encodeURIComponent(packageName)}`, { signal: options?.signal })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      if (error.name === 'AbortError') throw error;
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
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}-service-run.app`
    
    console.log('Deployed to:', deploymentUrl)
    return deploymentUrl
  }

  /**
   * Get popular packages (based on download count)
   */
  static async getPopularPackages(limit: number = 6, options?: { signal?: AbortSignal }): Promise<MCPPackage[]> {
    try {
      const allPackages = await this.getAllPackages(options)
      // Only ready packages
      return allPackages
        .filter(p => p.ready === true)
        .sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0))
        .slice(0, limit)
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Failed to fetch popular packages:', error)
      return []
    }
  }

  /**
   * Get packages by category/tags
   */
  static async getPackagesByCategory(category: string, limit: number = 20, options?: { signal?: AbortSignal }): Promise<MCPPackage[]> {
    try {
      const result = await this.searchPackages({
        tags: [category],
        limit
      }, options)
      // Only ready packages
      return result.packages?.filter((p: any) => p.ready === true) || [];
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Failed to fetch packages by category:', error)
      return []
    }
  }

  /**
   * Get trending packages (recently created with high downloads)
   */
  static async getTrendingPackages(limit: number = 6, options?: { signal?: AbortSignal }): Promise<MCPPackage[]> {
    try {
      const allPackages = await this.getAllPackages(options)
      // Only ready packages
      return allPackages
        .filter(p => p.ready === true)
        .sort((a, b) => {
          const aScore = (a.downloads_count || 0) * (new Date(a.created_at).getTime() / Date.now())
          const bScore = (b.downloads_count || 0) * (new Date(b.created_at).getTime() / Date.now())
          return bScore - aScore
        })
        .slice(0, limit)
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('Failed to fetch trending packages:', error)
      return []
    }
  }

  /**
   * Increment the download count for a package
   */
  static async incrementDownloadCount(packageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages/id/${encodeURIComponent(packageId)}/increment-downloads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to increment download count');
      return true;
    } catch (error) {
      console.error('Failed to increment download count:', error);
      return false;
    }
  }
}