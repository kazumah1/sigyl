// Security validation
export { MCPSecurityValidator } from './security/validator';
export type { SecurityReport, SecurityVulnerability, SecurityPattern } from './types/security';

// Google Cloud Run deployment service (replaces Railway and AWS)
export { CloudRunService, generateMCPDockerfile, generateCloudRunConfig } from './gcp/cloudRunService';
export type { CloudRunDeploymentRequest, CloudRunDeploymentResult, CloudRunConfig } from './gcp/cloudRunService';

export * from './types/security';

// Legacy function - replaced with security-first approach
export async function buildMCPDockerfile(sourceDir: string, outDir: string) {
  console.warn('⚠️ buildMCPDockerfile is deprecated. Use CloudRunService for secure container building and deployment.');
  // TODO: Implement secure MCP container building
} 