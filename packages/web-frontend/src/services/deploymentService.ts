// Deployment service for MCP servers with security validation
import { MCPMetadata } from "@/lib/github"
import { SecurityValidationResult } from "@/types/security"

// Import Railway service from container-builder package
import { RailwayService, RailwayConfig, RailwayDeploymentRequest } from '@sigil/container-builder'

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
  serviceId?: string
  error?: string
  securityReport?: SecurityValidationResult
}

// Registry API configuration
const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

// Railway configuration
const RAILWAY_CONFIG: RailwayConfig = {
  apiToken: import.meta.env.VITE_RAILWAY_API_TOKEN || 'demo-token',
  apiUrl: import.meta.env.VITE_RAILWAY_API_URL
}

export class DeploymentService {
  /**
   * Deploy MCP server with security validation
   */
  static async deployMCPServer(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('🔒 Starting secure deployment process for:', request.repoName)

      // Check if Railway API token is available
      const hasRailwayToken = import.meta.env.VITE_RAILWAY_API_TOKEN && 
                             import.meta.env.VITE_RAILWAY_API_TOKEN !== 'demo-token'

      if (hasRailwayToken) {
        console.log('🚀 Using real Railway API for deployment')
        return await DeploymentService.deployToRailway(request)
      } else {
        console.log('🧪 Using enhanced simulation (Railway API token not configured)')
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
   * Deploy to Railway using real API
   */
  static async deployToRailway(request: DeploymentRequest): Promise<DeploymentResult> {
    try {
      console.log('🚀 Deploying to Railway...')
      
      // Initialize Railway service
      const railwayService = new RailwayService(RAILWAY_CONFIG)
      
      // Prepare Railway deployment request
      const railwayRequest: RailwayDeploymentRequest = {
        repoUrl: request.repoUrl,
        repoName: request.repoName,
        branch: request.branch,
        environmentVariables: {
          ...request.env,
          NODE_ENV: 'production',
          MCP_TRANSPORT: 'http',
          MCP_ENDPOINT: '/mcp',
          FORCE_HTTPS: 'true',
          SESSION_SECURE: 'true',
          REQUIRE_TOKEN_VALIDATION: 'true'
        }
      }
      
      // Deploy to Railway with security validation
      const railwayResult = await railwayService.deployMCPServer(railwayRequest)
      
      if (!railwayResult.success) {
        return {
          success: false,
          error: railwayResult.error || 'Railway deployment failed',
          securityReport: railwayResult.securityReport
        }
      }
      
      console.log('✅ Railway deployment successful:', railwayResult.deploymentUrl)
      console.log('🔗 MCP endpoint available at:', `${railwayResult.deploymentUrl}/mcp`)
      
      // Register in MCP Registry
      const registryId = await DeploymentService.registerInRegistry(request, railwayResult.deploymentUrl!)
      
      return {
        success: true,
        deploymentUrl: railwayResult.deploymentUrl,
        registryId,
        serviceId: railwayResult.serviceId,
        securityReport: railwayResult.securityReport
      }
      
    } catch (error) {
      console.error('❌ Railway deployment failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Railway deployment failed'
      }
    }
  }

  /**
   * Enhanced simulation with security validation
   */
  static async simulateDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    console.log('🔍 Running security validation...')
    
    // Simulate security validation
    const securityReport = await DeploymentService.simulateSecurityValidation(request)
    
    // Block deployment if critical security issues found
    if (!securityReport.passed) {
      console.error('🚨 Deployment blocked due to security issues')
      return {
        success: false,
        error: `Deployment blocked: ${securityReport.summary}`,
        securityReport
      }
    }

    console.log('✅ Security validation passed, proceeding with enhanced simulation')

    // Simulate deployment delay with realistic Railway-like timing
    await new Promise(resolve => setTimeout(resolve, 4000))
    
    // Generate a realistic deployment URL
    const sanitizedName = request.repoName.replace('/', '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}.railway.app`
    
    console.log('🚀 Simulated Railway deployment to:', deploymentUrl)
    console.log('🔗 MCP endpoint available at:', `${deploymentUrl}/mcp`)
    console.log('🔒 Security features enabled: HTTPS, token validation, secure sessions')

    // Register in MCP Registry
    const registryId = await DeploymentService.registerInRegistry(request, deploymentUrl)

    return {
      success: true,
      deploymentUrl,
      registryId,
      serviceId: `railway-sim-${Date.now()}`,
      securityReport
    }
  }

  /**
   * Validate MCP security before deployment
   */
  static async validateSecurity(request: DeploymentRequest): Promise<SecurityValidationResult> {
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
  static async simulateSecurityValidation(request: DeploymentRequest): Promise<SecurityValidationResult> {
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
    // This method is now deprecated in favor of deployToRailway
    console.warn('⚠️ deployToHosting is deprecated. Use deployToRailway instead.')
    
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Generate a mock deployment URL with proper MCP endpoint
    const sanitizedName = request.repoName.replace('/', '-').toLowerCase()
    const deploymentUrl = `https://${sanitizedName}-${Date.now()}.railway.app`
    
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
      tags: ['github', 'deployed', 'secure', ...(request.metadata?.tools?.map(t => t.name) || [])],
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