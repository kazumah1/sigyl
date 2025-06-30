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
     * Connect to a specific tool in a package
     */
    connect(packageName, toolName) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, connect_1.connect)(packageName, toolName, {
                registryUrl: this.config.registryUrl,
                timeout: this.config.timeout,
                apiKey: this.config.apiKey
            });
        });
    }
    /**
     * Smithery-style connect: returns a connected Client instance for a package
     */
    connectClient(packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, connect_1.connectClient)(packageName, {
                registryUrl: this.config.registryUrl,
                timeout: this.config.timeout,
                apiKey: this.config.apiKey
            });
        });
    }
    /**
     * Connect to all tools in a package and return an object with tool functions
     */
    connectAll(packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageData = yield this.getPackage(packageName);
            const tools = {};
            for (const tool of packageData.tools) {
                if (tool.tool_name) {
                    tools[tool.tool_name] = yield this.connect(packageName, tool.tool_name);
                }
            }
            return tools;
        });
    }
    /**
     * Connect directly to a tool by URL (stateless, for backward compatibility)
     */
    connectDirect(toolUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, connect_1.connectDirect)(toolUrl, {
                timeout: this.config.timeout
            });
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
     * Register a new MCP package in the registry
     */
    registerMCP(packageData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.apiKey) {
                throw new Error('API key is required for registering MCP packages');
            }
            return (0, registry_1.registerMCP)(packageData, this.config.apiKey, this.config);
        });
    }
    /**
     * Search all packages (public operation - limited results)
     * This uses the public search endpoint with a high limit
     */
    searchAllPackages() {
        return __awaiter(this, arguments, void 0, function* (limit = 100) {
            const response = yield this.searchPackages(undefined, undefined, limit, 0);
            return response.packages;
        });
    }
    /**
     * Get all packages (admin operation - requires admin API key)
     * This calls the admin endpoint that requires admin permissions
     */
    getAllPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, registry_1.getAllPackagesAdmin)(this.config);
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
