import { SecurityPattern, SecurityVulnerabilityType, SecuritySeverity } from '../types/security';
/**
 * Security patterns based on MCP Security Best Practices
 * These patterns detect the three critical vulnerabilities:
 * 1. Confused Deputy Problem
 * 2. Token Passthrough Anti-Pattern
 * 3. Session Hijacking
 */
export declare const SECURITY_PATTERNS: SecurityPattern[];
/**
 * Get patterns by vulnerability type
 */
export declare function getPatternsByType(type: SecurityVulnerabilityType): SecurityPattern[];
/**
 * Get patterns by severity
 */
export declare function getPatternsBySeverity(severity: SecuritySeverity): SecurityPattern[];
/**
 * Get blocking patterns (patterns that should prevent deployment)
 */
export declare function getBlockingPatterns(): SecurityPattern[];
//# sourceMappingURL=patterns.d.ts.map