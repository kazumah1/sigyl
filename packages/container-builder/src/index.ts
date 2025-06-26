export { MCPSecurityValidator } from './security/validator';
export { PatternMatcher } from './security/patternMatcher';
export { RepositoryAnalyzer } from './security/repositoryAnalyzer';
export { SECURITY_PATTERNS, getBlockingPatterns, getPatternsByType, getPatternsBySeverity } from './security/patterns';

// Railway deployment service
export { RailwayService, generateMCPDockerfile, generateRailwayConfig } from './railway/railwayService';
export type { RailwayDeploymentRequest, RailwayDeploymentResult, RailwayConfig } from './railway/railwayService';

export * from './types/security';

// Legacy function - replaced with security-first approach
export async function buildMCPDockerfile(sourceDir: string, outDir: string) {
  console.warn('⚠️ buildMCPDockerfile is deprecated. Use RailwayService for secure container building and deployment.');
  // TODO: Implement secure MCP container building
} 