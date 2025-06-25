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
exports.connect = connect;
exports.connectDirect = connectDirect;
const axios_1 = __importDefault(require("axios"));
const registry_1 = require("./registry");
/**
 * Connect to a tool from the registry by package name and tool name
 */
function connect(packageName_1, toolName_1) {
    return __awaiter(this, arguments, void 0, function* (packageName, toolName, options = {}) {
        const { registryUrl = 'http://localhost:3000/api/v1', timeout = 10000 } = options;
        try {
            // Get package details from registry
            const packageData = yield (0, registry_1.getPackage)(packageName, { registryUrl, timeout });
            // Find the specific tool
            const tool = packageData.tools.find(t => t.tool_name === toolName);
            if (!tool) {
                throw new Error(`Tool '${toolName}' not found in package '${packageName}'`);
            }
            // Find an active deployment
            const activeDeployment = packageData.deployments.find(d => d.status === 'active');
            if (!activeDeployment) {
                throw new Error(`No active deployment found for package '${packageName}'`);
            }
            // Construct the tool URL
            const toolUrl = `${activeDeployment.deployment_url}/${toolName}`;
            // Return a function that can be called with input
            return (input) => __awaiter(this, void 0, void 0, function* () {
                const response = yield axios_1.default.post(toolUrl, input, {
                    timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            });
        }
        catch (error) {
            throw new Error(`Failed to connect to tool '${toolName}' in package '${packageName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
}
/**
 * Connect directly to a tool by URL
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
