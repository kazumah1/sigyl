import { MCPSecurityValidator } from '../security/validator';
import { SecurityReport } from '../types/security';

export interface RailwayDeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch: string;
  environmentVariables: Record<string, string>;
  projectId?: string;
}

export interface RailwayDeploymentResult {
  success: boolean;
  serviceId?: string;
  deploymentUrl?: string;
  error?: string;
  securityReport?: SecurityReport;
}

export interface RailwayConfig {
  apiToken: string;
  apiUrl?: string;
}

/**
 * Railway service for deploying MCP servers with security validation
 */
export class RailwayService {
  private config: RailwayConfig;
  private apiUrl: string;

  constructor(config: RailwayConfig) {
    this.config = config;
    this.apiUrl = config.apiUrl || 'https://backboard.railway.app/graphql/v2';
  }

  /**
   * Deploy MCP server to Railway with security validation
   */
  async deployMCPServer(request: RailwayDeploymentRequest): Promise<RailwayDeploymentResult> {
    try {
      console.log('🔒 Starting secure Railway deployment for:', request.repoName);

      // Step 1: Security validation first
      const securityReport = await this.validateSecurity(request);
      
      if (securityReport.securityScore === 'blocked') {
        console.error('🚨 Deployment blocked due to security issues');
        return {
          success: false,
          error: `Security validation failed: ${securityReport.summary}`,
          securityReport
        };
      }

      console.log('✅ Security validation passed, proceeding with Railway deployment');

      // Step 2: Create Railway project if needed
      const projectId = request.projectId || await this.createProject(request.repoName);

      // Step 3: Create service with GitHub repo
      const serviceId = await this.createService(projectId, request);

      // Step 4: Configure MCP-specific environment variables
      await this.configureMCPEnvironment(serviceId, request.environmentVariables);

      // Step 5: Generate domain for the service
      const deploymentUrl = await this.generateDomain(serviceId);

      console.log('🚀 Successfully deployed to Railway:', deploymentUrl);

      return {
        success: true,
        serviceId,
        deploymentUrl,
        securityReport
      };

    } catch (error) {
      console.error('❌ Railway deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Railway deployment error'
      };
    }
  }

  /**
   * Validate MCP security before deployment
   */
  private async validateSecurity(request: RailwayDeploymentRequest): Promise<SecurityReport> {
    const validator = new MCPSecurityValidator();
    return await validator.validateMCPSecurity(request.repoUrl, request.branch);
  }

  /**
   * Create a new Railway project
   */
  private async createProject(name: string): Promise<string> {
    const mutation = `
      mutation projectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        name: `mcp-${name.replace('/', '-')}`,
        description: `MCP Server deployment for ${name}`,
        isPublic: false
      }
    };

    const response = await this.graphqlRequest(mutation, variables);
    return response.data.projectCreate.id;
  }

  /**
   * Create a service with GitHub repository
   */
  private async createService(projectId: string, request: RailwayDeploymentRequest): Promise<string> {
    const mutation = `
      mutation serviceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        projectId,
        source: {
          repo: request.repoUrl.replace('https://github.com/', ''),
          branch: request.branch
        },
        name: `mcp-${request.repoName.split('/')[1]}`
      }
    };

    const response = await this.graphqlRequest(mutation, variables);
    return response.data.serviceCreate.id;
  }

  /**
   * Configure MCP-specific environment variables
   */
  private async configureMCPEnvironment(serviceId: string, customEnv: Record<string, string>): Promise<void> {
    // MCP-specific environment variables for Railway
    const mcpEnvironment = {
      // Railway provides PORT automatically
      NODE_ENV: 'production',
      
      // MCP-specific configuration
      MCP_TRANSPORT: 'http',
      MCP_ENDPOINT: '/mcp',
      
      // Security configuration
      FORCE_HTTPS: 'true',
      SESSION_SECURE: 'true',
      SESSION_SAME_SITE: 'strict',
      REQUIRE_TOKEN_VALIDATION: 'true',
      
      // Merge with custom environment variables
      ...customEnv
    };

    const mutation = `
      mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input) {
          id
        }
      }
    `;

    for (const [key, value] of Object.entries(mcpEnvironment)) {
      const variables = {
        input: {
          serviceId,
          environmentId: null, // Use default environment
          name: key,
          value: value
        }
      };

      await this.graphqlRequest(mutation, variables);
    }
  }

  /**
   * Generate a public domain for the service
   */
  private async generateDomain(serviceId: string): Promise<string> {
    const mutation = `
      mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
        serviceDomainCreate(input: $input) {
          id
          domain
        }
      }
    `;

    const variables = {
      input: {
        serviceId
      }
    };

    const response = await this.graphqlRequest(mutation, variables);
    return `https://${response.data.serviceDomainCreate.domain}`;
  }

  /**
   * Make GraphQL request to Railway API
   */
  private async graphqlRequest(query: string, variables: any): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiToken}`
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status} ${response.statusText}`);
    }

    const result: any = await response.json();
    
    if (result.errors) {
      throw new Error(`Railway GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    return result;
  }

  /**
   * Check MCP server health
   */
  async checkMCPHealth(deploymentUrl: string): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // Check MCP-specific endpoint with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${deploymentUrl}/mcp`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return 'unknown';
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(serviceId: string, limit = 100): Promise<string[]> {
    const query = `
      query deploymentLogs($serviceId: String!, $limit: Int) {
        deploymentLogs(serviceId: $serviceId, limit: $limit) {
          edges {
            node {
              message
              timestamp
            }
          }
        }
      }
    `;

    const variables = { serviceId, limit };

    try {
      const response = await this.graphqlRequest(query, variables);
      return response.data.deploymentLogs.edges.map((edge: any) => 
        `${edge.node.timestamp}: ${edge.node.message}`
      );
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    }
  }

  /**
   * Delete Railway service
   */
  async deleteService(serviceId: string): Promise<boolean> {
    const mutation = `
      mutation serviceDelete($id: String!) {
        serviceDelete(id: $id)
      }
    `;

    try {
      await this.graphqlRequest(mutation, { id: serviceId });
      return true;
    } catch (error) {
      console.error('Failed to delete service:', error);
      return false;
    }
  }
}

/**
 * Create MCP-specific Dockerfile for Railway deployment
 */
export function generateMCPDockerfile(packageJson?: any): string {
  return `# MCP Server Dockerfile for Railway deployment
FROM node:18-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S mcpuser -u 1001
USER mcpuser

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Security: Set secure environment defaults
ENV NODE_ENV=production
ENV SESSION_SECURE=true
ENV REQUIRE_TOKEN_VALIDATION=true

# MCP configuration
ENV MCP_TRANSPORT=http
ENV MCP_ENDPOINT=/mcp

# Expose port (Railway provides PORT env var)
EXPOSE $PORT

# Health check for MCP endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:$PORT/mcp || exit 1

# Start command - Railway will provide PORT
CMD ["node", "server.js", "--port", "$PORT", "--transport", "http"]
`;
}

/**
 * Create railway.json configuration for MCP deployment
 */
export function generateRailwayConfig(startCommand?: string): any {
  return {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "DOCKERFILE"
    },
    "deploy": {
      "startCommand": startCommand || "node server.js --port $PORT --transport http",
      "healthcheckPath": "/mcp",
      "healthcheckTimeout": 30,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  };
} 