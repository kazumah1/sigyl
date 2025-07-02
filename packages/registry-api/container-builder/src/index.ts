// Security validation
export { MCPSecurityValidator } from './security/validator';
export type { SecurityReport, SecurityVulnerability, SecurityPattern } from './types/security';

// Sigyl configuration types
export type { 
  SigylConfig, 
  SigylConfigUnion, 
  NodeRuntimeConfig, 
  ContainerRuntimeConfig,
  ConfigSchema,
  ConfigProperty,
  MCPConfig // Legacy - for migration
} from './types/config';

// Google Cloud Run deployment service (replaces Railway and AWS)
export { 
  CloudRunService, 
  generateMCPDockerfile, // Deprecated
  generateSigylConfig 
} from './gcp/cloudRunService';
export type { 
  CloudRunDeploymentRequest, 
  CloudRunDeploymentResult, 
  CloudRunConfig 
} from './gcp/cloudRunService';

export * from './types/security';

// Legacy function - replaced with security-first approach
export async function buildMCPDockerfile(sourceDir: string, outDir: string) {
  console.warn('⚠️ buildMCPDockerfile is deprecated. Use CloudRunService with Sigyl schema instead.');
  console.warn('📋 Migrate to sigyl.yaml with runtime: "node" or runtime: "container"');
  // TODO: Implement secure MCP container building with new schema
} 