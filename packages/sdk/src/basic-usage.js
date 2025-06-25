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
const index_1 = require("./index");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔌 Sigyl MCP SDK - Basic Usage Examples\n');
        // Example 1: Search for packages in the registry
        try {
            console.log('1. Searching for packages in registry...');
            const results = yield (0, index_1.searchPackages)('text', ['nlp'], 5, 0, {
                registryUrl: 'http://localhost:3000/api/v1'
            });
            console.log(`✅ Found ${results.total} packages`);
            results.packages.forEach(pkg => {
                console.log(`   - ${pkg.name}: ${pkg.description || 'No description'}`);
            });
        }
        catch (error) {
            console.log('❌ Package search failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Example 2: Get package details
        try {
            console.log('\n2. Getting package details...');
            const packageData = yield (0, index_1.getPackage)('text-summarizer', {
                registryUrl: 'http://localhost:3000/api/v1'
            });
            console.log(`✅ Package: ${packageData.name}`);
            console.log(`   Description: ${packageData.description || 'No description'}`);
            console.log(`   Tools: ${packageData.tools.map(t => t.tool_name).join(', ')}`);
            console.log(`   Downloads: ${packageData.downloads_count}`);
        }
        catch (error) {
            console.log('❌ Package details failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Example 3: Connect to a tool from the registry
        try {
            console.log('\n3. Connecting to a tool from registry...');
            const summarize = yield (0, index_1.connect)('text-summarizer', 'summarize', {
                registryUrl: 'http://localhost:3000/api/v1'
            });
            const result = yield summarize({
                text: "The French Revolution was a period of radical social and political upheaval in France from 1789 to 1799. It led to the collapse of the Bourbon monarchy and the rise of radical political factions, culminating in the establishment of the French Consulate in 1799.",
                maxLength: 100
            });
            console.log('✅ Summary result:', result);
        }
        catch (error) {
            console.log('❌ Registry connection failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Example 4: Connect to a tool directly by URL
        try {
            console.log('\n4. Connecting to a tool directly...');
            const translate = yield (0, index_1.connectDirect)('https://my-translation-service.onrender.com/translate');
            const translation = yield translate({
                text: "Hello world",
                targetLanguage: "es"
            });
            console.log('✅ Translation result:', translation);
        }
        catch (error) {
            console.log('❌ Direct connection failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        // Example 5: Using the SDK class for more control
        try {
            console.log('\n5. Using SDK class for advanced usage...');
            const sdk = new index_1.MCPConnectSDK({
                registryUrl: 'http://localhost:3000/api/v1',
                timeout: 15000
            });
            // Search for packages
            const searchResult = yield sdk.searchPackages('text', ['nlp'], 5);
            console.log('🔍 Search results:', searchResult.packages.length, 'packages found');
            // Try to connect to all tools in the first package
            if (searchResult.packages.length > 0) {
                const firstPackage = searchResult.packages[0];
                console.log(`🛠️ Attempting to connect to all tools in ${firstPackage.name}...`);
                try {
                    const allTools = yield sdk.connectAll(firstPackage.name);
                    console.log('✅ Available tools:', Object.keys(allTools));
                    // Use a specific tool if available
                    if (allTools.summarize) {
                        const summary = yield allTools.summarize({ text: "Short text to summarize" });
                        console.log('✅ Summary from all tools:', summary);
                    }
                }
                catch (error) {
                    console.log(`❌ Failed to connect to tools in ${firstPackage.name}:`, error instanceof Error ? error.message : 'Unknown error');
                }
            }
        }
        catch (error) {
            console.log('❌ SDK class usage failed:', error instanceof Error ? error.message : 'Unknown error');
        }
        console.log('\n✨ Examples completed!');
    });
}
// Run the examples
main().catch(console.error);
