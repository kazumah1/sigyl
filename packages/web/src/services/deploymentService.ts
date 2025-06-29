import { supabase } from '@/lib/supabase'

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

// Deployment service for managing agent deployments
export interface DeploymentConfig {
  name: string;
  type: 'api' | 'agent' | 'tool' | 'connector';
  environment: 'development' | 'staging' | 'production';
  resources: {
    cpu: number;
    memory: number;
    storage: number;
  };
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
  };
}

export interface DeploymentStatus {
  id: string;
  name: string;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'failed' | 'active';
  health: 'healthy' | 'degraded' | 'unhealthy';
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
  };
}

export interface MCPTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: DeploymentConfig;
  estimatedCost: number;
  popularity: number;
}

export interface DeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch: string;
  env: Record<string, string>;
  githubToken: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  packageId?: string;
  serviceId?: string;
  error?: string;
  securityReport?: any;
}

class DeploymentService {
  /**
   * Get all deployments for the current user
   */
  async getDeployments(): Promise<DeploymentStatus[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.status}`);
      }

      const result = await response.json();
      
      // Transform backend data to frontend format
      return (result.data || []).map((deployment: any) => ({
        id: deployment.id,
        name: deployment.package_name || deployment.name,
        status: deployment.status === 'active' ? 'running' : deployment.status,
        health: deployment.health_status || 'healthy',
        url: deployment.deployment_url,
        createdAt: new Date(deployment.created_at),
        updatedAt: new Date(deployment.updated_at),
        metrics: {
          cpu: deployment.metrics?.cpu || 0,
          memory: deployment.metrics?.memory || 0,
          requests: deployment.metrics?.requests || 0,
          errors: deployment.metrics?.errors || 0
        }
      }));
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get specific deployment by ID
   */
  async getDeployment(id: string): Promise<DeploymentStatus | null> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch deployment: ${response.status}`);
      }

      const result = await response.json();
      const deployment = result.data;

      return {
        id: deployment.id,
        name: deployment.package_name || deployment.name,
        status: deployment.status === 'active' ? 'running' : deployment.status,
        health: deployment.health_status || 'healthy',
        url: deployment.deployment_url,
        createdAt: new Date(deployment.created_at),
        updatedAt: new Date(deployment.updated_at),
        metrics: {
          cpu: deployment.metrics?.cpu || 0,
          memory: deployment.metrics?.memory || 0,
          requests: deployment.metrics?.requests || 0,
          errors: deployment.metrics?.errors || 0
        }
      };
    } catch (error) {
      console.error('Failed to fetch deployment:', error);
      return null;
    }
  }

  /**
   * Deploy MCP server from GitHub repository
   */
  async deployFromGitHub(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('🚀 Starting deployment:', request.repoName);

      const response = await fetch(`${REGISTRY_API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: request.repoUrl,
          githubToken: request.githubToken,
          branch: request.branch,
          env: request.env
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Deployment failed:', result.error);
        return {
          success: false,
          error: result.error || `Deployment failed: ${response.status}`,
          securityReport: result.securityReport
        };
      }

      console.log('✅ Deployment successful:', result.deploymentUrl);

      return {
        success: true,
        deploymentUrl: result.deploymentUrl,
        packageId: result.packageId,
        serviceId: result.serviceId,
        securityReport: result.securityReport
      };
    } catch (error) {
      console.error('❌ Deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  /**
   * Create deployment from config (legacy compatibility)
   */
  async createDeployment(config: DeploymentConfig): Promise<DeploymentStatus> {
    // For legacy compatibility, convert config to deployment request
    // This would typically require more information about the source repository
    throw new Error('Direct deployment from config not supported. Use deployFromGitHub instead.');
  }

  /**
   * Restart a deployment
   */
  async restartDeployment(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Failed to restart deployment:', response.status);
        return false;
      }

      console.log('✅ Deployment restarted successfully');
      return true;
    } catch (error) {
      console.error('Failed to restart deployment:', error);
      return false;
    }
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Failed to delete deployment:', response.status);
        return false;
      }

      console.log('✅ Deployment deleted successfully');
      return true;
    } catch (error) {
      console.error('Failed to delete deployment:', error);
      return false;
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(id: string, limit: number = 100, since?: string): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (since) params.append('since', since);

      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}/logs?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch deployment logs:', error);
      return [];
    }
  }

  /**
   * Get deployment health status
   */
  async getDeploymentHealth(id: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        return 'unknown';
      }

      const result = await response.json();
      return result.data?.status || 'unknown';
    } catch (error) {
      console.error('Failed to fetch deployment health:', error);
      return 'unknown';
    }
  }

  /**
   * Update deployment configuration
   */
  async updateDeployment(id: string, updates: Partial<DeploymentConfig>): Promise<DeploymentStatus | null> {
    // For now, updating deployment config is not supported
    // This would require backend endpoint for updating running deployments
    console.warn('Deployment updates not yet supported');
    return null;
  }

  /**
   * Get MCP templates for deployment
   */
  async getTemplates(): Promise<MCPTemplate[]> {
    // Return static templates for now
    // In the future, these could come from the registry API
    return [
      {
        id: 'template-001',
        name: 'OpenAI Connector',
        description: 'Pre-configured OpenAI API integration with rate limiting and error handling',
        category: 'API Connectors',
        config: {
          name: 'OpenAI Connector',
          type: 'connector',
          environment: 'production',
          resources: { cpu: 1, memory: 512, storage: 10 },
          scaling: { minInstances: 1, maxInstances: 5, targetCPU: 70 }
        },
        estimatedCost: 15,
        popularity: 95
      },
      {
        id: 'template-002',
        name: 'Database Query Agent',
        description: 'Intelligent SQL query generator and executor with natural language interface',
        category: 'AI Agents',
        config: {
          name: 'Database Query Agent',
          type: 'agent',
          environment: 'production',
          resources: { cpu: 2, memory: 1024, storage: 20 },
          scaling: { minInstances: 1, maxInstances: 3, targetCPU: 80 }
        },
        estimatedCost: 25,
        popularity: 87
      },
      {
        id: 'template-003',
        name: 'Web Scraping Tool',
        description: 'Robust web scraping with proxy rotation and CAPTCHA solving',
        category: 'Data Tools',
        config: {
          name: 'Web Scraping Tool',
          type: 'tool',
          environment: 'production',
          resources: { cpu: 2, memory: 2048, storage: 50 },
          scaling: { minInstances: 2, maxInstances: 10, targetCPU: 60 }
        },
        estimatedCost: 35,
        popularity: 78
      }
    ];
  }

  /**
   * Deploy from template
   */
  async deployFromTemplate(templateId: string, customConfig?: Partial<DeploymentConfig>): Promise<DeploymentStatus> {
    const templates = await this.getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // For template deployment, we'd need to have pre-built repositories
    // For now, throw an error directing users to GitHub deployment
    throw new Error('Template deployment not yet supported. Please deploy from GitHub repository.');
  }

  /**
   * Calculate deployment cost estimate
   */
  calculateCost(config: DeploymentConfig): number {
    const baseCost = 5; // Base platform fee
    const cpuCost = config.resources.cpu * 10;
    const memoryCost = (config.resources.memory / 1024) * 15;
    const storageCost = (config.resources.storage / 10) * 2;
    
    return baseCost + cpuCost + memoryCost + storageCost;
  }

  /**
   * Generate secure API key for deployment
   */
  generateSecretKey(): string {
    return 'sk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get deployment metrics over time
   */
  async getMetrics(deploymentId: string, timeRange: '1h' | '24h' | '7d' = '24h') {
    // For now, return simulated metrics
    // In the future, this would fetch real metrics from the backend
    const now = Date.now();
    const dataPoints = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : 168;
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    return Array.from({ length: dataPoints }, (_, i) => ({
      timestamp: new Date(now - (dataPoints - 1 - i) * interval),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      requests: Math.floor(Math.random() * 1000),
      errors: Math.floor(Math.random() * 10)
    }));
  }

  /**
   * Validate deployment configuration
   */
  validateConfig(config: DeploymentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) errors.push('Name is required');
    if (config.resources.cpu < 0.1) errors.push('CPU must be at least 0.1');
    if (config.resources.memory < 128) errors.push('Memory must be at least 128MB');
    if (config.scaling.minInstances < 1) errors.push('Minimum instances must be at least 1');
    if (config.scaling.maxInstances < config.scaling.minInstances) {
      errors.push('Maximum instances must be greater than or equal to minimum instances');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Redeploy an existing deployment (rebuild and update existing Cloud Run service)
   */
  async redeployDeployment(id: string): Promise<{ success: boolean; logs?: string[] }> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/deployments/${id}/redeploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error('Failed to redeploy deployment:', result.error);
        return { success: false, logs: result.logs || [] };
      }
      console.log('✅ Redeploy succeeded:', result);
      return { success: true, logs: result.logs || [] };
    } catch (error) {
      console.error('Failed to redeploy deployment:', error);
      return { success: false };
    }
  }
}

export default new DeploymentService();
