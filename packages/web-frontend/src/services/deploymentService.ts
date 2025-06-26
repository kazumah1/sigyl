// Deployment service for MCP servers
import { MCPMetadata } from "@/lib/github"

export interface DeploymentRequest {
  repoUrl: string
  repoName: string
  branch: string
  env: Record<string, string>
  metadata?: MCPMetadata
  githubToken: string
  selectedSecrets?: string[]
}

export interface DeploymentResult {
  success: boolean
  deploymentUrl?: string
  registryId?: string
  error?: string
}

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

export class DeploymentService {
  /**
   * Deploy MCP server to hosting platform and register in registry
   */
  static async deployMCPServer(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('Starting deployment process for:', request.repoName)

      // Step 1: Deploy to hosting platform (Railway/Render)
      const deploymentUrl = await DeploymentService.deployToHosting(request)
      
      // Step 2: Register in MCP Registry
      const registryId = await DeploymentService.registerInRegistry(request, deploymentUrl)

      return {
        success: true,
        deploymentUrl,
        registryId
      }
    } catch (error) {
      console.error('Deployment failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      }
    }
  }

  /**
   * Deploy to hosting platform (Railway, Render, etc.)
   */
  static async deployToHosting(request: DeploymentRequest): Promise<string> {
    // TODO: Implement actual hosting platform deployment
    // For now, simulate the deployment process
    
    console.log('Deploying to hosting platform...')
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate a mock deployment URL
    const sanitizedName = request.repoName.replace('/', '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}.railway.app`
    
    console.log('Deployed to:', deploymentUrl)
    return deploymentUrl
  }

  /**
   * Register MCP server in the registry
   */
  static async registerInRegistry(request: DeploymentRequest, deploymentUrl: string): Promise<string> {
    const registryData = {
      name: request.metadata?.name || request.repoName.split('/')[1],
      description: request.metadata?.description || 'MCP Server deployed from GitHub',
      github_url: request.repoUrl,
      deployment_url: deploymentUrl,
      tags: ['github', 'deployed', ...(request.metadata?.tools?.map(t => t.name) || [])],
      // Map MCP tools to registry format
      tools: request.metadata?.tools?.map(tool => ({
        tool_name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
        output_schema: tool.output_schema
      })) || []
    }

    console.log('Registering in MCP Registry...')

    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registryData)
      })

      if (!response.ok) {
        throw new Error(`Registry API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Successfully registered in MCP Registry:', result.id)
      
      return result.id
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('⚠️ Registry API unavailable (connection refused) - deployment succeeded but not registered')
        return 'registry-offline'
      } else {
        console.warn('⚠️ Registry registration failed:', error instanceof Error ? error.message : 'Unknown error')
        return 'registry-error'
      }
    }
  }

  /**
   * Get deployment status
   */
  static async getDeploymentStatus(deploymentUrl: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      const response = await fetch(`${deploymentUrl}/health`, { 
        method: 'GET'
      })
      
      return response.ok ? 'healthy' : 'unhealthy'
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * List user's deployments (future feature)
   */
  static async getUserDeployments(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/packages?user_id=${userId}`)
      if (!response.ok) return []
      
      const result = await response.json()
      return result.packages || []
    } catch (error) {
      console.error('Failed to fetch user deployments:', error)
      return []
    }
  }
} 