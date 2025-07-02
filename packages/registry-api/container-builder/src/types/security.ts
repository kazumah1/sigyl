import { z } from 'zod';
import { SigylConfig } from './config';

/**
 * Security Vulnerability Types based on MCP Security Best Practices
 */
export enum SecurityVulnerabilityType {
  CONFUSED_DEPUTY = 'confused_deputy',
  TOKEN_PASSTHROUGH = 'token_passthrough', 
  SESSION_HIJACKING = 'session_hijacking',
  INSECURE_CONFIG = 'insecure_config',
  MISSING_VALIDATION = 'missing_validation'
}

export enum SecuritySeverity {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  BLOCK = 'block'
}

export interface SecurityVulnerability {
  type: SecurityVulnerabilityType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  file: string;
  line?: number;
  column?: number;
  evidence: string;
  fix: string;
  documentation: string;
}

export interface SecurityReport {
  repoUrl: string;
  branch: string;
  scannedAt: Date;
  vulnerabilities: SecurityVulnerability[];
  securityScore: 'safe' | 'warning' | 'blocked';
  summary: {
    totalVulnerabilities: number;
    blockers: number;
    errors: number;
    warnings: number;
    info: number;
  };
  recommendations: string[];
}

/**
 * MCP Configuration Types for Security Validation
 */
export const MCPConfigSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  runtime: z.enum(['typescript', 'container']).optional(),
  transport: z.enum(['http', 'stdio']).optional(),
  startCommand: z.object({
    type: z.string(),
    configSchema: z.record(z.any()).optional(),
    exampleConfig: z.record(z.any()).optional()
  }).optional(),
  build: z.object({
    dockerfile: z.string().optional(),
    dockerBuildPath: z.string().optional()
  }).optional(),
  oauth: z.object({
    clientId: z.string().optional(),
    clientIdType: z.enum(['static', 'dynamic']).optional(),
    redirectUris: z.array(z.string()).optional(),
    scopes: z.array(z.string()).optional()
  }).optional(),
  security: z.object({
    requireTokenValidation: z.boolean().optional(),
    allowTokenPassthrough: z.boolean().optional(),
    sessionConfig: z.object({
      secure: z.boolean().optional(),
      httpOnly: z.boolean().optional(),
      sameSite: z.enum(['strict', 'lax', 'none']).optional()
    }).optional()
  }).optional()
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;

/**
 * Repository Analysis Types
 */
export interface FileAnalysis {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface RepositoryAnalysis {
  hasPackageJson: boolean;
  hasDockerfile: boolean;
  hasSigylYaml: boolean;
  files: FileAnalysis[];
  dependencies: string[];
  devDependencies: string[];
  sigylConfig?: SigylConfig;
  hasMcpYaml?: boolean;
}

/**
 * Security Pattern Detection
 */
export interface SecurityPattern {
  name: string;
  type: SecurityVulnerabilityType;
  severity: SecuritySeverity;
  regex: RegExp;
  description: string;
  fix: string;
  fileTypes: string[];
}

export interface PatternMatch {
  pattern: SecurityPattern;
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
} 