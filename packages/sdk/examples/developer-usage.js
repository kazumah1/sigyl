"use strict";
// Example: How a developer would integrate the Sigyl MCP SDK into their application
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
const index_1 = require("../src/index");
class MyApplication {
    constructor() {
        // Initialize the SDK with your registry URL
        this.sdk = new index_1.MCPConnectSDK({
            registryUrl: 'http://localhost:3000/api/v1', // or your production URL
            timeout: 15000
        });
    }
    discoverTextTools() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔍 Discovering text processing tools...');
            try {
                // Search for text processing tools
                const results = yield (0, index_1.searchPackages)('text', ['nlp'], 10);
                console.log(`Found ${results.total} text processing tools:`);
                results.packages.forEach(pkg => {
                    console.log(`- ${pkg.name}: ${pkg.description}`);
                });
                return results.packages;
            }
            catch (error) {
                console.error('Failed to discover tools:', error);
                return [];
            }
        });
    }
    useTextSummarizer(text_1) {
        return __awaiter(this, arguments, void 0, function* (text, maxLength = 100) {
            console.log('📝 Using text summarizer...');
            try {
                // Connect to the text summarizer tool
                const summarize = yield (0, index_1.connect)('text-summarizer', 'summarize', {
                    registryUrl: 'http://localhost:3000/api/v1'
                });
                // Use the tool
                const summary = yield summarize({
                    text,
                    maxLength
                });
                console.log('Summary:', summary);
                return summary;
            }
            catch (error) {
                console.error('Failed to summarize text:', error);
                return null;
            }
        });
    }
    processWithMultipleTools(text) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🛠️ Processing text with multiple tools...');
            try {
                // Get all available packages
                const allPackages = yield this.sdk.getAllPackages();
                const results = [];
                // Try to use tools from different packages
                for (const pkg of allPackages.slice(0, 3)) { // Limit to first 3 packages
                    try {
                        console.log(`Trying package: ${pkg.name}`);
                        // Get package details
                        const details = yield this.sdk.getPackage(pkg.name);
                        if (details.tools.length > 0) {
                            // Try to connect to the first tool
                            const toolName = details.tools[0].tool_name;
                            if (toolName) {
                                const tool = yield this.sdk.connect(pkg.name, toolName);
                                const result = yield tool({ text });
                                results.push({
                                    package: pkg.name,
                                    tool: toolName,
                                    result
                                });
                            }
                        }
                    }
                    catch (error) {
                        console.log(`Failed to use ${pkg.name}:`, error instanceof Error ? error.message : 'Unknown error');
                    }
                }
                return results;
            }
            catch (error) {
                console.error('Failed to process with multiple tools:', error);
                return [];
            }
        });
    }
    registerMyTool() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📦 Registering a new tool...');
            try {
                const newPackage = yield this.sdk.registerMCP({
                    name: 'my-custom-tool',
                    description: 'A custom tool for my application',
                    tags: ['custom', 'application'],
                    tools: [{
                            tool_name: 'process',
                            description: 'Process data for my application',
                            input_schema: { data: 'string' },
                            output_schema: { processed: 'string' }
                        }]
                });
                console.log('✅ Tool registered:', newPackage.name);
                return newPackage;
            }
            catch (error) {
                console.error('Failed to register tool:', error);
                return null;
            }
        });
    }
}
// Usage example
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = new MyApplication();
        // Discover available tools
        yield app.discoverTextTools();
        // Use a specific tool
        const longText = `
    Artificial Intelligence (AI) is transforming the way we live and work. 
    From virtual assistants to autonomous vehicles, AI is becoming increasingly 
    integrated into our daily lives. Machine learning algorithms can now process 
    vast amounts of data to make predictions and decisions that were previously 
    impossible for humans to make quickly or accurately.
  `;
        yield app.useTextSummarizer(longText, 50);
        // Process with multiple tools
        yield app.processWithMultipleTools("Hello world");
        // Register a new tool
        yield app.registerMyTool();
    });
}
// Run the example
main().catch(console.error);
