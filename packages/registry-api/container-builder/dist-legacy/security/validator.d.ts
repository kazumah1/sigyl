import { SecurityReport } from '../types/security';
export declare class MCPSecurityValidator {
    private octokit?;
    private patternMatcher;
    private repositoryAnalyzer;
    constructor(githubToken?: string);
    /**
     * Main security validation method
     * Scans a repository for security vulnerabilities
     */
    validateMCPSecurity(repoUrl: string, branch?: string, localPath?: string): Promise<SecurityReport>;
    /**
     * Analyze local repository (for testing)
     */
    private analyzeLocalRepository;
    /**
     * Scan files for security vulnerabilities using patterns
     */
    private scanForVulnerabilities;
    /**
     * Validate MCP configuration for security issues
     */
    private validateMCPConfiguration;
    /**
     * Generate comprehensive security report
     */
    private generateSecurityReport;
    /**
     * Generate security recommendations based on findings
     */
    private generateRecommendations;
    /**
     * Build repository analysis from files
     */
    private buildRepositoryAnalysis;
    /**
     * Detect file language from extension
     */
    private detectLanguage;
    /**
     * Get documentation URL for vulnerability type
     */
    private getDocumentationUrl;
    /**
     * Log critical security findings
     */
    private logCriticalFindings;
    /**
     * Check if deployment should be blocked
     */
    isDeploymentBlocked(report: SecurityReport): boolean;
    /**
     * Get human-readable security summary
     */
    getSecuritySummary(report: SecurityReport): string;
}
//# sourceMappingURL=validator.d.ts.map