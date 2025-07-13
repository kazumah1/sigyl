import { SecurityReport } from '../container-builder/dist/types/security';
import { SigylConfigUnion } from '../container-builder/dist/types/config';
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
    serviceAccountKey?: string;
    keyFilePath?: string;
}
/**
 * Google Cloud Run service for deploying MCP servers with security validation
 * Provides 60-75% cost savings compared to Railway while maintaining security
 */
export declare class CloudRunService {
    private config;
    private region;
    private projectId;
    private auth;
    constructor(config: CloudRunConfig);
    /**
     * Get access token for API calls using JWT-based OAuth 2.0 flow.
     * Creates a fresh GoogleAuth instance each time to ensure environment variables are picked up correctly.
     */
    private getAccessToken;
    /**
     * Deploy MCP server to Google Cloud Run with security validation
     */
    deployMCPServer(request: CloudRunDeploymentRequest): Promise<CloudRunDeploymentResult>;
    /**
     * Validate MCP security before deployment
     */
    private validateSecurity;
    /**
     * Build Node.js runtime MCP server using Cloud Build REST API
     */
    private buildNodeRuntime;
    /**
     * Build container runtime MCP server using Cloud Build REST API
     */
    private buildContainerRuntime;
    /**
     * Wait for Cloud Build to complete
     */
    private waitForBuildCompletion;
    /**
     * Generate Dockerfile for Node.js runtime
     */
    private generateNodeDockerfile;
    /**
     * Set IAM policy to allow unauthenticated invocations (allUsers as roles/run.invoker)
     */
    allowUnauthenticated(serviceName: string): Promise<void>;
    /**
     * Deploy service to Google Cloud Run using REST API
     */
    private deployToCloudRun;
    /**
     * Get deployment logs from Cloud Logging
     */
    getDeploymentLogs(serviceName: string, limit?: number): Promise<string[]>;
    /**
     * Delete Cloud Run service
     */
    deleteService(serviceName: string): Promise<boolean>;
    /**
     * Restart Cloud Run service by updating traffic allocation
     */
    restartService(serviceName: string): Promise<boolean>;
    /**
     * Helper methods for Google Cloud API calls
     */
    private cloudRunRequest;
    private loggingRequest;
    private generateServiceHash;
}
/**
 * Generate Sigyl MCP-specific Dockerfile for Google Cloud Run deployment
 * @deprecated Use generateNodeDockerfile or custom Dockerfile with container runtime
 */
export declare function generateMCPDockerfile(packageJson?: any): string;
/**
 * Generate Sigyl configuration template
 */
export declare function generateSigylConfig(options: {
    runtime: 'node' | 'container';
    language?: 'typescript' | 'javascript';
    entryPoint?: string;
    dockerfile?: string;
    configSchema?: any;
}): SigylConfigUnion;
/**
 * Generate Google Cloud Run configuration for MCP deployment
 */
export declare function generateCloudRunConfig(options?: {
    cpu?: string;
    memory?: string;
    maxScale?: number;
    minScale?: number;
    environment?: Record<string, string>;
}): any;
//# sourceMappingURL=cloudRunService.d.ts.map