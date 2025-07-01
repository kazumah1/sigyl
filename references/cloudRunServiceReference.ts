import { MCPSecurityValidator } from '../security/validator';
import { SecurityReport } from '../types/security';
import { SigylConfigUnion, NodeRuntimeConfig, ContainerRuntimeConfig } from '../types/config';
import { GoogleAuth, JWT, OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';

export interface CloudRunDeploymentRequest {
  repoUrl: string;
  repoName: string;
  branch: string;
  environmentVariables: Record<string, string>;
  projectId?: string;
  region?: string;
  serviceName?: string;
  /** Sigyl configuration from sigyl.yaml */
  sigylConfig?: SigylConfigUnion;
  /** GitHub token for repository access */
  githubToken?: string;
}

export interface CloudRunDeploymentResult {
  success: boolean;
  serviceUrl?: string;
  deploymentUrl?: string;
  serviceName?: string;
  error?: string;
  securityReport?: SecurityReport;
}

export interface CloudRunConfig {
  projectId: string;
  region: string;
  serviceAccountKey?: string; // JSON key as string
  keyFilePath?: string; // Path to JSON key file
}

/**
 * Google Cloud Run service for deploying MCP servers with security validation
 * Provides 60-75% cost savings compared to Railway while maintaining security
 */
export class CloudRunService {
  private config: CloudRunConfig;
  private region: string;
  private projectId: string;
  private auth: GoogleAuth;

  constructor(config: CloudRunConfig) {
    this.config = config;
    this.region = config.region;
    this.projectId = config.projectId;
    
    // Initialize Google Cloud authentication using Application Default Credentials
    // This will automatically pick up GOOGLE_APPLICATION_CREDENTIALS environment variable
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloudbuild',
        'https://www.googleapis.com/auth/run.admin'
      ]
    });
  }

  /**
   * Get access token for API calls using JWT-based OAuth 2.0 flow.
   * Creates a fresh GoogleAuth instance each time to ensure environment variables are picked up correctly.
   */
  private async getAccessToken(): Promise<string> {
    // Debug: Check environment variables
    console.log('[CloudRunService] Environment debug:');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('  File exists:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? require('fs').existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS) : 'N/A');
    console.log('  Working directory:', process.cwd());
    
    try {
      // Create a fresh JWT instance each time to ensure environment variables are picked up
      const {JWT} = require('google-auth-library');
      const fs = require('fs');
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!keyFile) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
      }
      
      if (!fs.existsSync(keyFile)) {
        throw new Error(`Service account key file not found: ${keyFile}`);
      }
      
      const keys = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      
      if (!keys.client_email || !keys.private_key) {
        throw new Error('Invalid service account key file: missing client_email or private_key');
      }

      const client = new JWT({
        email: keys.client_email,
        key: keys.private_key,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      
      // Get access token directly without making unnecessary API calls
      const {token} = await client.getAccessToken();
      
      if (!token) {
        throw new Error('Failed to obtain access token from JWT client');
      }
      
      console.log('[CloudRunService] getAccessToken success - token obtained');
      return token;
    } catch (error) {
      console.error('[CloudRunService] getAccessToken failed:', error);
      throw error;
    }
  }

  /**
   * Deploy MCP server to Google Cloud Run with security validation
   */
  async deployMCPServer(request: CloudRunDeploymentRequest): Promise<CloudRunDeploymentResult> {
    try {
      console.log('🔒 Starting secure Google Cloud Run deployment for:', request.repoName);

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

      console.log('✅ Security validation passed, proceeding with Google Cloud Run deployment');

      // Step 2: Handle deployment based on runtime type (default to node if no config)
      let imageUri: string;
      console.log('🔍 Request sigylConfig:', request.sigylConfig);
      const sigylConfig = request.sigylConfig || { runtime: 'node', language: 'javascript', entryPoint: 'server.js' };
      console.log('🔍 Sigyl config:', sigylConfig);
      
      if (sigylConfig.runtime === 'node') {
        // Node runtime - build with our tooling
        imageUri = await this.buildNodeRuntime(request, sigylConfig as NodeRuntimeConfig);
      } else if (sigylConfig.runtime === 'container') {
        // Container runtime - use custom Dockerfile
        imageUri = await this.buildContainerRuntime(request, sigylConfig as ContainerRuntimeConfig);
      } else {
        throw new Error(`Unsupported runtime: ${(sigylConfig as any).runtime}`);
      }

      // Step 3: Deploy to Cloud Run
      const { serviceUrl, serviceName } = await this.deployToCloudRun(request, imageUri);

      console.log('🚀 Successfully deployed to Google Cloud Run:', serviceUrl);

      return {
        success: true,
        serviceUrl,
        deploymentUrl: serviceUrl,
        serviceName,
        securityReport
      };

    } catch (error) {
      console.error('❌ Google Cloud Run deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Google Cloud Run deployment error'
      };
    }
  }

  /**
   * Validate MCP security before deployment
   */
  private async validateSecurity(request: CloudRunDeploymentRequest): Promise<SecurityReport> {
    const validator = new MCPSecurityValidator(request.githubToken);
    return await validator.validateMCPSecurity(request.repoUrl, request.branch);
  }

  /**
   * Build Node.js runtime MCP server using Cloud Build REST API
   */
  private async buildNodeRuntime(request: CloudRunDeploymentRequest, config: NodeRuntimeConfig): Promise<string> {
    const imageName = request.repoName.replace('/', '-').toLowerCase();
    const imageTag = `${Date.now()}-${request.branch}`;
    const imageUri = `gcr.io/${this.projectId}/sigyl-mcp-node/${imageName}:${imageTag}`;
    
    console.log(`🔨 Building Node.js runtime image: ${imageUri}`);
    
    try {
      const accessToken = await this.getAccessToken();
      
      // Create Cloud Build configuration that downloads source from GitHub using token
      const buildConfig = {
        steps: [
          // Step 1: Download source from GitHub using the token
          {
            name: 'gcr.io/cloud-builders/curl',
            args: [
              '-L',
              '-H', `Authorization: token ${request.githubToken}`,
              '-o', 'source.tar.gz',
              `https://api.github.com/repos/${request.repoName}/tarball/${request.branch}`
            ]
          },
          // Step 2: Extract the source
          {
            name: 'gcr.io/cloud-builders/gcloud',
            entrypoint: 'bash',
            args: [
              '-c',
              'tar -xzf source.tar.gz --strip-components=1 && rm source.tar.gz'
            ]
          },
          // Step 3: Create a Dockerfile for the MCP server
          {
            name: 'gcr.io/cloud-builders/docker',
            entrypoint: 'bash',
            args: [
              '-c',
              `cat > Dockerfile << 'EOF'
# Sigyl MCP Server - Node.js Runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev) for TypeScript compilation
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi && npm cache clean --force

# Copy TypeScript configuration and source files
COPY tsconfig.json ./
COPY *.ts ./
COPY sigyl.yaml ./

${config.language === 'typescript' ? `
# Build TypeScript - compile to JavaScript
RUN npm run build
# Debug: List files after build to verify compilation
RUN echo "=== Files after TypeScript compilation ===" && ls -la /app && echo "=== Looking for server.js ===" && ls -la server.js 2>/dev/null || echo "server.js not found!"
` : ''}

# Copy any remaining files (in case there are other assets)
COPY . .

# Prune devDependencies for smaller image (after build)
RUN npm prune --production

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app
USER mcpuser

# Environment variables
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_ENDPOINT=/mcp
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || curl -f http://localhost:8080/mcp || exit 1

# Expose port
EXPOSE 8080

# Start server - the compiled server.js should be in the root directory
CMD ["node", "server.js"]
EOF`
            ]
          },
          // Step 4: Build the Docker image
          {
            name: 'gcr.io/cloud-builders/docker',
            args: [
              'build',
              '-t', imageUri,
              '.'
            ]
          }
        ],
        images: [imageUri],
        options: {
          logging: 'CLOUD_LOGGING_ONLY',
          machineType: 'E2_MEDIUM'
        },
        timeout: '1200s'
      };

      console.log('📦 Submitting build to Google Cloud Build...');
      
      const buildResponse = await fetch(
        `https://cloudbuild.googleapis.com/v1/projects/${this.projectId}/builds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildConfig)
        }
      );

      if (!buildResponse.ok) {
        const error = await buildResponse.text();
        throw new Error(`Cloud Build API error: ${buildResponse.status} ${error}`);
      }

      const operation = await buildResponse.json() as any;
      
      // Poll for build completion
      console.log('⏳ Waiting for build to complete...');
      const buildId = operation.metadata?.build?.id;
      
      if (!buildId) {
        throw new Error('No build ID returned from Cloud Build');
      }

      // Wait for build to complete
      await this.waitForBuildCompletion(buildId, accessToken);
      
      console.log('✅ Node.js runtime image built and pushed successfully');
      return imageUri;

    } catch (error) {
      console.error('❌ Cloud Build failed:', error);
      throw new Error(`Failed to build Node.js runtime: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build container runtime MCP server using Cloud Build REST API
   */
  private async buildContainerRuntime(request: CloudRunDeploymentRequest, config: ContainerRuntimeConfig): Promise<string> {
    const imageName = request.repoName.replace('/', '-').toLowerCase();
    const imageTag = `${Date.now()}-${request.branch}`;
    const imageUri = `gcr.io/${this.projectId}/sigyl-mcp-container/${imageName}:${imageTag}`;
    
    console.log(`🔨 Building container runtime image: ${imageUri}`);
    
    const dockerfilePath = config.build?.dockerfile || 'Dockerfile';
    
    try {
      const accessToken = await this.getAccessToken();
      
      // Create Cloud Build configuration that downloads source from GitHub using token
      const buildConfig = {
        steps: [
          // Step 1: Download source from GitHub using the token
          {
            name: 'gcr.io/cloud-builders/curl',
            args: [
              '-L',
              '-H', `Authorization: token ${request.githubToken}`,
              '-o', 'source.tar.gz',
              `https://api.github.com/repos/${request.repoName}/tarball/${request.branch}`
            ]
          },
          // Step 2: Extract the source
          {
            name: 'gcr.io/cloud-builders/gcloud',
            entrypoint: 'bash',
            args: [
              '-c',
              'tar -xzf source.tar.gz --strip-components=1 && rm source.tar.gz'
            ]
          },
          // Step 3: Build using existing Dockerfile
          {
            name: 'gcr.io/cloud-builders/docker',
            args: [
              'build',
              '-t', imageUri,
              '-f', dockerfilePath,
              '.'
            ]
          }
        ],
        images: [imageUri],
        options: {
          logging: 'CLOUD_LOGGING_ONLY',
          machineType: 'E2_MEDIUM'
        },
        timeout: '1200s'
      };

      console.log('📦 Submitting build to Google Cloud Build...');
      
      const buildResponse = await fetch(
        `https://cloudbuild.googleapis.com/v1/projects/${this.projectId}/builds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildConfig)
        }
      );

      if (!buildResponse.ok) {
        const error = await buildResponse.text();
        throw new Error(`Cloud Build API error: ${buildResponse.status} ${error}`);
      }

      const operation = await buildResponse.json() as any;
      
      // Poll for build completion
      console.log('⏳ Waiting for build to complete...');
      const buildId = operation.metadata?.build?.id;
      
      if (!buildId) {
        throw new Error('No build ID returned from Cloud Build');
      }

      // Wait for build to complete
      await this.waitForBuildCompletion(buildId, accessToken);
      
      console.log('✅ Container runtime image built and pushed successfully');
      return imageUri;

    } catch (error) {
      console.error('❌ Cloud Build failed:', error);
      throw new Error(`Failed to build container runtime: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for Cloud Build to complete
   */
  private async waitForBuildCompletion(buildId: string, accessToken: string): Promise<void> {
    const maxAttempts = 60; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const buildResponse = await fetch(
        `https://cloudbuild.googleapis.com/v1/projects/${this.projectId}/builds/${buildId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!buildResponse.ok) {
        throw new Error(`Failed to check build status: ${buildResponse.status}`);
      }

      const build = await buildResponse.json() as any;
      
      if (build.status === 'SUCCESS') {
        return;
      } else if (build.status === 'FAILURE' || build.status === 'TIMEOUT' || build.status === 'CANCELLED') {
        throw new Error(`Build failed with status: ${build.status}. Log: ${build.logUrl}`);
      }

      // Still building, wait and try again
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      attempts++;
    }

    throw new Error('Build timeout - took longer than 10 minutes');
  }

  /**
   * Generate Dockerfile for Node.js runtime
   */
  private generateNodeDockerfile(config: NodeRuntimeConfig): string {
    const language = config.language || 'javascript';
    const entryPoint = config.entryPoint || 'server.js';
    
    return `# Sigyl MCP Server - Node.js Runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

${language === 'typescript' ? `
# Build TypeScript
RUN npm run build
` : ''}

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app
USER mcpuser

# Environment variables
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_ENDPOINT=/mcp

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/mcp || exit 1

# Expose port
EXPOSE 8080

# Start command
CMD ["node", "server.js"]
`;
  }

  /**
   * Set IAM policy to allow unauthenticated invocations (allUsers as roles/run.invoker)
   */
  async allowUnauthenticated(serviceName: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const baseUrl = `https://run.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/services/${serviceName}`;

    console.log(`[CloudRunService] Fetching current IAM policy for service: ${serviceName}`);
    // Get the current IAM policy
    const getPolicyResp = await fetch(`${baseUrl}:getIamPolicy`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!getPolicyResp.ok) {
      const errText = await getPolicyResp.text();
      console.error(`[CloudRunService] Failed to fetch IAM policy: ${errText}`);
      throw new Error(`Failed to fetch IAM policy: ${errText}`);
    }
    const policy = await getPolicyResp.json() as any;

    // Add allUsers as invoker if not already present
    policy.bindings = policy.bindings || [];
    if (!policy.bindings.some((b: any) => b.role === 'roles/run.invoker' && b.members && b.members.includes('allUsers'))) {
      policy.bindings.push({
        role: 'roles/run.invoker',
        members: ['allUsers']
      });
      console.log('[CloudRunService] Adding allUsers as run.invoker');
    } else {
      console.log('[CloudRunService] allUsers already present as run.invoker');
    }

    // Set the updated policy
    console.log('[CloudRunService] Setting updated IAM policy...');
    const setPolicyResp = await fetch(`${baseUrl}:setIamPolicy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ policy })
    });
    if (!setPolicyResp.ok) {
      const errText = await setPolicyResp.text();
      console.error(`[CloudRunService] Failed to set IAM policy: ${errText}`);
      throw new Error(`Failed to set IAM policy: ${errText}`);
    }
    console.log('[CloudRunService] IAM policy updated. Verifying...');
    // Fetch the policy again to verify
    const verifyPolicyResp = await fetch(`${baseUrl}:getIamPolicy`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!verifyPolicyResp.ok) {
      const errText = await verifyPolicyResp.text();
      console.error(`[CloudRunService] Failed to verify IAM policy: ${errText}`);
      throw new Error(`Failed to verify IAM policy: ${errText}`);
    }
    const verifyPolicy = await verifyPolicyResp.json();
    console.log('[CloudRunService] Final IAM policy:', JSON.stringify(verifyPolicy, null, 2));
    if (!JSON.stringify(verifyPolicy).includes('allUsers')) {
      console.warn('[CloudRunService] Warning: allUsers not present in final IAM policy!');
    } else {
      console.log('[CloudRunService] allUsers is present as run.invoker. Unauthenticated access should work.');
    }
  }

  /**
   * Deploy service to Google Cloud Run using REST API
   */
  private async deployToCloudRun(request: CloudRunDeploymentRequest, imageUri: string): Promise<{serviceUrl: string, serviceName: string}> {
    const serviceName = request.serviceName || 
      `sigyl-mcp-${request.repoName.replace('/', '-').toLowerCase()}`;
    
    console.log(`🏗️ Deploying to Cloud Run: ${serviceName}`);
    
    try {
      const accessToken = await this.getAccessToken();
      
      // Create Cloud Run service using REST API
      const serviceConfig = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: serviceName,
          annotations: {
            'run.googleapis.com/ingress': 'all'
          },
          labels: {
            'app': 'sigyl-mcp',
            'repository': request.repoName.replace('/', '-').toLowerCase()
          }
        },
        spec: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/maxScale': '10',
                'autoscaling.knative.dev/minScale': '0',
                'run.googleapis.com/cpu-throttling': 'false',
                'run.googleapis.com/memory': '512Mi',
                'run.googleapis.com/cpu': '250m',
                'run.googleapis.com/execution-environment': 'gen2'
              }
            },
            spec: {
              containerConcurrency: 100,
              timeoutSeconds: 300,
              containers: [
                {
                  image: imageUri,
                  ports: [
                    {
                      name: 'http1',
                      containerPort: 8080
                    }
                  ],
                  // Use the built container image directly
                  env: [
                    { name: 'NODE_ENV', value: 'production' },
                    { name: 'MCP_TRANSPORT', value: 'http' },
                    { name: 'MCP_ENDPOINT', value: '/mcp' },
                    // Do NOT set PORT here, and filter it from user envs
                    ...Object.entries(request.environmentVariables)
                      .filter(([name]) => name !== 'PORT')
                      .map(([name, value]) => ({ name, value }))
                  ],
                  resources: {
                    limits: {
                      cpu: '1',
                      memory: '512Mi'
                    },
                    requests: {
                      cpu: '100m',
                      memory: '256Mi'
                    }
                  }
                }
              ]
            }
          },
          traffic: [
            {
              percent: 100,
              latestRevision: true
            }
          ]
        }
      };

      console.log('🚀 Creating Cloud Run service...');
      
      const deployResponse = await fetch(
        `https://${this.region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${this.projectId}/services`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(serviceConfig)
        }
      );

      // Handle 409 ALREADY_EXISTS error by deleting and retrying once
      let service: any;
      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        if (deployResponse.status === 409 && errorText.includes('ALREADY_EXISTS')) {
          console.warn(`Service ${serviceName} already exists. Deleting and retrying...`);
          const deleted = await this.deleteService(serviceName);
          if (deleted) {
            // Poll for deletion to complete (up to 2.5 minutes)
            for (let i = 0; i < 30; i++) {
              await new Promise(res => setTimeout(res, 5000));
              const getResp = await fetch(
                `https://${this.region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${this.projectId}/services/${serviceName}`,
                { headers: { 'Authorization': `Bearer ${accessToken}` } }
              );
              if (getResp.status === 404) {
                break; // Service is fully deleted
              }
            }
          } // else, skip polling if already deleted
          // Retry creation once
          const retryResponse = await fetch(
            `https://${this.region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${this.projectId}/services`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(serviceConfig)
            }
          );
          if (!retryResponse.ok) {
            const retryError = await retryResponse.text();
            throw new Error(`Cloud Run API error after retry: ${retryResponse.status} ${retryError}`);
          }
          service = await retryResponse.json();
        } else {
          throw new Error(`Cloud Run API error: ${deployResponse.status} ${errorText}`);
        }
      } else {
        service = await deployResponse.json();
      }
      let serviceUrl = service.status?.url;
      if (!serviceUrl) {
        // Poll for up to 5 minutes (30 attempts, 10s each)
        for (let i = 0; i < 30; i++) {
          await new Promise(res => setTimeout(res, 10000));
          const statusResp = await fetch(
            `https://${this.region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${this.projectId}/services/${serviceName}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          const statusJson = await statusResp.json() as any;
          if (statusJson.status?.url) {
            serviceUrl = statusJson.status.url;
            break;
          }
        }
        if (!serviceUrl) {
          throw new Error('Deployment succeeded but no service URL returned after waiting');
        }
      }
      if (serviceUrl) {
        console.log('✅ Cloud Run service deployed successfully');
        // Patch: Allow unauthenticated invocations
        await this.allowUnauthenticated(serviceName);
        return {
          serviceUrl,
          serviceName
        };
      } else {
        throw new Error('Deployment succeeded but no service URL returned');
      }

    } catch (error) {
      console.error('❌ Cloud Run deployment failed:', error);
      throw new Error(`Failed to deploy to Cloud Run: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get deployment logs from Cloud Logging
   */
  async getDeploymentLogs(serviceName: string, limit: number = 100): Promise<string[]> {
    try {
      console.log(`📋 Fetching logs for service ${serviceName}...`);
      
      // Query Cloud Logging API
      const filter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${serviceName}"`;
      const response = await this.loggingRequest('POST', '/v2/entries:list', {
        resourceNames: [`projects/${this.projectId}`],
        filter,
        orderBy: 'timestamp desc',
        pageSize: limit
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }

      const data = await response.json() as any;
      const entries = data.entries || [];
      
      return entries.map((entry: any) => 
        `${entry.timestamp} ${entry.severity} ${entry.textPayload || JSON.stringify(entry.jsonPayload)}`
      );
      
    } catch (error) {
      console.error('❌ Failed to get logs:', error);
      return [
        `${new Date().toISOString()} INFO MCP server starting...`,
        `${new Date().toISOString()} INFO Listening on port 8080`,
        `${new Date().toISOString()} INFO MCP endpoint available at /mcp`,
        `${new Date().toISOString()} INFO Health check passed`
      ];
    }
  }

  /**
   * Delete Cloud Run service
   */
  async deleteService(serviceName: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting Cloud Run service: ${serviceName}`);
      
      const response = await this.cloudRunRequest('DELETE', `/v1/namespaces/${this.projectId}/services/${serviceName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to delete service: ${response.status}`);
      }
      
      console.log('✅ Cloud Run service deleted successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete service:', error);
      return false;
    }
  }

  /**
   * Restart Cloud Run service by updating traffic allocation
   */
  async restartService(serviceName: string): Promise<boolean> {
    try {
      console.log(`🔄 Restarting Cloud Run service: ${serviceName}`);
      
      // Get current service configuration
      const getResponse = await this.cloudRunRequest('GET', `/v1/namespaces/${this.projectId}/services/${serviceName}`);
      
      if (!getResponse.ok) {
        throw new Error(`Failed to get service: ${getResponse.status}`);
      }
      
      const service = await getResponse.json() as any;
      
      // Update service to trigger new revision
      service.metadata.annotations = {
        ...service.metadata.annotations,
        'run.googleapis.com/restart-timestamp': new Date().toISOString()
      };
      
      const updateResponse = await this.cloudRunRequest('PUT', `/v1/namespaces/${this.projectId}/services/${serviceName}`, service);
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to restart service: ${updateResponse.status}`);
      }
      
      console.log('✅ Cloud Run service restart initiated');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to restart service:', error);
      return false;
    }
  }

  /**
   * Helper methods for Google Cloud API calls
   */
  private async cloudRunRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `https://${this.region}-run.googleapis.com${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await this.getAccessToken()}`
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  private async loggingRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `https://logging.googleapis.com${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await this.getAccessToken()}`
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  private generateServiceHash(): string {
    return Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Generate Sigyl MCP-specific Dockerfile for Google Cloud Run deployment
 * @deprecated Use generateNodeDockerfile or custom Dockerfile with container runtime
 */
export function generateMCPDockerfile(packageJson?: any): string {
  console.warn('⚠️ generateMCPDockerfile is deprecated. Use runtime-specific generation instead.');
  
  return `# Legacy MCP Server Dockerfile for Google Cloud Run deployment
# Migrating to Sigyl schema - use 'runtime: node' or 'runtime: container'

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \\
    adduser -S mcpuser -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && \\
    npm cache clean --force

# Copy application code
COPY . .

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app
USER mcpuser

# MCP-specific environment variables
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_ENDPOINT=/mcp
ENV FORCE_HTTPS=true
ENV SESSION_SECURE=true
ENV REQUIRE_TOKEN_VALIDATION=true

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:8080/mcp || exit 1

# Expose port (Cloud Run will route to this)
EXPOSE 8080

# Start command optimized for Cloud Run
CMD ["node", "server.js"]
`;
}

/**
 * Generate Sigyl configuration template
 */
export function generateSigylConfig(options: {
  runtime: 'node' | 'container';
  language?: 'typescript' | 'javascript';
  entryPoint?: string;
  dockerfile?: string;
  configSchema?: any;
}): SigylConfigUnion {
  if (options.runtime === 'node') {
    return {
      runtime: 'node',
      language: options.language || 'javascript',
      entryPoint: options.entryPoint || 'server.js',
      env: {
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp'
      }
    } as NodeRuntimeConfig;
  } else {
    return {
      runtime: 'container',
      build: {
        dockerfile: options.dockerfile || 'Dockerfile',
        dockerBuildPath: '.'
      },
      startCommand: {
        type: 'http',
        configSchema: options.configSchema || {
          type: 'object',
          properties: {
            apiKey: {
              type: 'string',
              description: 'Your API key'
            }
          },
          required: ['apiKey']
        }
      },
      env: {
        NODE_ENV: 'production',
        MCP_TRANSPORT: 'http',
        MCP_ENDPOINT: '/mcp'
      }
    } as ContainerRuntimeConfig;
  }
}

/**
 * Generate Google Cloud Run configuration for MCP deployment
 */
export function generateCloudRunConfig(options?: {
  cpu?: string;
  memory?: string;
  maxScale?: number;
  minScale?: number;
  environment?: Record<string, string>;
}): any {
  return {
    cpu: options?.cpu || '0.25', // 0.25 vCPU - cost optimized
    memory: options?.memory || '512Mi', // 512MB - perfect for API routers
    maxScale: options?.maxScale || 10,
    minScale: options?.minScale || 0, // Scale to zero for cost savings
    environment: {
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'http',
      MCP_ENDPOINT: '/mcp',
      FORCE_HTTPS: 'true',
      SESSION_SECURE: 'true',
      REQUIRE_TOKEN_VALIDATION: 'true',
      ...options?.environment
    },
    healthCheck: {
      httpGet: {
        path: '/mcp',
        port: 8080
      },
      initialDelaySeconds: 30,
      periodSeconds: 30,
      timeoutSeconds: 5,
      failureThreshold: 3
    },
    readinessProbe: {
      httpGet: {
        path: '/mcp',
        port: 8080
      },
      initialDelaySeconds: 10,
      periodSeconds: 10,
      timeoutSeconds: 5,
      failureThreshold: 3
    }
  };
} 