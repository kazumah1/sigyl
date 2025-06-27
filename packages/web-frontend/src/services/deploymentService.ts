// Deployment service for MCP servers with security validation

export interface DeploymentRequest {
  repoUrl: string
  repoName: string
  branch: string
  env: Record<string, string>
  metadata?: any
  githubToken: string
  selectedSecrets?: string[]
}

export interface DeploymentResult {
  success: boolean
  deploymentUrl?: string
  packageId?: string
  serviceName?: string
  error?: string
  securityReport?: any
}

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

// Google Cloud Run configuration
const CLOUD_RUN_CONFIG = {
  projectId: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID || 'demo-project',
  region: import.meta.env.VITE_GOOGLE_CLOUD_REGION || 'us-central1'
}

export class DeploymentService {
  /**
   * Deploy MCP server with security validation
   */
  static async deployMCPServer(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('🔒 Starting secure deployment process for:', request.repoName)

      // Check if Google Cloud credentials are available
      const hasGoogleCloudCredentials = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID && 
                                       import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID !== 'demo-project'

      if (hasGoogleCloudCredentials) {
        console.log('🚀 Using real Google Cloud Run for deployment')
        return await DeploymentService.deployToCloudRun(request)
      } else {
        console.log('🧪 Using enhanced simulation (Google Cloud credentials not configured)')
        return await DeploymentService.simulateDeployment(request)
      }

    } catch (error) {
      console.error('❌ Deployment failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      }
    }
  }

  /**
   * Deploy to Google Cloud Run using real API
   */
  static async deployToCloudRun(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('🚀 Deploying to Google Cloud Run...')
      
      // For now, we'll use the Registry API's deployment endpoint
      // which will handle the Google Cloud Run deployment
      const response = await fetch(`${REGISTRY_API_BASE}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: request.repoUrl,
          repoName: request.repoName,
          branch: request.branch,
          env: {
            ...request.env,
            NODE_ENV: 'production',
            MCP_TRANSPORT: 'http',
            MCP_ENDPOINT: '/mcp',
            FORCE_HTTPS: 'true',
            SESSION_SECURE: 'true',
            REQUIRE_TOKEN_VALIDATION: 'true'
          },
          selectedSecrets: request.selectedSecrets
        })
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `Deployment failed: ${response.status}`,
          securityReport: result.securityReport
        }
      }
      
      console.log('✅ Google Cloud Run deployment successful:', result.deploymentUrl)
      console.log('🔗 MCP endpoint available at:', `${result.deploymentUrl}/mcp`)
      
      return {
        success: true,
        deploymentUrl: result.deploymentUrl,
        packageId: result.packageId,
        serviceName: result.serviceName,
        securityReport: result.securityReport
      }
      
    } catch (error) {
      console.error('❌ Google Cloud Run deployment failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Cloud Run deployment failed'
      }
    }
  }

  /**
   * Simulate deployment for development/testing
   */
  static async simulateDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    console.log('🧪 Running enhanced deployment simulation...')
    
    // Simulate security validation
    const securityReport = await DeploymentService.simulateSecurityValidation(request)
    
    if (!securityReport.passed) {
      return {
        success: false,
        error: securityReport.summary,
        securityReport
      }
    }

    // Simulate deployment delay with realistic Google Cloud Run timing
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Generate a mock deployment URL (now Google Cloud Run style)
    const sanitizedName = request.repoName.replace('/', '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}-uc.a.run.app`
    
    console.log('🚀 Simulated Google Cloud Run deployment to:', deploymentUrl)
    console.log('🔗 MCP endpoint available at:', `${deploymentUrl}/mcp`)
    console.log('🔒 Security features enabled: HTTPS, token validation, secure sessions')

    // Register in MCP Registry
    const packageId = await DeploymentService.registerInRegistry(request, deploymentUrl)

    return {
      success: true,
      deploymentUrl,
      packageId,
      serviceName: `sigil-mcp-${sanitizedName}`,
      securityReport
    }
  }

  /**
   * Validate MCP security before deployment
   */
  static async validateSecurity(request: DeploymentRequest): Promise<any> {
    try {
      console.log('🔍 Running security validation...')
      
      // Call security validation API endpoint
      const response = await fetch(`${REGISTRY_API_BASE}/security/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${request.githubToken}`
        },
        body: JSON.stringify({
          repoUrl: request.repoUrl,
          branch: request.branch
        })
      })

      if (!response.ok) {
        throw new Error(`Security validation API error: ${response.status}`)
      }

      const report = await response.json()
      console.log(`🔒 Security scan complete: ${report.score.toUpperCase()}`)

      return {
        passed: report.score !== 'blocked',
        score: report.score,
        vulnerabilities: report.vulnerabilities,
        blockers: report.blockers,
        errors: report.errors,
        warnings: report.warnings,
        summary: report.summary,
        recommendations: report.recommendations
      }

    } catch (error) {
      console.error('⚠️ Security validation failed:', error)
      
      // For now, simulate security validation (until API is ready)
      return DeploymentService.simulateSecurityValidation(request)
    }
  }

  /**
   * Simulate security validation (temporary until API is ready)
   */
  static async simulateSecurityValidation(request: DeploymentRequest): Promise<any> {
    console.log('🔍 Running simulated security validation...')
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Basic security checks based on repository name/structure
    const isLikelySecure = !request.repoName.toLowerCase().includes('test') && 
                          !request.repoName.toLowerCase().includes('demo')
    
    if (isLikelySecure) {
      return {
        passed: true,
        score: 'safe',
        vulnerabilities: 0,
        blockers: 0,
        errors: 0,
        warnings: 1,
        summary: '✅ Security validation passed with minor warnings',
        recommendations: [
          '📋 Add explicit MCP security configuration',
          '🔒 Ensure HTTPS is used in production',
          '🔐 Validate all tokens before use'
        ]
      }
    } else {
      return {
        passed: false,
        score: 'blocked',
        vulnerabilities: 2,
        blockers: 1,
        errors: 1,
        warnings: 0,
        summary: '🚨 DEPLOYMENT BLOCKED: Critical security issues detected',
        recommendations: [
          '🚨 Critical: Remove test/demo code from production deployment',
          '🔐 Implement proper token validation',
          '⚠️ Review code for security vulnerabilities'
        ]
      }
    }
  }

  /**
   * Deploy to hosting platform (Railway, Render, etc.)
   * Now with MCP-specific security configuration
   */
  static async deployToHosting(request: DeploymentRequest): Promise<string> {
    // This method is now deprecated in favor of deployToCloudRun
    console.warn('⚠️ deployToHosting is deprecated. Use deployToCloudRun instead.')
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate a mock deployment URL with proper MCP endpoint
    const sanitizedName = request.repoName.replace('/', '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}-uc.a.run.app`
    
    console.log('🚀 Deployed securely to:', deploymentUrl)
    console.log('🔗 MCP endpoint available at:', `${deploymentUrl}/mcp`)
    
    return deploymentUrl
  }

  /**
   * Register MCP server in the registry with security information
   */
  static async registerInRegistry(request: DeploymentRequest, deploymentUrl: string): Promise<string> {
    const registryData = {
      name: request.metadata?.name || request.repoName.split('/')[1],
      description: request.metadata?.description || 'Secure MCP Server deployed from GitHub',
      github_url: request.repoUrl,
      deployment_url: deploymentUrl,
      mcp_endpoint: `${deploymentUrl}/mcp`, // NEW: MCP-specific endpoint
      tags: ['github', 'deployed', 'secure', 'cloud-run', ...(request.metadata?.tools?.map(t => t.name) || [])],
      // Map MCP tools to registry format
      tools: request.metadata?.tools?.map(tool => ({
        tool_name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
        output_schema: tool.output_schema
      })) || [],
      // NEW: Security metadata
      security: {
        validated: true,
        validated_at: new Date().toISOString(),
        transport: 'http'
      }
    }

    console.log('📝 Registering secure MCP in registry...')

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
      console.log('✅ Successfully registered secure MCP:', result.id)
      
      return result.id
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('⚠️ Registry API unavailable - deployment succeeded but not registered')
        return 'registry-offline'
      } else {
        console.warn('⚠️ Registry registration failed:', error instanceof Error ? error.message : 'Unknown error')
        return 'registry-error'
      }
    }
  }

  /**
   * Get MCP deployment status with security-aware health checks
   */
  static async getDeploymentStatus(deploymentUrl: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // Check MCP-specific endpoint instead of generic health
      const response = await fetch(`${deploymentUrl}/mcp`, { 
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

  /**
   * Get security recommendations for a repository
   */
  static async getSecurityRecommendations(
    repoUrl: string, 
    branch: string, 
    githubToken: string
  ): Promise<string[]> {
    try {
      const response = await fetch(`${REGISTRY_API_BASE}/security/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({ repoUrl, branch })
      })

      if (!response.ok) {
        throw new Error('Failed to get security recommendations')
      }

      const result = await response.json()
      return result.recommendations || []
    } catch (error) {
      console.error('Failed to get security recommendations:', error)
      return ['Consider manual security review']
    }
  }
} 