import { supabase } from '@/lib/supabase'
import { Deployment } from '@/lib/supabase'

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

class DeploymentService {
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