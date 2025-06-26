import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';

import {
  SecurityReport,
  SecurityVulnerability,
  SecuritySeverity,
  RepositoryAnalysis,
  FileAnalysis,
  MCPConfig,
  MCPConfigSchema,
  PatternMatch
} from '../types/security';
import { SECURITY_PATTERNS, getBlockingPatterns } from './patterns';
import { PatternMatcher } from './patternMatcher';
import { RepositoryAnalyzer } from './repositoryAnalyzer';

export class MCPSecurityValidator {
  private octokit?: Octokit;
  private patternMatcher: PatternMatcher;
  private repositoryAnalyzer: RepositoryAnalyzer;

  constructor(githubToken?: string) {
    if (githubToken) {
      this.octokit = new Octokit({ auth: githubToken });
    }
    this.patternMatcher = new PatternMatcher();
    this.repositoryAnalyzer = new RepositoryAnalyzer(this.octokit);
  }

  /**
   * Main security validation method
   * Scans a repository for security vulnerabilities
   */
  async validateMCPSecurity(
    repoUrl: string, 
    branch: string = 'main',
    localPath?: string
  ): Promise<SecurityReport> {
    console.log(`🔒 Starting security validation for ${repoUrl}:${branch}`);
    
    try {
      // Step 1: Analyze repository structure and files
      const repoAnalysis = localPath 
        ? await this.analyzeLocalRepository(localPath)
        : await this.repositoryAnalyzer.analyzeRepository(repoUrl, branch);

      console.log(`📁 Analyzed ${repoAnalysis.files.length} files in repository`);

      // Step 2: Scan for security patterns
      const vulnerabilities = await this.scanForVulnerabilities(repoAnalysis);

      console.log(`🔍 Found ${vulnerabilities.length} potential security issues`);

      // Step 3: Generate security report
      const report = this.generateSecurityReport(
        repoUrl,
        branch,
        vulnerabilities,
        repoAnalysis
      );

      // Step 4: Log critical findings
      this.logCriticalFindings(report);

      return report;

    } catch (error) {
      console.error('❌ Security validation failed:', error);
      throw new Error(`Security validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze local repository (for testing)
   */
  private async analyzeLocalRepository(localPath: string): Promise<RepositoryAnalysis> {
    const files: FileAnalysis[] = [];
    
    // Find all relevant files
    const patterns = [
      '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx',
      '**/*.json', '**/*.yaml', '**/*.yml', 
      '**/package.json', '**/Dockerfile', '**/mcp.yaml', '**/smithery.yaml'
    ];

    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        cwd: localPath,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**']
      });

      for (const match of matches) {
        const filePath = path.join(localPath, match);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const stats = await fs.stat(filePath);
          
          files.push({
            path: match,
            content,
            language: this.detectLanguage(match),
            size: stats.size
          });
        } catch (error) {
          console.warn(`⚠️ Could not read file ${match}:`, error);
        }
      }
    }

    return this.buildRepositoryAnalysis(files);
  }

  /**
   * Scan files for security vulnerabilities using patterns
   */
  private async scanForVulnerabilities(repoAnalysis: RepositoryAnalysis): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Scan each file against security patterns
    for (const file of repoAnalysis.files) {
      const matches = this.patternMatcher.findPatternMatches(file, SECURITY_PATTERNS);
      
      for (const match of matches) {
        vulnerabilities.push({
          type: match.pattern.type,
          severity: match.pattern.severity,
          title: match.pattern.name,
          description: match.pattern.description,
          file: match.file,
          line: match.line,
          column: match.column,
          evidence: match.match,
          fix: match.pattern.fix,
          documentation: this.getDocumentationUrl(match.pattern.type)
        });
      }
    }

    // Add configuration-based vulnerabilities
    if (repoAnalysis.mcpConfig) {
      const configVulns = this.validateMCPConfiguration(repoAnalysis.mcpConfig);
      vulnerabilities.push(...configVulns);
    }

    return vulnerabilities;
  }

  /**
   * Validate MCP configuration for security issues
   */
  private validateMCPConfiguration(config: MCPConfig): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for token passthrough configuration
    if (config.security?.allowTokenPassthrough === true) {
      vulnerabilities.push({
        type: 'token_passthrough' as any,
        severity: SecuritySeverity.BLOCK,
        title: 'Token Passthrough Enabled in Configuration',
        description: 'Configuration explicitly allows token passthrough, which violates MCP security best practices.',
        file: 'mcp.yaml/smithery.yaml',
        evidence: 'allowTokenPassthrough: true',
        fix: 'Set allowTokenPassthrough: false or remove this setting entirely.',
        documentation: this.getDocumentationUrl('token_passthrough' as any)
      });
    }

    // Check for insecure session configuration
    if (config.security?.sessionConfig) {
      const sessionConfig = config.security.sessionConfig;
      
      if (sessionConfig.secure === false) {
        vulnerabilities.push({
          type: 'session_hijacking' as any,
          severity: SecuritySeverity.ERROR,
          title: 'Insecure Session Configuration',
          description: 'Session cookies are configured as insecure (secure: false).',
          file: 'mcp.yaml/smithery.yaml',
          evidence: 'security.sessionConfig.secure: false',
          fix: 'Set security.sessionConfig.secure: true',
          documentation: this.getDocumentationUrl('session_hijacking' as any)
        });
      }

      if (sessionConfig.sameSite === 'none') {
        vulnerabilities.push({
          type: 'session_hijacking' as any,
          severity: SecuritySeverity.WARNING,
          title: 'Permissive SameSite Cookie Policy',
          description: 'Session cookies allow cross-site requests (sameSite: none).',
          file: 'mcp.yaml/smithery.yaml',
          evidence: 'security.sessionConfig.sameSite: none',
          fix: 'Set security.sessionConfig.sameSite: "strict" for better security',
          documentation: this.getDocumentationUrl('session_hijacking' as any)
        });
      }
    }

    // Check for confused deputy risks in OAuth config
    if (config.oauth?.clientIdType === 'static' && config.oauth.redirectUris) {
      vulnerabilities.push({
        type: 'confused_deputy' as any,
        severity: SecuritySeverity.WARNING,
        title: 'Static Client ID with Multiple Redirect URIs',
        description: 'Using static client ID with multiple redirect URIs may create confused deputy vulnerability.',
        file: 'mcp.yaml/smithery.yaml',
        evidence: `clientIdType: static, redirectUris: [${config.oauth.redirectUris.join(', ')}]`,  
        fix: 'Implement proper user consent validation for each redirect URI.',
        documentation: this.getDocumentationUrl('confused_deputy' as any)
      });
    }

    return vulnerabilities;
  }

  /**
   * Generate comprehensive security report
   */
  private generateSecurityReport(
    repoUrl: string,
    branch: string,
    vulnerabilities: SecurityVulnerability[],
    repoAnalysis: RepositoryAnalysis
  ): SecurityReport {
    // Calculate summary statistics
    const summary = {
      totalVulnerabilities: vulnerabilities.length,
      blockers: vulnerabilities.filter(v => v.severity === SecuritySeverity.BLOCK).length,
      errors: vulnerabilities.filter(v => v.severity === SecuritySeverity.ERROR).length,
      warnings: vulnerabilities.filter(v => v.severity === SecuritySeverity.WARNING).length,
      info: vulnerabilities.filter(v => v.severity === SecuritySeverity.INFO).length
    };

    // Determine security score
    let securityScore: 'safe' | 'warning' | 'blocked' = 'safe';
    if (summary.blockers > 0) {
      securityScore = 'blocked';
    } else if (summary.errors > 0 || summary.warnings > 3) {
      securityScore = 'warning';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(vulnerabilities, repoAnalysis);

    return {
      repoUrl,
      branch,
      scannedAt: new Date(),
      vulnerabilities,
      securityScore,
      summary,
      recommendations
    };
  }

  /**
   * Generate security recommendations based on findings
   */
  private generateRecommendations(
    vulnerabilities: SecurityVulnerability[],
    repoAnalysis: RepositoryAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Token passthrough issues
    const tokenIssues = vulnerabilities.filter(v => v.type === 'token_passthrough');
    if (tokenIssues.length > 0) {
      recommendations.push('🚨 Critical: Remove token passthrough anti-patterns. Validate all tokens before use.');
    }

    // Session hijacking issues
    const sessionIssues = vulnerabilities.filter(v => v.type === 'session_hijacking');
    if (sessionIssues.length > 0) {
      recommendations.push('🔐 Important: Implement secure session management. Use crypto.randomUUID() for session IDs.');
    }

    // Confused deputy issues
    const deputyIssues = vulnerabilities.filter(v => v.type === 'confused_deputy');
    if (deputyIssues.length > 0) {
      recommendations.push('⚠️ OAuth: Validate redirect URIs and implement proper user consent for each client.');
    }

    // Configuration recommendations
    if (!repoAnalysis.hasMcpYaml && !repoAnalysis.hasSmitheryYaml) {
      recommendations.push('📋 Add mcp.yaml or smithery.yaml configuration file with security settings.');
    }

    // HTTPS recommendations
    const httpIssues = vulnerabilities.filter(v => v.evidence.includes('http://'));
    if (httpIssues.length > 0) {
      recommendations.push('🔒 Use HTTPS for all production connections. Avoid HTTP in configuration.');
    }

    // General security recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ No critical security issues found. Consider adding explicit security configuration.');
    }

    return recommendations;
  }

  /**
   * Build repository analysis from files
   */
  private buildRepositoryAnalysis(files: FileAnalysis[]): RepositoryAnalysis {
    const hasPackageJson = files.some(f => f.path.endsWith('package.json'));
    const hasDockerfile = files.some(f => f.path.toLowerCase().includes('dockerfile'));
    const hasMcpYaml = files.some(f => f.path.endsWith('mcp.yaml'));
    const hasSmitheryYaml = files.some(f => f.path.endsWith('smithery.yaml'));

    // Parse dependencies from package.json
    let dependencies: string[] = [];
    let devDependencies: string[] = [];
    const packageJsonFile = files.find(f => f.path.endsWith('package.json'));
    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        dependencies = Object.keys(pkg.dependencies || {});
        devDependencies = Object.keys(pkg.devDependencies || {});
      } catch (error) {
        console.warn('Could not parse package.json:', error);
      }
    }

    // Parse MCP configuration
    let mcpConfig: MCPConfig | undefined;
    const mcpConfigFile = files.find(f => f.path.endsWith('mcp.yaml') || f.path.endsWith('smithery.yaml'));
    if (mcpConfigFile) {
      try {
        const configData = yaml.load(mcpConfigFile.content);
        mcpConfig = MCPConfigSchema.parse(configData);
      } catch (error) {
        console.warn('Could not parse MCP configuration:', error);
      }
    }

    return {
      hasPackageJson,
      hasDockerfile,
      hasMcpYaml,
      hasSmitheryYaml,
      files,
      dependencies,
      devDependencies,
      mcpConfig
    };
  }

  /**
   * Detect file language from extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust'
    };
    return langMap[ext] || 'text';
  }

  /**
   * Get documentation URL for vulnerability type
   */
  private getDocumentationUrl(type: string): string {
    const baseUrl = 'https://docs.sigil.com/security';
    const urlMap: Record<string, string> = {
      'token_passthrough': `${baseUrl}/token-passthrough`,
      'confused_deputy': `${baseUrl}/confused-deputy`,  
      'session_hijacking': `${baseUrl}/session-hijacking`,
      'missing_validation': `${baseUrl}/validation`,
      'insecure_config': `${baseUrl}/configuration`
    };
    return urlMap[type] || `${baseUrl}/best-practices`;
  }

  /**
   * Log critical security findings
   */
  private logCriticalFindings(report: SecurityReport): void {
    console.log('\n🔒 SECURITY SCAN RESULTS');
    console.log('========================');
    console.log(`Repository: ${report.repoUrl}:${report.branch}`);
    console.log(`Security Score: ${report.securityScore.toUpperCase()}`);
    console.log(`Total Issues: ${report.summary.totalVulnerabilities}`);
    
    if (report.summary.blockers > 0) {
      console.log(`🚨 BLOCKERS: ${report.summary.blockers} (DEPLOYMENT BLOCKED)`);
    }
    if (report.summary.errors > 0) {
      console.log(`❌ ERRORS: ${report.summary.errors}`);
    }
    if (report.summary.warnings > 0) {
      console.log(`⚠️  WARNINGS: ${report.summary.warnings}`);
    }

    // Show blocking issues
    const blockingIssues = report.vulnerabilities.filter(v => v.severity === SecuritySeverity.BLOCK);
    if (blockingIssues.length > 0) {
      console.log('\n🚨 BLOCKING ISSUES:');
      blockingIssues.forEach(issue => {
        console.log(`  - ${issue.title} (${issue.file}:${issue.line})`);
        console.log(`    ${issue.description}`);
      });
    }

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  ${rec}`);
      });
    }

    console.log('========================\n');
  }

  /**
   * Check if deployment should be blocked
   */
  isDeploymentBlocked(report: SecurityReport): boolean {
    return report.securityScore === 'blocked';
  }

  /**
   * Get human-readable security summary
   */
  getSecuritySummary(report: SecurityReport): string {
    if (report.securityScore === 'blocked') {
      return `🚨 DEPLOYMENT BLOCKED: ${report.summary.blockers} critical security issues found`;
    } else if (report.securityScore === 'warning') {
      return `⚠️ SECURITY WARNINGS: ${report.summary.errors + report.summary.warnings} issues need attention`;
    } else {
      return `✅ SECURITY PASSED: No critical issues found`;
    }
  }
} 