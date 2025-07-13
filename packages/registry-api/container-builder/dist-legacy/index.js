"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSigylConfig = exports.generateMCPDockerfile = exports.CloudRunService = exports.MCPSecurityValidator = void 0;
exports.buildMCPDockerfile = buildMCPDockerfile;
// Security validation
var validator_1 = require("./security/validator");
Object.defineProperty(exports, "MCPSecurityValidator", { enumerable: true, get: function () { return validator_1.MCPSecurityValidator; } });
// Google Cloud Run deployment service (replaces Railway and AWS)
var cloudRunService_1 = require("./gcp/cloudRunService");
Object.defineProperty(exports, "CloudRunService", { enumerable: true, get: function () { return cloudRunService_1.CloudRunService; } });
Object.defineProperty(exports, "generateMCPDockerfile", { enumerable: true, get: function () { return cloudRunService_1.generateMCPDockerfile; } });
Object.defineProperty(exports, "generateSigylConfig", { enumerable: true, get: function () { return cloudRunService_1.generateSigylConfig; } });
__exportStar(require("./types/security"), exports);
// Legacy function - replaced with security-first approach
async function buildMCPDockerfile(sourceDir, outDir) {
    console.warn('⚠️ buildMCPDockerfile is deprecated. Use CloudRunService with Sigyl schema instead.');
    console.warn('📋 Migrate to sigyl.yaml with runtime: "node" or runtime: "container"');
    // TODO: Implement secure MCP container building with new schema
}
//# sourceMappingURL=index.js.map