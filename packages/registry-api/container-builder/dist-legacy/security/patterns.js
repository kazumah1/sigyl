"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY_PATTERNS = void 0;
exports.getPatternsByType = getPatternsByType;
exports.getPatternsBySeverity = getPatternsBySeverity;
exports.getBlockingPatterns = getBlockingPatterns;
const security_1 = require("../types/security");
/**
 * Security patterns based on MCP Security Best Practices
 * These patterns detect the three critical vulnerabilities:
 * 1. Confused Deputy Problem
 * 2. Token Passthrough Anti-Pattern
 * 3. Session Hijacking
 */
exports.SECURITY_PATTERNS = [
    // ========================================
    // TOKEN PASSTHROUGH ANTI-PATTERN (CRITICAL)
    // ========================================
    {
        name: 'Token Passthrough - Direct Pass',
        type: security_1.SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
        severity: security_1.SecuritySeverity.BLOCK,
        regex: /(?:request\.headers\[['"]authorization['"]\]|req\.headers\[['"]authorization['"]\]|headers\[['"]authorization['"]\])[\s\S]*?(?:fetch|axios|request)[\s\S]*?headers:\s*{\s*['"]?authorization['"]?:\s*(?:request\.headers\[['"]authorization['"]\]|req\.headers\[['"]authorization['"]\]|headers\[['"]authorization['"]\])/gi,
        description: 'MCP server is passing through authorization tokens without validation. This violates MCP security best practices and bypasses security controls.',
        fix: 'Validate that tokens were issued specifically for your MCP server. Never pass through unvalidated tokens. Implement proper token audience validation.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Token Passthrough - Proxy Pattern',
        type: security_1.SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
        severity: security_1.SecuritySeverity.BLOCK,
        regex: /(?:proxy|forward|passthrough)[\s\S]*?(?:token|authorization|bearer)[\s\S]*?(?:without|skip|bypass)[\s\S]*?(?:validation|verify|check)/gi,
        description: 'Code comments or variable names suggest token passthrough without validation.',
        fix: 'Implement proper token validation. Ensure tokens are issued for your MCP server before forwarding requests.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Token Passthrough - Direct Forward',
        type: security_1.SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /req\.headers\s*=\s*originalReq\.headers|request\.headers\s*=\s*clientHeaders|headers:\s*req\.headers/gi,
        description: 'Entire header object is being forwarded, likely including authorization tokens without validation.',
        fix: 'Only forward specific validated headers. Never forward authorization headers without proper validation.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    // ========================================
    // CONFUSED DEPUTY PROBLEM
    // ========================================
    {
        name: 'Confused Deputy - Static Client ID Risk',
        type: security_1.SecurityVulnerabilityType.CONFUSED_DEPUTY,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /(?:client_id|clientId):\s*['"][^'"]*['"](?:[\s\S]*?)(?:register|registration)[\s\S]*?(?:dynamic|runtime)/gi,
        description: 'Using static client ID with dynamic client registration may create confused deputy vulnerability.',
        fix: 'Implement proper user consent for each dynamically registered client. Do not rely on consent cookies alone.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
    },
    {
        name: 'Confused Deputy - Missing Consent Validation',
        type: security_1.SecurityVulnerabilityType.CONFUSED_DEPUTY,
        severity: security_1.SecuritySeverity.WARNING,
        regex: /(?:consent|authorization)[\s\S]*?(?:skip|bypass|cookie)(?:[\s\S]*?)(?:redirect|callback)/gi,
        description: 'Potential consent bypass using cookies, which can lead to confused deputy attacks.',
        fix: 'Always obtain explicit user consent for each client, even with existing consent cookies.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Confused Deputy - Unsafe Redirect',
        type: security_1.SecurityVulnerabilityType.CONFUSED_DEPUTY,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /redirect_uri[^=]*=\s*(?:req\.query\.|request\.query\.|params\.)\w*(?![\s\S]*validate)/gi,
        description: 'Using user-provided redirect URI without validation can enable confused deputy attacks.',
        fix: 'Validate all redirect URIs against a whitelist of allowed domains before using them.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    // ========================================
    // SESSION HIJACKING
    // ========================================
    {
        name: 'Session Hijacking - Insecure Session ID',
        type: security_1.SecurityVulnerabilityType.SESSION_HIJACKING,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /(?:sessionId|session_id)\s*=\s*(?:Math\.random|Date\.now|increment|counter|\d+)/gi,
        description: 'Using predictable or weak session ID generation that can be guessed by attackers.',
        fix: 'Use cryptographically secure random session IDs. Use crypto.randomUUID() or similar secure methods.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Session Hijacking - Session for Auth',
        type: security_1.SecurityVulnerabilityType.SESSION_HIJACKING,
        severity: security_1.SecuritySeverity.BLOCK,
        regex: /(?:authenticate|auth|login)[\s\S]*?(?:session|sessionId)(?:[\s\S]*?)(?:return|respond|send)/gi,
        description: 'Using sessions for authentication violates MCP security guidelines. Sessions must not be used for authentication.',
        fix: 'Remove session-based authentication. Use proper token-based authentication instead.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Session Hijacking - Missing User Binding',
        type: security_1.SecurityVulnerabilityType.SESSION_HIJACKING,
        severity: security_1.SecuritySeverity.WARNING,
        regex: /(?:session|queue)[\s\S]*?(?:sessionId|session_id)(?![\s\S]*(?:userId|user_id|bind|combined))/gi,
        description: 'Session IDs are not bound to user-specific information, making session hijacking easier.',
        fix: 'Bind session IDs to user-specific information. Use format like <user_id>:<session_id>.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Session Hijacking - Insecure Cookie Config',
        type: security_1.SecurityVulnerabilityType.SESSION_HIJACKING,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /(?:cookie|session)[\s\S]*?(?:secure:\s*false|httpOnly:\s*false|sameSite:\s*['"]?none['"]?)/gi,
        description: 'Insecure cookie configuration makes session hijacking easier.',
        fix: 'Set secure: true, httpOnly: true, and sameSite: "strict" for all session cookies.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    // ========================================
    // MISSING VALIDATION PATTERNS
    // ========================================
    {
        name: 'Missing Token Validation',
        type: security_1.SecurityVulnerabilityType.MISSING_VALIDATION,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /(?:bearer|authorization|token)[\s\S]*?(?:req|request)[\s\S]*?(?:headers|header)(?![\s\S]*(?:verify|validate|check|audience))/gi,
        description: 'Authorization tokens are used without proper validation.',
        fix: 'Implement token validation including audience, expiration, and signature verification.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Missing Input Validation',
        type: security_1.SecurityVulnerabilityType.MISSING_VALIDATION,
        severity: security_1.SecuritySeverity.WARNING,
        regex: /(?:req\.query|req\.params|req\.body)[\s\S]*?(?:sql|database|db)(?![\s\S]*(?:sanitize|validate|escape))/gi,
        description: 'User input is used in database queries without validation or sanitization.',
        fix: 'Validate and sanitize all user input before using in database queries. Use parameterized queries.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    // ========================================
    // INSECURE CONFIGURATION
    // ========================================
    {
        name: 'Insecure Transport - HTTP Only',
        type: security_1.SecurityVulnerabilityType.INSECURE_CONFIG,
        severity: security_1.SecuritySeverity.ERROR,
        regex: /(?:http:\/\/|protocol:\s*['"]http['"]|secure:\s*false)(?![\s\S]*localhost)/gi,
        description: 'MCP server configured to use HTTP instead of HTTPS in production.',
        fix: 'Always use HTTPS in production. Set secure: true for all cookies and connections.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
    },
    {
        name: 'Insecure CORS Configuration',
        type: security_1.SecurityVulnerabilityType.INSECURE_CONFIG,
        severity: security_1.SecuritySeverity.WARNING,
        regex: /(?:cors|origin)[\s\S]*?(?:\*|allowOrigin:\s*\*|origin:\s*\*)/gi,
        description: 'CORS is configured to allow all origins, which can be dangerous.',
        fix: 'Restrict CORS to specific allowed origins. Avoid using wildcard (*) for origin.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    },
    {
        name: 'Debug Mode in Production',
        type: security_1.SecurityVulnerabilityType.INSECURE_CONFIG,
        severity: security_1.SecuritySeverity.WARNING,
        regex: /(?:debug|DEBUG)[\s\S]*?(?:true|enabled|on)(?![\s\S]*(?:development|dev|test))/gi,
        description: 'Debug mode appears to be enabled, which can leak sensitive information.',
        fix: 'Disable debug mode in production. Use environment variables to control debug settings.',
        fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.env']
    }
];
/**
 * Get patterns by vulnerability type
 */
function getPatternsByType(type) {
    return exports.SECURITY_PATTERNS.filter(pattern => pattern.type === type);
}
/**
 * Get patterns by severity
 */
function getPatternsBySeverity(severity) {
    return exports.SECURITY_PATTERNS.filter(pattern => pattern.severity === severity);
}
/**
 * Get blocking patterns (patterns that should prevent deployment)
 */
function getBlockingPatterns() {
    return exports.SECURITY_PATTERNS.filter(pattern => pattern.severity === security_1.SecuritySeverity.BLOCK);
}
//# sourceMappingURL=patterns.js.map