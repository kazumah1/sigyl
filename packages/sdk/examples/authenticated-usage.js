"use strict";
// Example: How to use the Sigyl MCP SDK with authentication
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
function authenticatedExample() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔐 Authenticated SDK Usage Example\n');
        // Option 1: Using individual functions with API key
        const apiKey = 'sk_your_api_key_here'; // Get this from your Sigyl dashboard
        console.log('1️⃣ Searching packages with API key...');
        try {
            const results = yield (0, index_1.searchPackages)('text', ['nlp'], 5, 0, {
                registryUrl: 'http://localhost:3000/api/v1',
                apiKey,
                requireAuth: true // This will require authentication for all operations
            });
            console.log(`✅ Found ${results.total} packages (authenticated)`);
        }
        catch (error) {
            console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Option 2: Using SDK class with authentication
        console.log('\n2️⃣ Using SDK class with authentication...');
        try {
            const sdk = new index_1.MCPConnectSDK({
                registryUrl: 'http://localhost:3000/api/v1',
                apiKey,
                requireAuth: true,
                timeout: 15000
            });
            const allPackages = yield sdk.getAllPackages();
            console.log(`✅ SDK found ${allPackages.length} packages (authenticated)`);
        }
        catch (error) {
            console.log('❌ SDK failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Option 3: Registering a package (always requires authentication)
        console.log('\n3️⃣ Registering a new package (requires auth)...');
        try {
            const newPackage = yield (0, index_1.registerMCP)({
                name: 'my-authenticated-tool',
                description: 'A tool that requires authentication',
                tags: ['auth', 'demo'],
                tools: [{
                        tool_name: 'secure-process',
                        description: 'A secure processing tool',
                        input_schema: { data: 'string' },
                        output_schema: { result: 'string' }
                    }]
            }, apiKey, {
                registryUrl: 'http://localhost:3000/api/v1'
            });
            console.log('✅ Package registered:', newPackage.name);
        }
        catch (error) {
            console.log('❌ Registration failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Option 4: Connecting to authenticated tools
        console.log('\n4️⃣ Connecting to authenticated tools...');
        try {
            const secureTool = yield (0, index_1.connect)('my-authenticated-tool', 'secure-process', {
                registryUrl: 'http://localhost:3000/api/v1',
                apiKey,
                timeout: 10000
            });
            const result = yield secureTool({ data: "Secure data" });
            console.log('✅ Secure tool result:', result);
        }
        catch (error) {
            console.log('❌ Tool connection failed:', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}
// Example of different authentication scenarios
function authenticationScenarios() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n🔑 Authentication Scenarios\n');
        // Scenario 1: Public access (no auth required)
        console.log('📖 Scenario 1: Public access');
        try {
            const publicResults = yield (0, index_1.searchPackages)('text', undefined, 3, 0, {
                registryUrl: 'http://localhost:3000/api/v1',
                requireAuth: false // Explicitly allow public access
            });
            console.log(`✅ Public search found ${publicResults.total} packages`);
        }
        catch (error) {
            console.log('❌ Public search failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Scenario 2: Authenticated access
        console.log('\n🔐 Scenario 2: Authenticated access');
        try {
            const authResults = yield (0, index_1.searchPackages)('text', undefined, 3, 0, {
                registryUrl: 'http://localhost:3000/api/v1',
                apiKey: 'sk_your_api_key_here',
                requireAuth: true
            });
            console.log(`✅ Authenticated search found ${authResults.total} packages`);
        }
        catch (error) {
            console.log('❌ Authenticated search failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Scenario 3: Missing API key when required
        console.log('\n❌ Scenario 3: Missing API key when required');
        try {
            yield (0, index_1.searchPackages)('text', undefined, 3, 0, {
                registryUrl: 'http://localhost:3000/api/v1',
                requireAuth: true // Requires auth but no API key provided
            });
        }
        catch (error) {
            console.log('✅ Correctly caught missing API key:', error instanceof Error ? error.message : 'Unknown error');
        }
    });
}
// Run the examples
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield authenticatedExample();
        yield authenticationScenarios();
    });
}
main().catch(console.error);
