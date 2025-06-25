"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPConnectSDK = void 0;
const registry_1 = require("./registry");
const connect_1 = require("./connect");
/**
 * MCPConnectSDK - Advanced SDK class for working with MCP registry and tools
 */
class MCPConnectSDK {
    constructor(config = {}) {
        this.config = Object.assign({ registryUrl: 'http://localhost:3000/api/v1', timeout: 10000 }, config);
    }
    /**
     * Search for packages in the registry
     */
    searchPackages(query_1, tags_1) {
        return __awaiter(this, arguments, void 0, function* (query, tags, limit = 20, offset = 0) {
            return (0, registry_1.searchPackages)(query, tags, limit, offset, this.config);
        });
    }
    /**
     * Get detailed information about a specific package
     */
    getPackage(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, registry_1.getPackage)(name, this.config);
        });
    }
    /**
     * Register a new MCP package
     */
    registerMCP(packageData, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, registry_1.registerMCP)(packageData, apiKey, this.config);
        });
    }
    /**
     * Connect to a specific tool in a package
     */
    connect(packageName, toolName) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, connect_1.connect)(packageName, toolName, {
                registryUrl: this.config.registryUrl,
                timeout: this.config.timeout
            });
        });
    }
    /**
     * Connect directly to a tool by URL
     */
    connectDirect(toolUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, connect_1.connectDirect)(toolUrl, {
                timeout: this.config.timeout
            });
        });
    }
    /**
     * Connect to all tools in a package
     */
    connectAll(packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageData = yield this.getPackage(packageName);
            const tools = {};
            // Find active deployment
            const activeDeployment = packageData.deployments.find(d => d.status === 'active');
            if (!activeDeployment) {
                throw new Error(`No active deployment found for package '${packageName}'`);
            }
            // Create tool functions for each tool
            for (const tool of packageData.tools) {
                if (tool.tool_name) {
                    const toolUrl = `${activeDeployment.deployment_url}/${tool.tool_name}`;
                    tools[tool.tool_name] = yield this.connectDirect(toolUrl);
                }
            }
            return tools;
        });
    }
    /**
     * Manually invoke a tool by URL
     */
    invoke(toolUrl, input) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, registry_1.invoke)(toolUrl, input, this.config);
        });
    }
    /**
     * Get all packages (for admin/debugging)
     */
    getAllPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.searchPackages(undefined, undefined, 1000, 0);
            return response.packages;
        });
    }
    /**
     * Update SDK configuration
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
    }
    /**
     * Get current SDK configuration
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
}
exports.MCPConnectSDK = MCPConnectSDK;
