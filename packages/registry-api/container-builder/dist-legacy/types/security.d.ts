import { z } from 'zod';
/**
 * Security Vulnerability Types based on MCP Security Best Practices
 */
export declare enum SecurityVulnerabilityType {
    CONFUSED_DEPUTY = "confused_deputy",
    TOKEN_PASSTHROUGH = "token_passthrough",
    SESSION_HIJACKING = "session_hijacking",
    INSECURE_CONFIG = "insecure_config",
    MISSING_VALIDATION = "missing_validation"
}
export declare enum SecuritySeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    BLOCK = "block"
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
export declare const MCPConfigSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    runtime: z.ZodOptional<z.ZodEnum<["typescript", "container"]>>;
    transport: z.ZodOptional<z.ZodEnum<["http", "stdio"]>>;
    startCommand: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
        configSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        exampleConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        configSchema?: Record<string, any> | undefined;
        exampleConfig?: Record<string, any> | undefined;
    }, {
        type: string;
        configSchema?: Record<string, any> | undefined;
        exampleConfig?: Record<string, any> | undefined;
    }>>;
    build: z.ZodOptional<z.ZodObject<{
        dockerfile: z.ZodOptional<z.ZodString>;
        dockerBuildPath: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dockerfile?: string | undefined;
        dockerBuildPath?: string | undefined;
    }, {
        dockerfile?: string | undefined;
        dockerBuildPath?: string | undefined;
    }>>;
    oauth: z.ZodOptional<z.ZodObject<{
        clientId: z.ZodOptional<z.ZodString>;
        clientIdType: z.ZodOptional<z.ZodEnum<["static", "dynamic"]>>;
        redirectUris: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        clientId?: string | undefined;
        clientIdType?: "static" | "dynamic" | undefined;
        redirectUris?: string[] | undefined;
        scopes?: string[] | undefined;
    }, {
        clientId?: string | undefined;
        clientIdType?: "static" | "dynamic" | undefined;
        redirectUris?: string[] | undefined;
        scopes?: string[] | undefined;
    }>>;
    security: z.ZodOptional<z.ZodObject<{
        requireTokenValidation: z.ZodOptional<z.ZodBoolean>;
        allowTokenPassthrough: z.ZodOptional<z.ZodBoolean>;
        sessionConfig: z.ZodOptional<z.ZodObject<{
            secure: z.ZodOptional<z.ZodBoolean>;
            httpOnly: z.ZodOptional<z.ZodBoolean>;
            sameSite: z.ZodOptional<z.ZodEnum<["strict", "lax", "none"]>>;
        }, "strip", z.ZodTypeAny, {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        }, {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        requireTokenValidation?: boolean | undefined;
        allowTokenPassthrough?: boolean | undefined;
        sessionConfig?: {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        } | undefined;
    }, {
        requireTokenValidation?: boolean | undefined;
        allowTokenPassthrough?: boolean | undefined;
        sessionConfig?: {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version?: string | undefined;
    description?: string | undefined;
    runtime?: "typescript" | "container" | undefined;
    transport?: "http" | "stdio" | undefined;
    startCommand?: {
        type: string;
        configSchema?: Record<string, any> | undefined;
        exampleConfig?: Record<string, any> | undefined;
    } | undefined;
    build?: {
        dockerfile?: string | undefined;
        dockerBuildPath?: string | undefined;
    } | undefined;
    oauth?: {
        clientId?: string | undefined;
        clientIdType?: "static" | "dynamic" | undefined;
        redirectUris?: string[] | undefined;
        scopes?: string[] | undefined;
    } | undefined;
    security?: {
        requireTokenValidation?: boolean | undefined;
        allowTokenPassthrough?: boolean | undefined;
        sessionConfig?: {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        } | undefined;
    } | undefined;
}, {
    name: string;
    version?: string | undefined;
    description?: string | undefined;
    runtime?: "typescript" | "container" | undefined;
    transport?: "http" | "stdio" | undefined;
    startCommand?: {
        type: string;
        configSchema?: Record<string, any> | undefined;
        exampleConfig?: Record<string, any> | undefined;
    } | undefined;
    build?: {
        dockerfile?: string | undefined;
        dockerBuildPath?: string | undefined;
    } | undefined;
    oauth?: {
        clientId?: string | undefined;
        clientIdType?: "static" | "dynamic" | undefined;
        redirectUris?: string[] | undefined;
        scopes?: string[] | undefined;
    } | undefined;
    security?: {
        requireTokenValidation?: boolean | undefined;
        allowTokenPassthrough?: boolean | undefined;
        sessionConfig?: {
            secure?: boolean | undefined;
            httpOnly?: boolean | undefined;
            sameSite?: "strict" | "lax" | "none" | undefined;
        } | undefined;
    } | undefined;
}>;
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
    hasMcpYaml: boolean;
    hasSmitheryYaml: boolean;
    files: FileAnalysis[];
    dependencies: string[];
    devDependencies: string[];
    mcpConfig?: MCPConfig;
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
//# sourceMappingURL=security.d.ts.map