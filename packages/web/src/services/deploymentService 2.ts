import { supabase } from '@/lib/supabase'
import { Deployment } from '@/lib/supabase'
import { MCPMetadata } from "@/lib/github"

export interface DeploymentConfig {
  name: string
  template_id: string
  region: string
  config?: any
  github_repo?: string
}

export interface DeploymentStatus {
  id: string
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'stopped'
  logs?: string[]
  url?: string
  error?: string
}

export interface DeploymentRequest {
  repoUrl: string
  repoName: string
  branch: string
  env: Record<string, string>
  metadata?: MCPMetadata
  githubToken: string
}

export interface DeploymentResult {
  success: boolean
  deploymentUrl?: string
  registryId?: string
  error?: string
}

// Registry API configuration
const REGISTRY_API_BASE = process.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

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

    console.log('Registering in MCP Registry:', registryData)

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
      console.log('Registered successfully:', result)
      
      return result.id
    } catch (error) {
      console.error('Registry registration failed:', error)
      // For now, don't fail the entire deployment if registry fails
      // In production, you might want to handle this differently
      return 'registry-unavailable'
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

  async createDeployment(config: DeploymentConfig): Promise<Deployment> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('deployments')
        .insert({
          user_id: user.id,
          name: config.name,
          template_id: config.template_id,
          status: 'pending',
          config: config.config || {},
          github_repo: config.github_repo || null,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Trigger deployment process
      await this.triggerDeployment(data.id)

      return data
    } catch (error) {
      console.error('Error creating deployment:', error)
      throw error
    }
  }

  async getDeployments(): Promise<Deployment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error fetching deployments:', error)
      throw error
    }
  }

  async getDeployment(id: string): Promise<Deployment | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching deployment:', error)
      throw error
    }
  }

  async updateDeploymentStatus(id: string, status: DeploymentStatus['status'], error?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (error) {
        updateData.config = { error }
      }

      const { error: updateError } = await supabase
        .from('deployments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }
    } catch (error) {
      console.error('Error updating deployment status:', error)
      throw error
    }
  }

  async deleteDeployment(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('deployments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting deployment:', error)
      throw error
    }
  }

  private async triggerDeployment(deploymentId: string): Promise<void> {
    try {
      // This would typically call your backend deployment service
      // For now, we'll simulate the deployment process
      
      // Update status to deploying
      await this.updateDeploymentStatus(deploymentId, 'deploying')
      
      // Simulate deployment time
      setTimeout(async () => {
        try {
          // Simulate successful deployment
          await this.updateDeploymentStatus(deploymentId, 'active')
        } catch (error) {
          console.error('Error in deployment simulation:', error)
          await this.updateDeploymentStatus(deploymentId, 'failed', 'Deployment failed')
        }
      }, 5000) // 5 second simulation
      
    } catch (error) {
      console.error('Error triggering deployment:', error)
      await this.updateDeploymentStatus(deploymentId, 'failed', 'Failed to trigger deployment')
    }
  }

  async getGitHubRepositories(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // This would typically call GitHub's API
      // For now, return mock data
      return [
        { id: 1, name: 'my-mcp-server', full_name: 'username/my-mcp-server', private: false },
        { id: 2, name: 'ai-agent', full_name: 'username/ai-agent', private: true },
        { id: 3, name: 'web-scraper', full_name: 'username/web-scraper', private: false },
      ]
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error)
      throw error
    }
  }

  async createGitHubRepository(name: string, description?: string, private: boolean = false): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // This would typically call GitHub's API to create a repository
      // For now, return mock data
      return {
        id: Math.random(),
        name,
        full_name: `${user.user_metadata?.user_name || 'user'}/${name}`,
        private,
        description,
        html_url: `https://github.com/${user.user_metadata?.user_name || 'user'}/${name}`
      }
    } catch (error) {
      console.error('Error creating GitHub repository:', error)
      throw error
    }
  }
}

export const deploymentService = new DeploymentService() 