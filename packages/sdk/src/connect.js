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
exports.Client = exports.HttpTransport = void 0;
exports.connect = connect;
exports.connectClient = connectClient;
exports.connectDirect = connectDirect;
const axios_1 = __importDefault(require("axios"));
const registry_1 = require("./registry");
class HttpTransport {
    constructor(baseUrl, timeout = 10000, apiKey) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
        this.apiKey = apiKey;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            // For HTTP, no persistent connection is needed
            return;
        });
    }
    invokeTool(toolName, input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use JSON-RPC 2.0 to call the tool at /mcp with method 'tools/call'
            const url = `${this.baseUrl.replace(/\/$/, '')}/mcp`;
            const payload = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: input
                }
            };
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            const response = yield axios_1.default.post(url, payload, {
                timeout: this.timeout,
                headers
            });
            let data = response.data;
            if (typeof data === 'string' && data.startsWith('event: message')) {
                // Extract the JSON from the data: ... line
                const match = data.match(/data: (\{.*\})/);
                if (match) {
                    data = JSON.parse(match[1]);
                }
            }
            if (data && typeof data === 'object' && 'result' in data) {
                return data.result;
            }
            return data;
        });
    }
    invokeRaw(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${this.baseUrl.replace(/\/$/, '')}/mcp`;
            const payload = {
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params
            };
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            const response = yield axios_1.default.post(url, payload, {
                timeout: this.timeout,
                headers
            });
            let data = response.data;
            if (typeof data === 'string' && data.startsWith('event: message')) {
                const match = data.match(/data: (\{.*\})/);
                if (match) {
                    data = JSON.parse(match[1]);
                }
            }
            if (data && typeof data === 'object' && 'result' in data) {
                return data.result;
            }
            return data;
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            // For HTTP, nothing to close
            return;
        });
    }
}
exports.HttpTransport = HttpTransport;
class Client {
    constructor() {
        this.transport = null;
        this.connected = false;
    }
    connect(transport) {
        return __awaiter(this, void 0, void 0, function* () {
            yield transport.connect();
            this.transport = transport;
            this.connected = true;
        });
    }
    invoke(method, input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.transport || !this.connected) {
                throw new Error('Client is not connected to a transport');
            }
            // If method is tools/list or other management method, use invokeRaw
            if (typeof this.transport.invokeRaw === 'function' && (method === 'tools/list' || method.startsWith('tools/'))) {
                return this.transport.invokeRaw(method, input);
            }
            // Otherwise, treat as a tool call
            return this.transport.invokeTool(method, input);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.transport) {
                yield this.transport.close();
                this.connected = false;
            }
        });
    }
}
exports.Client = Client;
/**
 * Connect to a specific tool in a package from the registry
 */
function connect(packageName_1, toolName_1) {
    return __awaiter(this, arguments, void 0, function* (packageName, toolName, options = {}) {
        const { registryUrl = 'http://localhost:3000/api/v1', timeout = 10000 } = options;
        // Get package details from registry
        const packageData = yield (0, registry_1.getPackage)(packageName, { registryUrl, timeout });
        console.log('[SDK] Loaded package data:', JSON.stringify(packageData, null, 2));
        // Try to get deployment URL from deployments array (legacy)
        let deploymentUrl = undefined;
        if (Array.isArray(packageData.deployments) && packageData.deployments.length > 0) {
            const activeDeployment = packageData.deployments.find(d => d.status === 'active');
            if (activeDeployment) {
                deploymentUrl = activeDeployment.deployment_url;
                console.log('[SDK] Using deployment_url from deployments array:', deploymentUrl);
            }
        }
        // Fallback: use source_api_url or deployment_url directly from package
        if (!deploymentUrl) {
            deploymentUrl = packageData.source_api_url || packageData.deployment_url;
            console.log('[SDK] Using deployment_url from package record:', deploymentUrl);
        }
        if (!deploymentUrl) {
            console.error('[SDK] No deployment URL found for package:', packageName);
            throw new Error(`No deployment URL found for package '${packageName}'`);
        }
        // Return a function that can be called with input to invoke the specific tool
        return (input) => __awaiter(this, void 0, void 0, function* () {
            const url = `${deploymentUrl.replace(/\/$/, '')}/mcp`;
            const payload = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: input
                }
            };
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            };
            if (options.apiKey) {
                headers['Authorization'] = `Bearer ${options.apiKey}`;
            }
            try {
                const response = yield axios_1.default.post(url, payload, {
                    timeout,
                    headers
                });
                let data = response.data;
                if (typeof data === 'string' && data.startsWith('event: message')) {
                    // Extract the JSON from the data: ... line
                    const match = data.match(/data: (\{.*\})/);
                    if (match) {
                        data = JSON.parse(match[1]);
                    }
                }
                if (data && typeof data === 'object' && 'result' in data) {
                    return data.result;
                }
                return data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    if (error.response) {
                        throw new Error(`Tool invocation failed: ${error.response.status} ${error.response.statusText}`);
                    }
                    else if (error.request) {
                        throw new Error(`Tool invocation failed: No response received from ${url}`);
                    }
                }
                throw error;
            }
        });
    });
}
/**
 * Smithery-style connect: returns a connected Client instance for a package
 */
function connectClient(packageName_1) {
    return __awaiter(this, arguments, void 0, function* (packageName, options = {}) {
        const { registryUrl = 'http://localhost:3000/api/v1', timeout = 10000 } = options;
        // Get package details from registry
        const packageData = yield (0, registry_1.getPackage)(packageName, { registryUrl, timeout });
        console.log('[SDK] Loaded package data:', JSON.stringify(packageData, null, 2));
        // Try to get deployment URL from deployments array (legacy)
        let deploymentUrl = undefined;
        if (Array.isArray(packageData.deployments) && packageData.deployments.length > 0) {
            const activeDeployment = packageData.deployments.find(d => d.status === 'active');
            if (activeDeployment) {
                deploymentUrl = activeDeployment.deployment_url;
                console.log('[SDK] Using deployment_url from deployments array:', deploymentUrl);
            }
        }
        // Fallback: use source_api_url or deployment_url directly from package
        if (!deploymentUrl) {
            deploymentUrl = packageData.source_api_url || packageData.deployment_url;
            console.log('[SDK] Using deployment_url from package record:', deploymentUrl);
        }
        if (!deploymentUrl) {
            console.error('[SDK] No deployment URL found for package:', packageName);
            throw new Error(`No deployment URL found for package '${packageName}'`);
        }
        // Create transport and client
        console.log('[SDK] Connecting to MCP server at:', deploymentUrl);
        // Use the provided API key for now
        const apiKey = 'sk_575b23dd6b6ad801ace640614f181b4428b5263215cd7df0e038537ad7a07144';
        const transport = new HttpTransport(deploymentUrl, timeout, apiKey);
        const client = new Client();
        yield client.connect(transport);
        return client;
    });
}
/**
 * Connect directly to a tool by URL (stateless, for backward compatibility)
 */
function connectDirect(toolUrl_1) {
    return __awaiter(this, arguments, void 0, function* (toolUrl, options = {}) {
        const { timeout = 10000 } = options;
        // Validate URL
        try {
            new URL(toolUrl);
        }
        catch (_a) {
            throw new Error(`Invalid tool URL: ${toolUrl}`);
        }
        // Return a function that can be called with input
        return (input) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(toolUrl, input, {
                    timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    if (error.response) {
                        throw new Error(`Tool invocation failed: ${error.response.status} ${error.response.statusText}`);
                    }
                    else if (error.request) {
                        throw new Error(`Tool invocation failed: No response received`);
                    }
                }
                throw error;
            }
        });
    });
}
