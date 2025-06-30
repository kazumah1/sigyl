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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPackages = searchPackages;
exports.getPackage = getPackage;
exports.registerMCP = registerMCP;
exports.getAllPackagesAdmin = getAllPackagesAdmin;
exports.invoke = invoke;
const axios_1 = __importDefault(require("axios"));
// Default configuration
const DEFAULT_REGISTRY_URL = 'http://localhost:3000/api/v1';
const DEFAULT_TIMEOUT = 10000;
// Create axios instance with default config
function createApiClient(config = {}) {
    const registryUrl = config.registryUrl || DEFAULT_REGISTRY_URL;
    const timeout = config.timeout || DEFAULT_TIMEOUT;
    const client = axios_1.default.create({
        baseURL: registryUrl,
        timeout,
        headers: Object.assign({ 'Content-Type': 'application/json' }, (config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }))
    });
    // Add response interceptor to handle API response format
    client.interceptors.response.use((response) => {
        // The registry API wraps responses in { success, data, message } format
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            if (response.data.success) {
                return response.data.data;
            }
            else {
                throw new Error(response.data.message || response.data.error || 'API request failed');
            }
        }
        return response.data;
    }, (error) => {
        var _a, _b;
        if ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    });
    return client;
}
// Helper function to validate authentication
function validateAuth(config, operation) {
    if (config.requireAuth && !config.apiKey) {
        throw new Error(`Authentication required for ${operation}. Please provide an API key.`);
    }
}
// Helper function to validate admin permissions
function validateAdminAuth(config, operation) {
    if (!config.apiKey) {
        throw new Error(`Admin API key required for ${operation}. Please provide an API key with admin permissions.`);
    }
}
/**
 * Search for MCP packages in the registry
 * Note: Search is typically public, but can be restricted if requireAuth is true
 */
function searchPackages(query_1, tags_1) {
    return __awaiter(this, arguments, void 0, function* (query, tags, limit = 20, offset = 0, config = {}) {
        // Validate auth if required
        validateAuth(config, 'searching packages');
        const client = createApiClient(config);
        // Build query parameters manually to ensure proper formatting
        const searchParams = new URLSearchParams();
        searchParams.append('limit', limit.toString());
        searchParams.append('offset', offset.toString());
        if (query)
            searchParams.append('q', query);
        if (tags && tags.length > 0)
            searchParams.append('tags', tags.join(','));
        // The interceptor returns the data directly
        return yield client.get(`/packages/search?${searchParams.toString()}`);
    });
}
/**
 * Get detailed information about a specific package
 * Note: Package details are typically public, but can be restricted if requireAuth is true
 */
function getPackage(name_1) {
    return __awaiter(this, arguments, void 0, function* (name, config = {}) {
        // Validate auth if required
        validateAuth(config, 'getting package details');
        const client = createApiClient(config);
        if (!name || name.trim().length === 0) {
            throw new Error('Package name is required');
        }
        // The interceptor returns the data directly
        return yield client.get(`/packages/${encodeURIComponent(name)}`);
    });
}
/**
 * Register a new MCP package in the registry
 * Note: Registration ALWAYS requires authentication
 */
function registerMCP(packageData_1, apiKey_1) {
    return __awaiter(this, arguments, void 0, function* (packageData, apiKey, config = {}) {
        // Registration always requires authentication
        if (!apiKey && !config.apiKey) {
            throw new Error('API key is required for registering MCP packages');
        }
        const client = createApiClient(Object.assign(Object.assign({}, config), { apiKey: apiKey || config.apiKey }));
        // The interceptor returns the data directly
        return yield client.post('/packages', packageData);
    });
}
/**
 * Get all packages (admin operation)
 * Note: This requires admin API key with admin permissions
 */
function getAllPackagesAdmin() {
    return __awaiter(this, arguments, void 0, function* (config = {}) {
        // Admin operations always require admin authentication
        validateAdminAuth(config, 'getting all packages');
        const client = createApiClient(config);
        // The interceptor returns the data directly
        return yield client.get('/packages/admin/all');
    });
}
/**
 * Manually invoke a tool by URL
 * Note: Tool invocation may require authentication depending on the tool
 */
function invoke(toolUrl_1, input_1) {
    return __awaiter(this, arguments, void 0, function* (toolUrl, input, config = {}) {
        const timeout = config.timeout || DEFAULT_TIMEOUT;
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add API key if provided
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        const response = yield axios_1.default.post(toolUrl, input, {
            timeout,
            headers
        });
        return response.data;
    });
}
