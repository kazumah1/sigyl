import { SecurityPattern, SecurityVulnerabilityType, SecuritySeverity } from '../types/security';

/**
 * Security patterns based on MCP Security Best Practices
 * Enhanced with discoveries from mcp-scan project by Invariant Labs
 * These patterns detect the critical vulnerabilities:
 * 1. Confused Deputy Problem
 * 2. Token Passthrough Anti-Pattern  
 * 3. Session Hijacking
 * 4. Prompt Injection & Tool Poisoning (NEW - from mcp-scan)
 */

export const SECURITY_PATTERNS: SecurityPattern[] = [
  // ========================================
  // PROMPT INJECTION & TOOL POISONING (NEW - from mcp-scan)
  // ========================================
  {
    name: 'Tool Poisoning - IMPORTANT Pseudo-Tag',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH, // Using existing enum
    severity: SecuritySeverity.BLOCK,
    regex: /<IMPORTANT>[\s\S]*?<\/IMPORTANT>|<important>[\s\S]*?<\/important>/gi,
    description: 'Tool description contains IMPORTANT pseudo-tags that attempt to override instructions. This is a known tool poisoning attack vector.',
    fix: 'Remove all IMPORTANT tags from tool descriptions. Tool descriptions should only describe functionality, not give instructions to the AI.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Prompt Injection - Ignore Instructions',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.BLOCK,
    regex: /(?:ignore|disregard|forget)[\s\S]*?(?:previous|prior|earlier|above)[\s\S]*?(?:instructions?|prompts?|commands?|rules?)/gi,
    description: 'Tool description contains prompt injection attempting to override previous instructions.',
    fix: 'Remove instruction override attempts from tool descriptions. Descriptions should only explain tool functionality.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Prompt Injection - Role Hijacking',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.ERROR,
    regex: /(?:you are now|act as|pretend to be|role[\s\S]*?(?:system|admin|developer|assistant))/gi,
    description: 'Tool description attempts to hijack the AI assistant role or change system behavior.',
    fix: 'Remove role manipulation attempts. Tool descriptions should not try to change the AI\'s role or behavior.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Tool Poisoning - Hidden Instructions',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.ERROR,
    regex: /(?:additionally|also|furthermore|moreover|note that|please|make sure to)[\s\S]*?(?:always|never|must|should)[\s\S]*?(?:do|execute|run|call|invoke)/gi,
    description: 'Tool description contains hidden instructions that could manipulate AI behavior.',
    fix: 'Remove instructional language from tool descriptions. Use objective, descriptive language only.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Prompt Injection - Base64 Encoding',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.WARNING,
    regex: /(?:base64|b64)[\s\S]*?[A-Za-z0-9+\/]{20,}={0,2}/gi,
    description: 'Tool description contains base64 encoded content that could hide malicious instructions.',
    fix: 'Remove base64 encoded content from tool descriptions. All instructions should be in plain text and visible.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Tool Poisoning - System Prompt Override',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.BLOCK,
    regex: /(?:system prompt|system message|initial prompt)[\s\S]*?(?:override|replace|change|modify|update)/gi,
    description: 'Tool description attempts to override or modify the system prompt.',
    fix: 'Remove system prompt manipulation attempts. Tool descriptions cannot and should not modify system behavior.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Prompt Injection - Multi-Language Attack',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.WARNING,
    regex: /(?:中文|日本語|한국어|русский|العربية)[\s\S]*?(?:ignore|override|system|admin)/gi,
    description: 'Tool description contains non-English text that could hide prompt injection attempts.',
    fix: 'Ensure all tool descriptions use clear, English language. Multi-language content should be clearly labeled and reviewed.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },

  // ========================================
  // TOKEN PASSTHROUGH ANTI-PATTERN (CRITICAL)
  // ========================================
  {
    name: 'Token Passthrough - Direct Pass',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.BLOCK,
    regex: /(?:request\.headers\[['"]authorization['"]\]|req\.headers\[['"]authorization['"]\]|headers\[['"]authorization['"]\])[\s\S]*?(?:fetch|axios|request)[\s\S]*?headers:\s*{\s*['"]?authorization['"]?:\s*(?:request\.headers\[['"]authorization['"]\]|req\.headers\[['"]authorization['"]\]|headers\[['"]authorization['"]\])/gi,
    description: 'MCP server is passing through authorization tokens without validation. This violates MCP security best practices and bypasses security controls.',
    fix: 'Validate that tokens were issued specifically for your MCP server. Never pass through unvalidated tokens. Implement proper token audience validation.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Token Passthrough - Proxy Pattern',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.BLOCK,
    regex: /(?:proxy|forward|passthrough)[\s\S]*?(?:token|authorization|bearer)[\s\S]*?(?:without|skip|bypass)[\s\S]*?(?:validation|verify|check)/gi,
    description: 'Code comments or variable names suggest token passthrough without validation.',
    fix: 'Implement proper token validation. Ensure tokens are issued for your MCP server before forwarding requests.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Token Passthrough - Direct Forward',
    type: SecurityVulnerabilityType.TOKEN_PASSTHROUGH,
    severity: SecuritySeverity.ERROR,
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
    type: SecurityVulnerabilityType.CONFUSED_DEPUTY,
    severity: SecuritySeverity.ERROR,
    regex: /(?:client_id|clientId):\s*['"][^'"]*['"](?:[\s\S]*?)(?:register|registration)[\s\S]*?(?:dynamic|runtime)/gi,
    description: 'Using static client ID with dynamic client registration may create confused deputy vulnerability.',
    fix: 'Implement proper user consent for each dynamically registered client. Do not rely on consent cookies alone.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Confused Deputy - Missing Consent Validation',
    type: SecurityVulnerabilityType.CONFUSED_DEPUTY,
    severity: SecuritySeverity.WARNING,
    regex: /(?:consent|authorization)[\s\S]*?(?:skip|bypass|cookie)(?:[\s\S]*?)(?:redirect|callback)/gi,
    description: 'Potential consent bypass using cookies, which can lead to confused deputy attacks.',
    fix: 'Always obtain explicit user consent for each client, even with existing consent cookies.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Confused Deputy - Unsafe Redirect',
    type: SecurityVulnerabilityType.CONFUSED_DEPUTY,
    severity: SecuritySeverity.ERROR,
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
    type: SecurityVulnerabilityType.SESSION_HIJACKING,
    severity: SecuritySeverity.ERROR,
    regex: /(?:sessionId|session_id)\s*=\s*(?:Math\.random|Date\.now|increment|counter|\d+)/gi,
    description: 'Using predictable or weak session ID generation that can be guessed by attackers.',
    fix: 'Use cryptographically secure random session IDs. Use crypto.randomUUID() or similar secure methods.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Session Hijacking - Session for Auth',
    type: SecurityVulnerabilityType.SESSION_HIJACKING,
    severity: SecuritySeverity.BLOCK,
    regex: /(?:authenticate|auth|login)[\s\S]*?(?:session|sessionId)(?:[\s\S]*?)(?:return|respond|send)/gi,
    description: 'Using sessions for authentication violates MCP security guidelines. Sessions must not be used for authentication.',
    fix: 'Remove session-based authentication. Use proper token-based authentication instead.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Session Hijacking - Missing User Binding',
    type: SecurityVulnerabilityType.SESSION_HIJACKING,
    severity: SecuritySeverity.WARNING,
    regex: /(?:session|queue)[\s\S]*?(?:sessionId|session_id)(?![\s\S]*(?:userId|user_id|bind|combined))/gi,
    description: 'Session IDs are not bound to user-specific information, making session hijacking easier.',
    fix: 'Bind session IDs to user-specific information. Use format like <user_id>:<session_id>.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Session Hijacking - Insecure Cookie Config',
    type: SecurityVulnerabilityType.SESSION_HIJACKING,
    severity: SecuritySeverity.ERROR,
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
    type: SecurityVulnerabilityType.MISSING_VALIDATION,
    severity: SecuritySeverity.ERROR,
    regex: /(?:bearer|authorization|token)[\s\S]*?(?:req|request)[\s\S]*?(?:headers|header)(?![\s\S]*(?:verify|validate|check|audience))/gi,
    description: 'Authorization tokens are used without proper validation.',
    fix: 'Implement token validation including audience, expiration, and signature verification.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Missing Input Validation',
    type: SecurityVulnerabilityType.MISSING_VALIDATION,
    severity: SecuritySeverity.WARNING,
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
    type: SecurityVulnerabilityType.INSECURE_CONFIG,
    severity: SecuritySeverity.ERROR,
    regex: /(?:http:\/\/|protocol:\s*['"]http['"]|secure:\s*false)(?![\s\S]*localhost)/gi,
    description: 'MCP server configured to use HTTP instead of HTTPS in production.',
    fix: 'Always use HTTPS in production. Set secure: true for all cookies and connections.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml']
  },
  {
    name: 'Insecure CORS Configuration',
    type: SecurityVulnerabilityType.INSECURE_CONFIG,
    severity: SecuritySeverity.WARNING,
    regex: /(?:cors|origin)[\s\S]*?(?:\*|allowOrigin:\s*\*|origin:\s*\*)/gi,
    description: 'CORS is configured to allow all origins, which can be dangerous.',
    fix: 'Restrict CORS to specific allowed origins. Avoid using wildcard (*) for origin.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx']
  },
  {
    name: 'Debug Mode in Production',
    type: SecurityVulnerabilityType.INSECURE_CONFIG,
    severity: SecuritySeverity.WARNING,
    regex: /(?:debug|DEBUG)[\s\S]*?(?:true|enabled|on)(?![\s\S]*(?:development|dev|test))/gi,
    description: 'Debug mode appears to be enabled, which can leak sensitive information.',
    fix: 'Disable debug mode in production. Use environment variables to control debug settings.',
    fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.json', '.env']
  }
];

/**
 * Get patterns by vulnerability type
 */
export function getPatternsByType(type: SecurityVulnerabilityType): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.type === type);
}

/**
 * Get patterns by severity
 */
export function getPatternsBySeverity(severity: SecuritySeverity): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.severity === severity);
}

/**
 * Get blocking patterns (patterns that should prevent deployment)
 */
export function getBlockingPatterns(): SecurityPattern[] {
  return SECURITY_PATTERNS.filter(pattern => pattern.severity === SecuritySeverity.BLOCK);
} 