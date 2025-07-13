"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPConfigSchema = exports.SecuritySeverity = exports.SecurityVulnerabilityType = void 0;
const zod_1 = require("zod");
/**
 * Security Vulnerability Types based on MCP Security Best Practices
 */
var SecurityVulnerabilityType;
(function (SecurityVulnerabilityType) {
    SecurityVulnerabilityType["CONFUSED_DEPUTY"] = "confused_deputy";
    SecurityVulnerabilityType["TOKEN_PASSTHROUGH"] = "token_passthrough";
    SecurityVulnerabilityType["SESSION_HIJACKING"] = "session_hijacking";
    SecurityVulnerabilityType["INSECURE_CONFIG"] = "insecure_config";
    SecurityVulnerabilityType["MISSING_VALIDATION"] = "missing_validation";
})(SecurityVulnerabilityType || (exports.SecurityVulnerabilityType = SecurityVulnerabilityType = {}));
var SecuritySeverity;
(function (SecuritySeverity) {
    SecuritySeverity["INFO"] = "info";
    SecuritySeverity["WARNING"] = "warning";
    SecuritySeverity["ERROR"] = "error";
    SecuritySeverity["BLOCK"] = "block";
})(SecuritySeverity || (exports.SecuritySeverity = SecuritySeverity = {}));
/**
 * MCP Configuration Types for Security Validation
 */
exports.MCPConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    version: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    runtime: zod_1.z.enum(['typescript', 'container']).optional(),
    transport: zod_1.z.enum(['http', 'stdio']).optional(),
    startCommand: zod_1.z.object({
        type: zod_1.z.string(),
        configSchema: zod_1.z.record(zod_1.z.any()).optional(),
        exampleConfig: zod_1.z.record(zod_1.z.any()).optional()
    }).optional(),
    build: zod_1.z.object({
        dockerfile: zod_1.z.string().optional(),
        dockerBuildPath: zod_1.z.string().optional()
    }).optional(),
    oauth: zod_1.z.object({
        clientId: zod_1.z.string().optional(),
        clientIdType: zod_1.z.enum(['static', 'dynamic']).optional(),
        redirectUris: zod_1.z.array(zod_1.z.string()).optional(),
        scopes: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    security: zod_1.z.object({
        requireTokenValidation: zod_1.z.boolean().optional(),
        allowTokenPassthrough: zod_1.z.boolean().optional(),
        sessionConfig: zod_1.z.object({
            secure: zod_1.z.boolean().optional(),
            httpOnly: zod_1.z.boolean().optional(),
            sameSite: zod_1.z.enum(['strict', 'lax', 'none']).optional()
        }).optional()
    }).optional()
});
//# sourceMappingURL=security.js.map